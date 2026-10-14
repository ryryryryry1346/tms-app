import {
  foreignKey,
  index,
  int,
  boolean,
  longtext,
  mediumtext,
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
    projectId: int('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
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
    preconditions: longtext('preconditions'),
    tags: longtext('tags'),
    refs: longtext('refs'),
    status: varchar('status', { length: 64 }),
    priority: varchar('priority', { length: 64 }),
    caseType: varchar('case_type', { length: 64 }),
    archivedFromStatus: varchar('archived_from_status', { length: 64 }),
    sectionId: int('section_id').references(() => sections.id, {
      onDelete: 'set null',
    }),
    projectId: int('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
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
      repositoryFilterOrderIndex: index(
        'tests_repository_filter_order_idx',
      ).on(
        table.projectId,
        table.status,
        table.priority,
        table.caseType,
        table.sectionId,
        table.sortOrder,
        table.id,
      ),
    }),
  )

export const testCaseActivity = mysqlTable(
  'test_case_activity',
  {
    id: int('id').autoincrement().primaryKey(),
    testId: int('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'cascade' }),
    projectId: int('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
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
    projectId: int('project_id').references(() => projects.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('In progress'),
    releaseName: varchar('release_name', { length: 255 }),
    jiraVersionId: varchar('jira_version_id', { length: 64 }),
  },
  (table) => ({
    projectIdIndex: index('test_runs_project_id_idx').on(table.projectId),
  }),
)

export const testRunItems = mysqlTable(
  'test_run_items',
  {
    id: int('id').autoincrement().primaryKey(),
    runId: int('run_id').references(() => testRuns.id, { onDelete: 'cascade' }),
    testId: int('test_id').references(() => tests.id, { onDelete: 'set null' }),
    testTitle: text('test_title'),
    status: varchar('status', { length: 64 }),
    comment: text('comment'),
    stepsSnapshot: longtext('steps_snapshot'),
    stepResults: longtext('step_results'),
    executedById: varchar('executed_by_id', { length: 255 }),
    executedByName: varchar('executed_by_name', { length: 255 }),
    executedAt: varchar('executed_at', { length: 32 }),
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

export const runItemAttachments = mysqlTable(
  'run_item_attachments',
  {
    id: int('id').autoincrement().primaryKey(),
    runId: int('run_id')
      .notNull()
      .references(() => testRuns.id, { onDelete: 'cascade' }),
    testId: int('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    url: text('url').notNull(),
    contentType: varchar('content_type', { length: 128 }),
    sizeBytes: int('size_bytes'),
    uploadedByName: varchar('uploaded_by_name', { length: 255 }),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
  },
  (table) => ({
    runTestIndex: index('run_item_attachments_run_test_idx').on(
      table.runId,
      table.testId,
    ),
  }),
)

export const projectDocs = mysqlTable(
  'project_docs',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: varchar('category', { length: 128 }),
    content: text('content'),
    status: varchar('status', { length: 64 }).notNull().default('Published'),
    /** Set when the article is pinned to the top of the project's Docs. */
    pinnedAt: varchar('pinned_at', { length: 32 }),
    createdBy: varchar('created_by', { length: 255 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    updatedBy: varchar('updated_by', { length: 255 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: varchar('created_at', { length: 32 }),
    updatedAt: varchar('updated_at', { length: 32 }),
  },
  (table) => ({
    projectIdIndex: index('project_docs_project_id_idx').on(table.projectId),
    statusIndex: index('project_docs_status_idx').on(table.status),
  }),
)

/**
 * Per-project Docs categories. Docs reference a category by name (the legacy
 * project_docs.category column), so renaming here must update the docs too
 * (see features/docs/server.ts). "General" is the system fallback category.
 */
export const docCategories = mysqlTable(
  'doc_categories',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 128 }).notNull(),
    color: varchar('color', { length: 16 }).notNull(),
    icon: varchar('icon', { length: 32 }).notNull(),
    position: int('position').notNull().default(0),
    createdAt: varchar('created_at', { length: 32 }),
  },
  (table) => ({
    projectNameUnique: uniqueIndex('doc_categories_project_name_unique').on(
      table.projectId,
      table.name,
    ),
  }),
)

/**
 * Threaded discussion attached to any entity by (entity_type, entity_id).
 * parent_id points at the thread's root comment (two levels: root + replies);
 * deleted_at marks a root kept as a placeholder because it still has replies.
 * There is deliberately no FK to the entity (it varies by type), so deleting
 * an entity must also delete its comments.
 */
export const comments = mysqlTable(
  'comments',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    entityType: varchar('entity_type', { length: 32 }).notNull(),
    entityId: int('entity_id').notNull(),
    parentId: int('parent_id'),
    authorId: varchar('author_id', { length: 255 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    body: text('body').notNull(),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
    updatedAt: varchar('updated_at', { length: 32 }),
    deletedAt: varchar('deleted_at', { length: 32 }),
  },
  (table) => ({
    entityIndex: index('comments_entity_idx').on(
      table.entityType,
      table.entityId,
    ),
    projectIdIndex: index('comments_project_id_idx').on(table.projectId),
    parentIdIndex: index('comments_parent_id_idx').on(table.parentId),
  }),
)

export const automationRuns = mysqlTable(
  'automation_runs',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 255 }),
    name: text('name').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('unknown'),
    environment: varchar('environment', { length: 128 }),
    branch: varchar('branch', { length: 255 }),
    commitSha: varchar('commit_sha', { length: 128 }),
    ciBuildUrl: text('ci_build_url'),
    triggerSource: varchar('trigger_source', { length: 32 })
      .notNull()
      .default('api'),
    rawFormat: varchar('raw_format', { length: 64 }).notNull().default('junit'),
    rawReport: longtext('raw_report'),
    totalCount: int('total_count').notNull().default(0),
    passedCount: int('passed_count').notNull().default(0),
    failedCount: int('failed_count').notNull().default(0),
    skippedCount: int('skipped_count').notNull().default(0),
    blockedCount: int('blocked_count').notNull().default(0),
    unknownCount: int('unknown_count').notNull().default(0),
    durationMs: int('duration_ms').notNull().default(0),
    startedAt: varchar('started_at', { length: 32 }),
    finishedAt: varchar('finished_at', { length: 32 }),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
    updatedAt: varchar('updated_at', { length: 32 }).notNull(),
  },
  (table) => ({
    projectIdIndex: index('automation_runs_project_id_idx').on(table.projectId),
    statusIndex: index('automation_runs_status_idx').on(
      table.projectId,
      table.status,
    ),
    startedAtIndex: index('automation_runs_started_at_idx').on(
      table.projectId,
      table.startedAt,
    ),
    externalIdUnique: uniqueIndex('automation_runs_project_external_unique').on(
      table.projectId,
      table.externalId,
    ),
  }),
)

export const automationTestResults = mysqlTable(
  'automation_test_results',
  {
    id: int('id').autoincrement().primaryKey(),
    runId: int('run_id')
      .notNull()
      .references(() => automationRuns.id, { onDelete: 'cascade' }),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    externalId: varchar('external_id', { length: 255 }),
    name: varchar('name', { length: 512 }).notNull(),
    suite: varchar('suite', { length: 255 }),
    filePath: text('file_path'),
    status: varchar('status', { length: 32 }).notNull().default('unknown'),
    durationMs: int('duration_ms').notNull().default(0),
    manualTestId: int('manual_test_id').references(() => tests.id, {
      onDelete: 'set null',
    }),
    caseKey: varchar('case_key', { length: 128 }),
    errorMessage: text('error_message'),
    stackTrace: mediumtext('stack_trace'),
    stdout: mediumtext('stdout'),
    stderr: mediumtext('stderr'),
    retryCount: int('retry_count').notNull().default(0),
    startedAt: varchar('started_at', { length: 32 }),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
  },
  (table) => ({
    runIdIndex: index('automation_results_run_id_idx').on(table.runId),
    projectStatusIndex: index('automation_results_project_status_idx').on(
      table.projectId,
      table.status,
    ),
    projectSuiteIndex: index('automation_results_project_suite_idx').on(
      table.projectId,
      table.suite,
    ),
    projectNameIndex: index('automation_results_project_name_idx').on(
      table.projectId,
      table.name,
    ),
    manualTestIndex: index('automation_results_manual_test_idx').on(
      table.manualTestId,
    ),
  }),
)

export const automationAttachments = mysqlTable(
  'automation_attachments',
  {
    id: int('id').autoincrement().primaryKey(),
    resultId: int('result_id').references(() => automationTestResults.id, {
      onDelete: 'set null',
    }),
    runId: int('run_id')
      .notNull()
      .references(() => automationRuns.id, { onDelete: 'cascade' }),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 64 }),
    url: text('url').notNull(),
    contentType: varchar('content_type', { length: 128 }),
    sizeBytes: int('size_bytes'),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
  },
  (table) => ({
    resultIdIndex: index('automation_attachments_result_id_idx').on(
      table.resultId,
    ),
    runIdIndex: index('automation_attachments_run_id_idx').on(table.runId),
    projectIdIndex: index('automation_attachments_project_id_idx').on(
      table.projectId,
    ),
  }),
)

export const automationTestCaseLinks = mysqlTable(
  'automation_test_case_links',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    resultId: int('result_id'),
    testId: int('test_id')
      .notNull()
      .references(() => tests.id, { onDelete: 'cascade' }),
    automationSuite: varchar('automation_suite', { length: 255 }),
    automationName: varchar('automation_name', { length: 512 }).notNull(),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
    updatedAt: varchar('updated_at', { length: 32 }).notNull(),
  },
  (table) => ({
    resultFk: foreignKey({
      columns: [table.resultId],
      foreignColumns: [automationTestResults.id],
      name: 'atcl_result_id_fk',
    }).onDelete('cascade'),
    resultIdIndex: index('automation_links_result_id_idx').on(table.resultId),
    testIdIndex: index('automation_links_test_id_idx').on(table.testId),
    projectSuiteIndex: index('automation_links_project_suite_idx').on(
      table.projectId,
      table.automationSuite,
    ),
    resultTestUnique: uniqueIndex('automation_links_result_test_unique').on(
      table.resultId,
      table.testId,
    ),
  }),
)

export const projectApiTokens = mysqlTable(
  'project_api_tokens',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    tokenHash: varchar('token_hash', { length: 255 }).notNull(),
    tokenPrefix: varchar('token_prefix', { length: 32 }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    lastUsedAt: varchar('last_used_at', { length: 32 }),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
    updatedAt: varchar('updated_at', { length: 32 }).notNull(),
  },
  (table) => ({
    projectIdIndex: index('project_api_tokens_project_id_idx').on(
      table.projectId,
    ),
    tokenHashUnique: uniqueIndex('project_api_tokens_hash_unique').on(
      table.tokenHash,
    ),
    tokenPrefixIndex: index('project_api_tokens_prefix_idx').on(
      table.tokenPrefix,
    ),
  }),
)

export const projectMembers = mysqlTable(
  'project_members',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).notNull().default('editor'),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
  },
  (table) => ({
    projectUserUnique: uniqueIndex('project_members_project_user_unique').on(
      table.projectId,
      table.userId,
    ),
    userIdIndex: index('project_members_user_id_idx').on(table.userId),
  }),
)

