// Dumps a normalized schema snapshot (sorted tables, each as SHOW CREATE
// TABLE with volatile bits stripped) for whatever MYSQL_DATABASE_URL points
// to, so two databases' schemas can be diffed meaningfully.
import mysql from 'mysql2/promise'

const uri = process.env.MYSQL_DATABASE_URL
if (!uri) {
  console.error('MYSQL_DATABASE_URL is not set in this shell.')
  process.exit(1)
}

function normalize(ddl) {
  return ddl
    // row-count-dependent, not structural
    .replace(/AUTO_INCREMENT=\d+/g, 'AUTO_INCREMENT=N')
    // engine/charset default bumps across MySQL versions, not interesting here
    .replace(/\s+$/gm, '')
}

const conn = await mysql.createConnection({ uri, ssl: { rejectUnauthorized: false } })

const [tables] = await conn.query('SHOW TABLES')
const tableKey = Object.keys(tables[0] ?? {})[0]
const names = tables.map((r) => r[tableKey]).sort((a, b) => a.localeCompare(b))

for (const name of names) {
  const [[row]] = await conn.query(`SHOW CREATE TABLE \`${name}\``)
  const ddl = row['Create Table']
  console.log(`-- TABLE: ${name}`)
  console.log(normalize(ddl))
  console.log('')
}

await conn.end()
