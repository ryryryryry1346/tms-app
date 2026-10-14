/**
 * Recovery helper: adds the optional case-metadata columns to `tests`.
 *
 * Use if `drizzle-kit migrate` skips the migration (journal desync — same class
 * of issue seen with 0002/0003) but the columns are missing in the DB.
 *
 * Idempotent: skips columns that already exist.
 *
 * Usage (from web/): node -r dotenv/config scripts/add-case-fields-columns.mjs
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'

const url = process.env.MYSQL_DATABASE_URL

if (!url) {
  console.error('MYSQL_DATABASE_URL is not set. Create web/.env first.')
  process.exit(1)
}

const connection = await mysql.createConnection({
  uri: url,
  multipleStatements: true,
})

async function addColumn(column, ddl) {
  try {
    await connection.query(ddl)
    console.log('ok: added', column)
  } catch (error) {
    if (error.errno === 1060 || error.code === 'ER_DUP_FIELDNAME') {
      console.log('skip (already exists):', column)
      return
    }
    throw error
  }
}

await addColumn(
  'preconditions',
  'ALTER TABLE `tests` ADD `preconditions` longtext',
)
await addColumn('tags', 'ALTER TABLE `tests` ADD `tags` longtext')
await addColumn('refs', 'ALTER TABLE `tests` ADD `refs` longtext')

const [rows] = await connection.query(
  "SHOW COLUMNS FROM `tests` WHERE Field IN ('preconditions','tags','refs')",
)
console.log(
  'verified columns present:',
  rows.map((row) => row.Field).join(', ') || '(none!)',
)

await connection.end()
console.log('done.')
