import {
  index,
  int,
  mysqlTable,
  text,
  varchar,
} from 'drizzle-orm/mysql-core'

export const projects = mysqlTable('projects', {
  id: int('id').autoincrement().primaryKey(),
  name: text('name').notNull(),
})

export const users = mysqlTable('users', {
  id: int('id').autoincrement().primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
})

export const sections = mysqlTable(
  'sections',
  {
    id: int('id').autoincrement().primaryKey(),
    name: text('name').notNull(),
    projectId: int('project_id'),
  },
  (table) => ({
    projectIdIndex: index('sections_project_id_idx').on(table.projectId),
  }),
)

export const tests = mysqlTable(
  'tests',
  {
    id: int('id').autoincrement().primaryKey(),
    title: text('title').notNull(),
    steps: text('steps'),
    expected: text('expected'),
    status: varchar('status', { length: 64 }),
    sectionId: int('section_id'),
    projectId: int('project_id'),
  },
  (table) => ({
    sectionIdIndex: index('tests_section_id_idx').on(table.sectionId),
    projectIdIndex: index('tests_project_id_idx').on(table.projectId),
  }),
)

export const testRuns = mysqlTable(
  'test_runs',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id'),
    name: text('name').notNull(),
  },
  (table) => ({
    projectIdIndex: index('test_runs_project_id_idx').on(table.projectId),
  }),
)

export const testRunItems = mysqlTable(
  'test_run_items',
  {
    id: int('id').autoincrement().primaryKey(),
    runId: int('run_id'),
    testId: int('test_id'),
    status: varchar('status', { length: 64 }),
  },
  (table) => ({
    runIdIndex: index('test_run_items_run_id_idx').on(table.runId),
    testIdIndex: index('test_run_items_test_id_idx').on(table.testId),
  }),
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
