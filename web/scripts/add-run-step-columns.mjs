/**
 * Recovery helper: adds the per-step execution columns to test_run_items.
 *
 * Needed because migration 0003_far_lady_deathstrike is recorded as applied in
 * __drizzle_migrations, but its DDL never ran (journal desync — same class of
 * issue as 0002). `drizzle-kit migrate` therefore skips it. Running the ALTERs
 * by hand reconciles the DB with what drizzle already believes is applied, so
 * there is no future migration conflict.
 *
 * Idempotent: skips columns that already exist.
 *
 * Usage (from web/): node -r dotenv/config scripts/add-run-step-columns.mjs
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
    // 1060 = ER_DUP_FIELDNAME (column already exists)
    if (error.errno === 1060 || error.code === 'ER_DUP_FIELDNAME') {
      console.log('skip (already exists):', column)
      return
    }
    throw error
  }
}

await addColumn(
  'steps_snapshot',
  'ALTER TABLE `test_run_items` ADD `steps_snapshot` longtext',
)
await addColumn(
  'step_results',
  'ALTER TABLE `test_run_items` ADD `step_results` longtext',
)

const [rows] = await connection.query(
  "SHOW COLUMNS FROM `test_run_items` WHERE Field IN ('steps_snapshot','step_results')",
)
console.log(
  'verified columns present:',
  rows.map((row) => row.Field).join(', ') || '(none!)',
)

await connection.end()
console.log('done.')
