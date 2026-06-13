/**
 * One-off DESTRUCTIVE helper: drops every table in the configured database
 * so a clean initial drizzle migration can recreate the schema from scratch.
 *
 * Only run this against a database whose data you are willing to lose.
 * Usage (from web/): node -r dotenv/config scripts/reset-db.mjs
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'

const url = process.env.MYSQL_DATABASE_URL

if (!url) {
  console.error('MYSQL_DATABASE_URL is not set. Create web/.env first.')
  process.exit(1)
}

const connection = await mysql.createConnection(url)

const [rows] = await connection.query(
  'SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE()',
)

if (rows.length === 0) {
  console.log('No tables found. Database is already empty.')
  await connection.end()
  process.exit(0)
}

await connection.query('SET FOREIGN_KEY_CHECKS = 0')

for (const { t } of rows) {
  await connection.query(`DROP TABLE IF EXISTS \`${t}\``)
  console.log('dropped', t)
}

await connection.query('SET FOREIGN_KEY_CHECKS = 1')

console.log(`\nDone. Dropped ${rows.length} table(s). Now run: npm run db:migrate`)
await connection.end()