export const projectIntegrations = mysqlTable(
  'project_integrations',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    jiraBaseUrl: varchar('jira_base_url', { length: 255 }),
    jiraEmail: varchar('jira_email', { length: 255 }),
    jiraApiToken: text('jira_api_token'),
    jiraProjectKey: varchar('jira_project_key', { length: 64 }),
    jiraIssueType: varchar('jira_issue_type', { length: 64 }),
    autoCreateBugOnFailure: boolean('auto_create_bug_on_failure')
      .notNull()
      .default(false),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
    updatedAt: varchar('updated_at', { length: 32 }).notNull(),
  },
  (table) => ({
    projectIdUnique: uniqueIndex('project_integrations_project_id_unique').on(
      table.projectId,
    ),
  }),
)

export const projectNotificationChannels = mysqlTable(
  'project_notification_channels',
  {
    id: int('id').autoincrement().primaryKey(),
    projectId: int('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // Discriminator for the kind of channel — 'teams' today; the same shape
    // (webhook URL + per-event toggles) covers Slack/Discord/generic
    // webhooks later without another migration.
    type: varchar('type', { length: 32 }).notNull(),
    webhookUrl: text('webhook_url'),
    enabled: boolean('enabled').notNull().default(false),
    notifyOnAutomationFailure: boolean('notify_on_automation_failure')
      .notNull()
      .default(true),
    notifyOnJiraBugCreated: boolean('notify_on_jira_bug_created')
      .notNull()
      .default(true),
    notifyOnRunCompleted: boolean('notify_on_run_completed')
      .notNull()
      .default(false),
    notifyOnReleaseLinked: boolean('notify_on_release_linked')
      .notNull()
      .default(false),
    createdAt: varchar('created_at', { length: 32 }).notNull(),
    updatedAt: varchar('updated_at', { length: 32 }).notNull(),
  },
  (table) => ({
    projectTypeUnique: uniqueIndex(
      'project_notification_channels_project_type_unique',
    ).on(table.projectId, table.type),
  }),
)

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectMember = typeof projectMembers.$inferSelect
export type AuthUser = typeof user.$inferSelect
export type AutomationRun = typeof automationRuns.$inferSelect
export type AutomationTestResult = typeof automationTestResults.$inferSelect
