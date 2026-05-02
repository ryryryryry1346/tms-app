import {
  index,
  int,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'

export const projects = mysqlTable('projects', {
  id: int('id').autoincrement().primaryKey(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 255 }),
  status: varchar('status', { length: 64 }),
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
    priority: varchar('priority', { length: 64 }),
    caseType: varchar('case_type', { length: 64 }),
    archivedFromStatus: varchar('archived_from_status', { length: 64 }),
    sectionId: int('section_id'),
    projectId: int('project_id'),
    sortOrder: int('sort_order'),
    createdAt: varchar('created_at', { length: 32 }),
    updatedAt: varchar('updated_at', { length: 32 }),
  },
  (table) => ({
    sectionIdIndex: index('tests_section_id_idx').on(table.sectionId),
    projectIdIndex: index('tests_project_id_idx').on(table.projectId),
  }),
)

export const testCaseActivity = mysqlTable(
  'test_case_activity',
  {
    id: int('id').autoincrement().primaryKey(),
    testId: int('test_id').notNull(),
    projectId: int('project_id'),
    actorId: int('actor_id'),
    actorName: varchar('actor_name', { length: 255 }),
    action: varchar('action', { length: 64 }).notNull(),
    summary: text('summary').notNull(),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
  },
  (table) => ({
    testIdIndex: index('test_case_activity_test_id_idx').on(table.testId),
    projectIdIndex: index('test_case_activity_project_id_idx').on(table.projectId),
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
    testTitle: text('test_title'),
    status: varchar('status', { length: 64 }),
    comment: text('comment'),
  },
  (table) => ({
    runIdIndex: index('test_run_items_run_id_idx').on(table.runId),
    testIdIndex: index('test_run_items_test_id_idx').on(table.testId),
    runTestUnique: uniqueIndex('test_run_items_run_test_unique').on(
      table.runId,
      table.testId,
    ),
  }),
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
