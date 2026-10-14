// One-time copy of the whole database from MYSQL_DATABASE_URL into a NEW
// database on the same MySQL server (same user), e.g. to give tms-app its own
// database instead of sharing `defaultdb` with another app.
//
// Usage (from web/):
//   node scripts/copy-database.mjs <target_db> --dry-run   # only show the plan
//   node scripts/copy-database.mjs <target_db>             # copy
//
// What it does:
// - creates <target_db> (same charset/collation as the source) if missing;
// - refuses to continue if <target_db> already contains tables;
// - recreates every table with its exact definition (indexes, foreign keys)
//   and copies all rows, including the __drizzle_migrations journal;
// - compares row counts at the end.
// The source database is only read, never modified.

import 'dotenv/config'
import mysql from 'mysql2/promise'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const target = args.find((arg) => !arg.startsWith('--'))

if (!target || !/^[A-Za-z0-9_]{1,64}$/.test(target)) {
  console.error('Usage: node scripts/copy-database.mjs <target_db> [--dry-run]')
  console.error('Target name: letters, digits and _ only, e.g. tms_app')
  process.exit(1)
}

const rawUrl = process.env.MYSQL_DATABASE_URL

if (!rawUrl) {
  console.error('MYSQL_DATABASE_URL is not set (check web/.env).')
  process.exit(1)
}

const url = new URL(rawUrl)
const source = url.pathname.replace(/^\//, '')

if (!source) {
  console.error('MYSQL_DATABASE_URL has no database name.')
  process.exit(1)
}

if (source === target) {
  console.error(`Target "${target}" is the same as the source database.`)
  process.exit(1)
}

const conn = await mysql.createConnection({
  host: url.hostname,
  port: url.port ? Number(url.port) : 3306,
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: source,
  ssl: { rejectUnauthorized: false },
  multipleStatements: false,
})

const q = (name) => `\`${name.replace(/`/g, '``')}\``

async function countRows(db, table) {
  const [rows] = await conn.query(`SELECT COUNT(*) AS n FROM ${q(db)}.${q(table)}`)
  return Number(rows[0].n)
}

try {
  const [tables] = await conn.query(
    `SELECT TABLE_NAME AS name, TABLE_TYPE AS type
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME`,
    [source],
  )
  const baseTables = tables.filter((table) => table.type === 'BASE TABLE')
  const views = tables.filter((table) => table.type !== 'BASE TABLE')

  console.log(`Source: ${source} @ ${url.hostname}`)
  console.log(`Target: ${target}\n`)

  if (views.length > 0) {
    console.log(`Note: ${views.length} view(s) will NOT be copied: ${views.map((v) => v.name).join(', ')}\n`)
  }

  const plan = []
  for (const table of baseTables) {
    plan.push({ name: table.name, rows: await countRows(source, table.name) })
  }

  for (const item of plan) {
    console.log(`  ${item.name.padEnd(40)} ${String(item.rows).padStart(8)} rows`)
  }

  const [targetSchema] = await conn.query(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?',
    [target],
  )

  if (targetSchema.length > 0) {
    const [existing] = await conn.query(
      'SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
      [target],
    )

    if (Number(existing[0].n) > 0) {
      console.error(`\nStop: database "${target}" already exists and has ${existing[0].n} table(s). Nothing was changed.`)
      process.exit(1)
    }
  }

  if (dryRun) {
    console.log(`\nDry run: ${plan.length} table(s) would be copied into "${target}". Nothing was changed.`)
    process.exit(0)
  }

  const [[charset]] = await conn.query(
    `SELECT DEFAULT_CHARACTER_SET_NAME AS cs, DEFAULT_COLLATION_NAME AS co
       FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`,
    [source],
  )

  if (targetSchema.length === 0) {
    await conn.query(
      `CREATE DATABASE ${q(target)} CHARACTER SET ${charset.cs} COLLATE ${charset.co}`,
    )
    console.log(`\nCreated database "${target}" (${charset.cs} / ${charset.co}).`)
  }

  // Tables are created inside the target so their foreign keys point at the
  // target's tables; checks are off so the creation/copy order doesn't matter.
  await conn.query(`USE ${q(target)}`)
  await conn.query('SET FOREIGN_KEY_CHECKS = 0')

  for (const item of plan) {
    const [[definition]] = await conn.query(`SHOW CREATE TABLE ${q(source)}.${q(item.name)}`)
    await conn.query(definition['Create Table'])

    const [columns] = await conn.query(
      `SELECT COLUMN_NAME AS name
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          AND (EXTRA IS NULL OR EXTRA NOT LIKE '%GENERATED%')
        ORDER BY ORDINAL_POSITION`,
      [source, item.name],
    )
    const columnList = columns.map((column) => q(column.name)).join(', ')

    await conn.query(
      `INSERT INTO ${q(target)}.${q(item.name)} (${columnList})
       SELECT ${columnList} FROM ${q(source)}.${q(item.name)}`,
    )
    console.log(`  copied ${item.name}`)
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 1')

  let mismatches = 0
  for (const item of plan) {
    const copied = await countRows(target, item.name)
    if (copied !== item.rows) {
      mismatches += 1
      console.error(`  MISMATCH ${item.name}: source ${item.rows}, target ${copied}`)
    }
  }

  if (mismatches > 0) {
    console.error(`\nDone with ${mismatches} mismatch(es) — do not switch to "${target}" yet; send this output for review.`)
    process.exit(1)
  }

  const newUrl = new URL(rawUrl)
  newUrl.pathname = `/${target}`
  newUrl.password = newUrl.password ? '****' : ''

  console.log(`\nDone: ${plan.length} table(s) copied, all row counts match.`)
  console.log(`Next: point MYSQL_DATABASE_URL to the new database, e.g.\n  ${newUrl.toString()}`)
  console.log(`(the same URL with /${source} replaced by /${target}; keep your real password)`)
} finally {
  await conn.end()
}
