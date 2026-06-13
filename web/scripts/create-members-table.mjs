/**
 * Recovery helper: creates the project_members table directly.
 *
 * Needed because migration 0002_glamorous_harrier is already recorded as
 * applied in __drizzle_migrations, but its DDL never ran (journal desync), so
 * `drizzle-kit migrate` skips it. Running the table's SQL by hand reconciles
 * the DB with what drizzle already believes is applied — no future conflict.
 *
 * Usage (from web/): node -r dotenv/config scripts/create-members-table.mjs
 */
import 'dotenv/config'
import mysql from 'mysql2/promise'

const url = process.env.MYSQL_DATABASE_URL

if (!url) {
  console.error('MYSQL_DATABASE_URL is not set. Create web/.env first.')
  process.exit(1)
}

const connection = await mysql.createConnection({ uri: url, multipleStatements: true })

async function run(label, sql) {
  try {
    await connection.query(sql)
    console.log('ok:', label)
  } catch (error) {
    if (
      error.code === 'ER_TABLE_EXISTS_ERROR' ||
      error.code === 'ER_DUP_KEYNAME' ||
      error.code === 'ER_FK_DUP_NAME' ||
      error.errno === 1826 ||
      error.errno === 1061
    ) {
      console.log('skip (already exists):', label)
      return
    }
    throw error
  }
}

await run(
  'create table project_members',
  `CREATE TABLE IF NOT EXISTS \`project_members\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`project_id\` int NOT NULL,
    \`user_id\` varchar(255) NOT NULL,
    \`role\` varchar(32) NOT NULL DEFAULT 'editor',
    \`created_at\` varchar(32) NOT NULL,
    CONSTRAINT \`project_members_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`project_members_project_user_unique\` UNIQUE(\`project_id\`,\`user_id\`)
  )`,
)

await run(
  'add fk -> projects',
  "ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action",
)

await run(
  'add fk -> user',
  "ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action",
)

await run(
  'create index user_id',
  'CREATE INDEX `project_members_user_id_idx` ON `project_members` (`user_id`)',
)

const [rows] = await connection.query("SHOW TABLES LIKE 'project_members'")
console.log('\nproject_members exists:', rows.length > 0)
await connection.end()
