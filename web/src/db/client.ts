import mysql, { type Pool } from 'mysql2/promise'
import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import * as schema from './schema'

let database: MySql2Database<typeof schema> | null = null
let pool: Pool | null = null

function getDatabaseUrl(): string {
  const url = process.env.MYSQL_DATABASE_URL

  if (!url) {
    throw new Error(
      'MYSQL_DATABASE_URL is not configured. Set it before using the migrated web application.',
    )
  }

  return url
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.MYSQL_DATABASE_URL)
}

export function getDb(): MySql2Database<typeof schema> {
  if (database) {
    return database
  }

  pool = mysql.createPool(getDatabaseUrl())
  database = drizzle({ client: pool, schema })

  return database
}

export async function closeDb(): Promise<void> {
  if (!pool) {
    return
  }

  await pool.end()
  pool = null
  database = null
}
