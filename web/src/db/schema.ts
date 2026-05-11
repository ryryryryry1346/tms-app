import {
  index,
  int,
  boolean,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'

export const projects = mysqlTable(
  'projects',
  {
    id: int('id').autoincrement().primaryKey(),
    name: text('name').notNull(),
    slug: varchar('slug', { length: 255 }),
    status: varchar('status', { length: 64 }),
  },
  (table) => ({
    slugIndex: index('projects_slug_idx').on(table.slug),
  }),
)

export const user = mysqlTable(
  'user',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    emailUnique: uniqueIndex('user_email_unique').on(table.email),
  }),
)

export const session = mysqlTable(
  'session',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: varchar('user_id', { length: 255 }).notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex('session_token_unique').on(table.token),
    userIdIndex: index('session_user_id_idx').on(table.userId),
  }),
)

export const account = mysqlTable(
  'account',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    userIdIndex: index('account_user_id_idx').on(table.userId),
  }),
)

export const verification = mysqlTable(
  'verification',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => ({
    identifierIndex: index('verification_identifier_idx').on(table.identifier),
  }),
)

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
      repositoryOrderIndex: index('tests_repository_order_idx').on(
        table.projectId,
        table.sectionId,
        table.sortOrder,
        table.id,
      ),
      repositoryStatusIndex: index('tests_repository_status_idx').on(
        table.projectId,
        table.status,
      ),
      repositoryFilterIndex: index('tests_repository_filter_idx').on(
        table.projectId,
        table.status,
        table.priority,
        table.caseType,
        table.sectionId,
        table.id,
      ),
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

export const projectDocs = mysqlTable(
  'project_docs',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id').notNull(),
    title: text('title').notNull(),
    category: varchar('category', { length: 128 }),
    content: text('content'),
    status: varchar('status', { length: 64 }).notNull().default('Published'),
    createdAt: varchar('created_at', { length: 32 }),
    updatedAt: varchar('updated_at', { length: 32 }),
  },
  (table) => ({
    projectIdIndex: index('project_docs_project_id_idx').on(table.projectId),
    statusIndex: index('project_docs_status_idx').on(table.status),
  }),
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type AuthUser = typeof user.$inferSelect
