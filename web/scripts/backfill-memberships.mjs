/**
 * One-off helper: makes the given user an OWNER of every existing project.
 * Run this once after the project_members migration so you don't lock yourself
 * out (project listing is filtered by membership).
 *
 * Usage (from web/):
 *   node -r dotenv/config scripts/backfill-memberships.mjs you@example.com
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'

const email = process.argv[2] || process.env.BACKFILL_ADMIN_EMAIL

if (!email) {
  console.error(
    'Usage: node -r dotenv/config scripts/backfill-memberships.mjs you@example.com',
  )
  process.exit(1)
}

const url = process.env.MYSQL_DATABASE_URL

if (!url) {
  console.error('MYSQL_DATABASE_URL is not set. Create web/.env first.')
  process.exit(1)
}

const connection = await mysql.createConnection(url)

const [users] = await connection.query(
  'SELECT id FROM user WHERE email = ? LIMIT 1',
  [email],
)

if (users.length === 0) {
  console.error(`No registered user with email ${email}. Sign up first.`)
  await connection.end()
  process.exit(1)
}

const userId = users[0].id
const [projectRows] = await connection.query('SELECT id FROM projects')
const now = new Date().toISOString()
let added = 0

for (const project of projectRows) {
  const [existing] = await connection.query(
    'SELECT id FROM project_members WHERE project_id = ? AND user_id = ? LIMIT 1',
    [project.id, userId],
  )

  if (existing.length > 0) {
    continue
  }

  await connection.query(
    'INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
    [project.id, userId, 'owner', now],
  )
  added += 1
  console.log('owner of project', project.id)
}

console.log(`\nDone. Added ${added} owner membership(s) for ${email}.`)
await connection.end()
