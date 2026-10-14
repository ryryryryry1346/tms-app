// One-time baseline for an existing database that was built with
// `drizzle-kit push` (so it already matches the current schema) and now needs
// to adopt versioned migrations.
//
// It records every migration in drizzle/meta/_journal.json as ALREADY APPLIED
// in the `__drizzle_migrations` tracking table WITHOUT executing their SQL.
// After running this, `npm run db:migrate` will report nothing to apply, and
// future generated migrations (0005+) will apply cleanly.
//
// Safe by design: it only creates the tracking table and inserts rows. It
// never runs migration SQL, so it cannot alter or drop your data. If the DB
// URL or SSL is wrong it simply fails to connect and changes nothing.
//
// Usage (from web/):  node scripts/baseline-drizzle.mjs
// Requires MYSQL_DATABASE_URL in web/.env (same var drizzle-kit push uses).

import 'dotenv/config'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const here = dirname(fileURLToPath(import.meta.url))
const drizzleDir = join(here, '..', 'drizzle')
const journal = JSON.parse(
  readFileSync(join(drizzleDir, 'meta', '_journal.json'), 'utf8'),
)

const rawUrl = process.env.MYSQL_DATABASE_URL
if (!rawUrl) {
  console.error('MYSQL_DATABASE_URL is not set (check web/.env).')
  process.exit(1)
}

const u = new URL(rawUrl)
const conn = await mysql.createConnection({
  host: u.hostname,
  port: u.port ? Number(u.port) : 3306,
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.replace(/^\//, ''),
  ssl: { rejectUnauthorized: false },
})

await conn.query(
  'CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (`id` SERIAL PRIMARY KEY, `hash` text NOT NULL, `created_at` bigint)',
)

let inserted = 0
for (const entry of journal.entries) {
  const sql = readFileSync(join(drizzleDir, `${entry.tag}.sql`), 'utf8')
  const hash = createHash('sha256').update(sql).digest('hex')

  const [rows] = await conn.query(
    'SELECT id FROM `__drizzle_migrations` WHERE created_at = ? LIMIT 1',
    [entry.when],
  )

  if (Array.isArray(rows) && rows.length > 0) {
    console.log(`= already recorded: ${entry.tag}`)
    continue
  }

  await conn.query(
    'INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)',
    [hash, entry.when],
  )
  inserted += 1
  console.log(`+ baselined: ${entry.tag}`)
}

await conn.end()
console.log(
  `\nDone. Baselined ${inserted} migration(s). ` +
    'Now `npm run db:migrate` should report nothing to apply.',
)
