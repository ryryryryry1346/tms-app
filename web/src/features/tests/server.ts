import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let and: typeof import('drizzle-orm')['and']
let asc: typeof import('drizzle-orm')['asc']
let count: typeof import('drizzle-orm')['count']
let eq: typeof import('drizzle-orm')['eq']
let inArray: typeof import('drizzle-orm')['inArray']
let like: typeof import('drizzle-orm')['like']
let or: typeof import('drizzle-orm')['or']
let sql: typeof import('drizzle-orm')['sql']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let projects: typeof import('../../db/schema')['projects']
let sections: typeof import('../../db/schema')['sections']
let tests: typeof import('../../db/schema')['tests']
let testRunItems: typeof import('../../db/schema')['testRunItems']
let ensureProjectSlugs: typeof import('../projects/slug')['ensureProjectSlugs']

async function ensureTestServerDeps(): Promise<void> {
  if (getDb) {
    return
  }

  const [drizzle, dbClient, schema, slug] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/client'),
    import('../../db/schema'),
    import('../projects/slug'),
  ])

  and = drizzle.and
  asc = drizzle.asc
  count = drizzle.count
  eq = drizzle.eq
  inArray = drizzle.inArray
  like = drizzle.like
  or = drizzle.or
  sql = drizzle.sql
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  projects = schema.projects
  sections = schema.sections
  tests = schema.tests
  testRunItems = schema.testRunItems
  ensureProjectSlugs = slug.ensureProjectSlugs
}

const dashboardInput = z.object({
  projectId: z.number().int().positive().optional(),
  projectSlug: z.string().trim().min(1).optional(),
  search: z.string().trim().optional(),
  suiteId: z.number().int().positive().optional(),
  status: z.enum(['All', 'Draft', 'Ready', 'Archived']).optional(),
  priority: z.enum(['All', 'Low', 'Medium', 'High', 'Critical']).optional(),
  caseType: z
    .enum(['All', 'Functional', 'Regression', 'Smoke', 'E2E', 'UI', 'API'])
    .optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().min(25).max(30).optional(),
})

const exportRepositoryCsvInput = dashboardInput.extend({
  ids: z.array(z.number().int().positive()).optional(),
})

type ActivityDb = ReturnType<typeof import('../../db/client')['getDb']>

type ActivityActor = {
  id: number
  username: string
}

async function logTestCaseActivity({
  db,
  testId,
  projectId,
  actor,
  action,
  summary,
  createdAt = new Date().toISOString(),
}: {
  db: ActivityDb
  testId: number
  projectId: number | null
  actor: ActivityActor
  action: string
  summary: string
  createdAt?: string
}): Promise<void> {
  const { logTestCaseActivity: writeTestCaseActivity } = await import(
    './activity.server'
  )

  await writeTestCaseActivity({
    db,
    testId,
    projectId,
    actor,
    action,
    summary,
    createdAt,
  })
}

const updateTestStatusInput = z.object({
  id: z.number().int().positive(),
  status: z.enum(['Draft', 'Ready', 'Archived']),
})

const updateTestTitleInput = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
})

const updateTestContentInput = z.object({
  id: z.number().int().positive(),
  steps: z.string(),
  expected: z.string(),
})

const bulkUpdateTestStatusInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  status: z.enum(['Draft', 'Ready', 'Archived']),
})

const bulkUpdateTestMetadataInput = z
  .object({
    ids: z.array(z.number().int().positive()).min(1),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
    caseType: z
      .enum(['Functional', 'Regression', 'Smoke', 'E2E', 'UI', 'API'])
      .optional(),
  })
  .refine((data) => data.priority || data.caseType, {
    message: 'Choose metadata to update.',
  })

const bulkMoveTestCasesInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  sectionId: z.number().int().positive(),
})

const moveAndReorderTestCasesInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
  sectionId: z.number().int().positive(),
  orderedIds: z.array(z.number().int().positive()).min(1),
})

const bulkRestoreTestCasesInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
})

const bulkDeleteArchivedTestCasesInput = z.object({
  ids: z.array(z.number().int().positive()).min(1),
})

const getTestDetailInput = z.object({
  id: z.number().int().positive(),
})

const createTestFormInput = z.object({
  projectId: z.number().int().positive().optional(),
})

const createTestInput = z.object({
  title: z.string().trim().min(1),
  sectionId: z.number().int().positive(),
  status: z.enum(['Draft', 'Ready']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  caseType: z
    .enum(['Functional', 'Regression', 'Smoke', 'E2E', 'UI', 'API'])
    .default('Functional'),
  steps: z.string(),
  expected: z.string(),
})

const updateTestInput = z.object({
  id: z.number().int().positive(),
  title: z.string().trim().min(1),
  sectionId: z.number().int().positive(),
  status: z.enum(['Draft', 'Ready', 'Archived']),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  caseType: z
    .enum(['Functional', 'Regression', 'Smoke', 'E2E', 'UI', 'API'])
    .default('Functional'),
  steps: z.string(),
  expected: z.string(),
})

export type DashboardTest = {
  id: number
  title: string
  status: string | null
  priority: string | null
  caseType: string | null
  archivedFromStatus: string | null
  sectionId: number | null
  projectId: number | null
  sortOrder: number | null
  createdAt: string | null
  updatedAt: string | null
}

export type DashboardActivity = {
  id: number
  testId: number
  projectId: number | null
  actorId: number | null
  actorName: string | null
  action: string
  summary: string
  createdAt: string
}

export type DashboardSection = {
  id: number
  name: string
  projectId: number | null
  projectName?: string | null
  projectSlug?: string | null
}

export type DashboardProject = {
  id: number
  name: string
  slug: string | null
  status: string | null
}

export type DashboardState = {
  databaseConfigured: boolean
  projects: DashboardProject[]
  selectedProjectId?: number
  sections: DashboardSection[]
  tests: DashboardTest[]
  activities: DashboardActivity[]
}

export type RepositoryState = DashboardState & {
  pagination: {
    page: number
    pageSize: number
    totalCases: number
    totalPages: number
  }
  suiteStats: Array<{
    sectionId: number
    totalCases: number
    activeCases: number
    readyCases: number
    draftCases: number
    archivedCases: number
  }>
  stats: {
    totalCases: number
    activeCases: number
    readyCases: number
    archivedCases: number
  }
}

export type RepositoryCsvExport = {
  filename: string
  csv: string
  rowCount: number
}

export type RepositoryImportSource = 'auto' | 'native' | 'testmo'

export type RepositoryImportPreviewRow = {
  rowNumber: number
  title: string
  suite: string
  status: 'Draft' | 'Ready' | 'Archived'
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  caseType: 'Functional' | 'Regression' | 'Smoke' | 'E2E' | 'UI' | 'API'
  steps: string
  expected: string
  stepsPreview: string
  expectedPreview: string
  duplicate: 'none' | 'file' | 'database'
  warnings: string[]
  errors: string[]
}

export type RepositoryImportPreview = {
  filename: string
  source: RepositoryImportSource
  detectedSource: Exclude<RepositoryImportSource, 'auto'>
  totalRows: number
  previewRows: RepositoryImportPreviewRow[]
  validRows: number
  warningRows: number
  errorRows: number
  missingSuites: string[]
  duplicateRows: number
}

export type RepositoryImportResult = {
  importedCases: number
  createdSuites: number
  skippedRows: number
}

type RepositoryImportPlan = {
  preview: RepositoryImportPreview
  rows: RepositoryImportPreviewRow[]
}

export type CreateTestFormState = {
  databaseConfigured: boolean
  sections: DashboardSection[]
}

export type EditTestFormState = {
  databaseConfigured: boolean
  sections: DashboardSection[]
  test: {
    id: number
    title: string
    steps: string
    expected: string
    status: 'Draft' | 'Ready' | 'Archived'
    priority: 'Low' | 'Medium' | 'High' | 'Critical'
    caseType: 'Functional' | 'Regression' | 'Smoke' | 'E2E' | 'UI' | 'API'
    sectionId: number
    projectId: number | null
  }
}

export type TestDetail = {
  id: number
  title: string
  steps: string | null
  expected: string | null
  status: string | null
  priority: string | null
  caseType: string | null
  archivedFromStatus: string | null
  sectionId: number | null
  projectId: number | null
  sectionName: string | null
  projectName: string | null
  projectSlug: string | null
  createdAt: string | null
  updatedAt: string | null
  activities: DashboardActivity[]
  sections: DashboardSection[]
}

export const getDashboardState = createServerFn({ method: 'POST' })
  .inputValidator(dashboardInput)
  .handler(async ({ data }): Promise<DashboardState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    if (!isDatabaseConfigured()) {
      return {
        databaseConfigured: false,
        projects: [],
        selectedProjectId: data.projectId,
        sections: [],
        tests: [],
        activities: [],
        pagination: {
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 30,
          totalCases: 0,
          totalPages: 1,
        },
        suiteStats: [],
        stats: {
          totalCases: 0,
          activeCases: 0,
          readyCases: 0,
          archivedCases: 0,
        },
      }
    }

    const db = getDb()
    await ensureProjectSlugs()
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        status: projects.status,
      })
      .from(projects)
      .orderBy(asc(projects.id))

    const selectedProjectId =
      data.projectId ??
      projectRows.find((project) => project.slug === data.projectSlug)?.id

    if (!selectedProjectId) {
      return {
        databaseConfigured: true,
        projects: projectRows,
        sections: [],
        tests: [],
        activities: [],
      }
    }

    const sectionRows = await db
      .select({
        id: sections.id,
        name: sections.name,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.projectId, selectedProjectId))
      .orderBy(asc(sections.id))

    const testRows = await db
      .select({
        id: tests.id,
        title: tests.title,
        status: tests.status,
        priority: tests.priority,
        caseType: tests.caseType,
        archivedFromStatus: tests.archivedFromStatus,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
        sortOrder: tests.sortOrder,
        createdAt: tests.createdAt,
        updatedAt: tests.updatedAt,
      })
      .from(tests)
      .where(eq(tests.projectId, selectedProjectId))
      .orderBy(asc(tests.sectionId), asc(tests.sortOrder), asc(tests.id))

    return {
      databaseConfigured: true,
      projects: projectRows,
      selectedProjectId,
      sections: sectionRows,
      tests: testRows,
      activities: [],
    }
  })

export const getRepositoryState = createServerFn({ method: 'POST' })
  .inputValidator(dashboardInput)
  .handler(async ({ data }): Promise<RepositoryState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    if (!isDatabaseConfigured()) {
      return {
        databaseConfigured: false,
        projects: [],
        selectedProjectId: data.projectId,
        sections: [],
        tests: [],
        activities: [],
      }
    }

    const db = getDb()

    async function loadProject(): Promise<DashboardProject | null> {
      const rows = await db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          status: projects.status,
        })
        .from(projects)
        .where(
          data.projectId
            ? eq(projects.id, data.projectId)
            : eq(projects.slug, data.projectSlug ?? ''),
        )
        .limit(1)

      return rows[0] ?? null
    }

    let project = await loadProject()

    if (!project && data.projectSlug) {
      await ensureProjectSlugs()
      project = await loadProject()
    }

    if (!project) {
      return {
        databaseConfigured: true,
        projects: [],
        sections: [],
        tests: [],
        activities: [],
        pagination: {
          page: data.page ?? 1,
          pageSize: data.pageSize ?? 30,
          totalCases: 0,
          totalPages: 1,
        },
        suiteStats: [],
        stats: {
          totalCases: 0,
          activeCases: 0,
          readyCases: 0,
          archivedCases: 0,
        },
      }
    }

    const pageSize = data.pageSize ?? 30
    const page = data.page ?? 1
    const offset = (page - 1) * pageSize
    const statusFilter = data.status ?? 'All'
    const priorityFilter = data.priority ?? 'All'
    const caseTypeFilter = data.caseType ?? 'All'
    const search = data.search?.trim() ?? ''
    const searchPattern = `%${search}%`
    const numericSearchId = Number(search)
    const searchCondition = search
      ? Number.isInteger(numericSearchId) && numericSearchId > 0
        ? or(like(tests.title, searchPattern), eq(tests.id, numericSearchId))
        : like(tests.title, searchPattern)
      : undefined
    const filteredTestConditions = [
      eq(tests.projectId, project.id),
      statusFilter === 'All'
        ? sql`${tests.status} <> 'Archived'`
        : eq(tests.status, statusFilter),
      data.suiteId ? eq(tests.sectionId, data.suiteId) : undefined,
      priorityFilter !== 'All' ? eq(tests.priority, priorityFilter) : undefined,
      caseTypeFilter !== 'All' ? eq(tests.caseType, caseTypeFilter) : undefined,
      searchCondition,
    ].filter(
      (
        condition,
      ): condition is Exclude<typeof condition, undefined> =>
        condition !== undefined,
    )

    const [
      sectionRows,
      testRows,
      filteredCountRows,
      statsRows,
      suiteStatsRows,
    ] = await Promise.all([
      db
        .select({
          id: sections.id,
          name: sections.name,
          projectId: sections.projectId,
        })
        .from(sections)
        .where(eq(sections.projectId, project.id))
        .orderBy(asc(sections.id)),
      db
        .select({
          id: tests.id,
          title: tests.title,
          status: tests.status,
          priority: tests.priority,
          caseType: tests.caseType,
          archivedFromStatus: tests.archivedFromStatus,
          sectionId: tests.sectionId,
          projectId: tests.projectId,
          sortOrder: tests.sortOrder,
          createdAt: tests.createdAt,
          updatedAt: tests.updatedAt,
        })
        .from(tests)
        .where(and(...filteredTestConditions))
        .orderBy(asc(tests.sectionId), asc(tests.sortOrder), asc(tests.id))
        .limit(pageSize)
        .offset(offset),
      db
        .select({
          value: count(),
        })
        .from(tests)
        .where(and(...filteredTestConditions)),
      db
        .select({
          totalCases: count(),
          activeCases: sql<number>`sum(case when ${tests.status} <> 'Archived' then 1 else 0 end)`,
          readyCases: sql<number>`sum(case when ${tests.status} = 'Ready' then 1 else 0 end)`,
          archivedCases: sql<number>`sum(case when ${tests.status} = 'Archived' then 1 else 0 end)`,
        })
        .from(tests)
        .where(eq(tests.projectId, project.id)),
      db
        .select({
          sectionId: tests.sectionId,
          totalCases: count(),
          activeCases: sql<number>`sum(case when ${tests.status} <> 'Archived' then 1 else 0 end)`,
          readyCases: sql<number>`sum(case when ${tests.status} = 'Ready' then 1 else 0 end)`,
          draftCases: sql<number>`sum(case when ${tests.status} = 'Draft' then 1 else 0 end)`,
          archivedCases: sql<number>`sum(case when ${tests.status} = 'Archived' then 1 else 0 end)`,
        })
        .from(tests)
        .where(eq(tests.projectId, project.id))
        .groupBy(tests.sectionId),
    ])
    const totalFilteredCases = filteredCountRows[0]?.value ?? 0
    const stats = statsRows[0]

    return {
      databaseConfigured: true,
      projects: [project],
      selectedProjectId: project.id,
      sections: sectionRows,
      tests: testRows,
      activities: [],
      pagination: {
        page,
        pageSize,
        totalCases: totalFilteredCases,
        totalPages: Math.max(1, Math.ceil(totalFilteredCases / pageSize)),
      },
      suiteStats: suiteStatsRows
        .filter((row) => row.sectionId !== null)
        .map((row) => ({
          sectionId: row.sectionId ?? 0,
          totalCases: Number(row.totalCases ?? 0),
          activeCases: Number(row.activeCases ?? 0),
          readyCases: Number(row.readyCases ?? 0),
          draftCases: Number(row.draftCases ?? 0),
          archivedCases: Number(row.archivedCases ?? 0),
        })),
      stats: {
        totalCases: Number(stats?.totalCases ?? 0),
        activeCases: Number(stats?.activeCases ?? 0),
        readyCases: Number(stats?.readyCases ?? 0),
        archivedCases: Number(stats?.archivedCases ?? 0),
      },
    }
  })

function csvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }

  const text = String(value)

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }

  return text
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',')
}

function buildRepositoryCsvFilename(projectName: string, scope: string): string {
  const normalizedProjectName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const date = new Date().toISOString().slice(0, 10)

  return `${normalizedProjectName || 'project'}-repository-${scope}-${date}.csv`
}

export const exportRepositoryCasesCsv = createServerFn({ method: 'POST' })
  .inputValidator(exportRepositoryCsvInput)
  .handler(async ({ data }): Promise<RepositoryCsvExport> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    if (!isDatabaseConfigured()) {
      return {
        filename: 'repository-export.csv',
        csv: csvRow([
          'id',
          'suite',
          'title',
          'status',
          'priority',
          'type',
          'steps',
          'expected',
          'created_at',
          'updated_at',
        ]),
        rowCount: 0,
      }
    }

    const db = getDb()

    async function loadProject(): Promise<DashboardProject | null> {
      const rows = await db
        .select({
          id: projects.id,
          name: projects.name,
          slug: projects.slug,
          status: projects.status,
        })
        .from(projects)
        .where(
          data.projectId
            ? eq(projects.id, data.projectId)
            : eq(projects.slug, data.projectSlug ?? ''),
        )
        .limit(1)

      return rows[0] ?? null
    }

    let project = await loadProject()

    if (!project && data.projectSlug) {
      await ensureProjectSlugs()
      project = await loadProject()
    }

    if (!project) {
      throw notFound()
    }

    const selectedIds = Array.from(new Set(data.ids ?? []))
    const statusFilter = data.status ?? 'All'
    const priorityFilter = data.priority ?? 'All'
    const caseTypeFilter = data.caseType ?? 'All'
    const search = data.search?.trim() ?? ''
    const searchPattern = `%${search}%`
    const numericSearchId = Number(search)
    const searchCondition = search
      ? Number.isInteger(numericSearchId) && numericSearchId > 0
        ? or(like(tests.title, searchPattern), eq(tests.id, numericSearchId))
        : like(tests.title, searchPattern)
      : undefined
    const filteredTestConditions = [
      eq(tests.projectId, project.id),
      selectedIds.length > 0 ? inArray(tests.id, selectedIds) : undefined,
      selectedIds.length === 0 && statusFilter === 'All'
        ? sql`${tests.status} <> 'Archived'`
        : undefined,
      selectedIds.length === 0 && statusFilter !== 'All'
        ? eq(tests.status, statusFilter)
        : undefined,
      selectedIds.length === 0 && data.suiteId
        ? eq(tests.sectionId, data.suiteId)
        : undefined,
      selectedIds.length === 0 && priorityFilter !== 'All'
        ? eq(tests.priority, priorityFilter)
        : undefined,
      selectedIds.length === 0 && caseTypeFilter !== 'All'
        ? eq(tests.caseType, caseTypeFilter)
        : undefined,
      selectedIds.length === 0 ? searchCondition : undefined,
    ].filter(
      (
        condition,
      ): condition is Exclude<typeof condition, undefined> =>
        condition !== undefined,
    )

    const [sectionRows, testRows] = await Promise.all([
      db
        .select({
          id: sections.id,
          name: sections.name,
        })
        .from(sections)
        .where(eq(sections.projectId, project.id)),
      db
        .select({
          id: tests.id,
          title: tests.title,
          status: tests.status,
          priority: tests.priority,
          caseType: tests.caseType,
          sectionId: tests.sectionId,
          sortOrder: tests.sortOrder,
          steps: tests.steps,
          expected: tests.expected,
          createdAt: tests.createdAt,
          updatedAt: tests.updatedAt,
        })
        .from(tests)
        .where(and(...filteredTestConditions))
        .orderBy(asc(tests.sectionId), asc(tests.sortOrder), asc(tests.id)),
    ])
    const suiteNameById = new Map(
      sectionRows.map((section) => [section.id, section.name]),
    )
    const rows = [
      csvRow([
        'id',
        'suite',
        'title',
        'status',
        'priority',
        'type',
        'steps',
        'expected',
        'created_at',
        'updated_at',
      ]),
      ...testRows.map((test) =>
        csvRow([
          test.id,
          test.sectionId ? suiteNameById.get(test.sectionId) ?? '' : '',
          test.title,
          test.status ?? 'Draft',
          test.priority ?? 'Medium',
          test.caseType ?? 'Functional',
          test.steps ?? '',
          test.expected ?? '',
          test.createdAt ?? '',
          test.updatedAt ?? '',
        ]),
      ),
    ]

    return {
      filename: buildRepositoryCsvFilename(
        project.name,
        selectedIds.length > 0 ? 'selected' : 'filtered',
      ),
      csv: rows.join('\r\n'),
      rowCount: testRows.length,
    }
  })

type CsvParseResult = {
  headers: string[]
  rows: string[][]
}

function parseCsv(text: string): CsvParseResult {
  const headers: string[] = []
  const rows: string[][] = []
  let current = ''
  let currentRow: string[] = []
  let isQuoted = false
  let rowIndex = 0

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const nextChar = text[index + 1]

    if (char === '"') {
      if (isQuoted && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        isQuoted = !isQuoted
      }

      continue
    }

    if (char === ',' && !isQuoted) {
      currentRow.push(current)
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !isQuoted) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      currentRow.push(current)
      current = ''

      if (rowIndex === 0) {
        headers.push(...currentRow.map((header) => header.replace(/^\uFEFF/, '').trim()))
      } else if (currentRow.some((field) => field.trim().length > 0)) {
        rows.push(currentRow)
      }

      currentRow = []
      rowIndex += 1
      continue
    }

    current += char
  }

  if (current.length > 0 || currentRow.length > 0) {
    currentRow.push(current)

    if (rowIndex === 0) {
      headers.push(...currentRow.map((header) => header.replace(/^\uFEFF/, '').trim()))
    } else if (currentRow.some((field) => field.trim().length > 0)) {
      rows.push(currentRow)
    }
  }

  return { headers, rows }
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase()
}

function getCsvValue(
  headers: string[],
  row: string[],
  names: string[],
): string {
  const normalizedNames = names.map(normalizeHeader)

  for (let index = 0; index < headers.length; index += 1) {
    if (!normalizedNames.includes(normalizeHeader(headers[index] ?? ''))) {
      continue
    }

    const value = row[index]?.trim() ?? ''

    if (value.length > 0) {
      return value
    }
  }

  return ''
}

function stripHtml(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function truncatePreview(value: string): string {
  const text = stripHtml(value).replace(/\s+/g, ' ').trim()

  return text.length > 120 ? `${text.slice(0, 117)}...` : text
}

function normalizeImportPriority(value: string): {
  value: RepositoryImportPreviewRow['priority']
  warning?: string
} {
  const normalized = value.trim().toLowerCase()

  if (normalized === 'low') return { value: 'Low' }
  if (normalized === 'medium' || normalized === 'normal') return { value: 'Medium' }
  if (normalized === 'high') return { value: 'High' }
  if (normalized === 'critical' || normalized === 'urgent') return { value: 'Critical' }

  return {
    value: 'Medium',
    warning: value
      ? `Unknown priority "${value}" will be imported as Medium.`
      : 'Missing priority will be imported as Medium.',
  }
}

function normalizeImportType(value: string): {
  value: RepositoryImportPreviewRow['caseType']
  warning?: string
} {
  const normalized = value.trim().toLowerCase()

  if (normalized.includes('regression')) return { value: 'Regression' }
  if (normalized.includes('smoke')) return { value: 'Smoke' }
  if (normalized.includes('e2e')) return { value: 'E2E' }
  if (normalized.includes('api')) return { value: 'API' }
  if (normalized.includes('ui')) return { value: 'UI' }
  if (normalized.includes('functional') || normalized.includes('steps') || !normalized) {
    return { value: 'Functional' }
  }

  return {
    value: 'Functional',
    warning: `Unknown type "${value}" will be imported as Functional.`,
  }
}

function normalizeImportStatus(value: string, stateValue: string): {
  value: RepositoryImportPreviewRow['status']
  warning?: string
} {
  const normalized = (value || stateValue).trim().toLowerCase()

  if (normalized === 'ready') return { value: 'Ready' }
  if (normalized === 'draft' || normalized === 'active' || !normalized) return { value: 'Draft' }
  if (normalized === 'archived' || normalized === 'inactive') return { value: 'Archived' }

  return {
    value: 'Draft',
    warning: `Unknown status "${value || stateValue}" will be imported as Draft.`,
  }
}

function detectImportSource(headers: string[]): Exclude<RepositoryImportSource, 'auto'> {
  const headerSet = new Set(headers.map(normalizeHeader))

  if (
    headerSet.has('case id') &&
    headerSet.has('case') &&
    headerSet.has('steps (step)')
  ) {
    return 'testmo'
  }

  return 'native'
}

function mapImportRow({
  headers,
  row,
  rowNumber,
  source,
  knownSuiteNames,
  existingTitleKeys,
  fileTitleKeys,
  createMissingSuites,
}: {
  headers: string[]
  row: string[]
  rowNumber: number
  source: Exclude<RepositoryImportSource, 'auto'>
  knownSuiteNames: Set<string>
  existingTitleKeys: Set<string>
  fileTitleKeys: Set<string>
  createMissingSuites: boolean
}): RepositoryImportPreviewRow {
  const warnings: string[] = []
  const errors: string[] = []
  const title =
    source === 'testmo'
      ? getCsvValue(headers, row, ['Case'])
      : getCsvValue(headers, row, ['title', 'case', 'name'])
  const suite =
    source === 'testmo'
      ? getCsvValue(headers, row, ['Folder', 'Suite']) || 'Imported'
      : getCsvValue(headers, row, ['suite', 'folder', 'section']) || 'Imported'
  const rawPriority = getCsvValue(headers, row, ['priority'])
  const rawType =
    source === 'testmo'
      ? getCsvValue(headers, row, ['Template'])
      : getCsvValue(headers, row, ['type', 'case_type', 'template'])
  const rawStatus =
    source === 'testmo'
      ? ''
      : getCsvValue(headers, row, ['status', 'state'])
  const rawState = getCsvValue(headers, row, ['State'])
  const steps =
    source === 'testmo'
      ? getCsvValue(headers, row, ['Steps (Step)'])
      : getCsvValue(headers, row, ['steps', 'steps (step)', 'step'])
  const expected =
    source === 'testmo'
      ? getCsvValue(headers, row, ['Steps (Expected)', 'Expected'])
      : getCsvValue(headers, row, ['expected', 'expected_result', 'steps (expected)'])
  const priority = normalizeImportPriority(rawPriority)
  const caseType = normalizeImportType(rawType)
  const status = normalizeImportStatus(rawStatus, rawState)
  const normalizedTitle = title.trim()
  const normalizedSuite = suite.trim()
  const titleKey = `${normalizedSuite.toLowerCase()}::${normalizedTitle.toLowerCase()}`
  let duplicate: RepositoryImportPreviewRow['duplicate'] = 'none'

  if (!normalizedTitle) {
    errors.push('Title is required.')
  }

  if (!normalizedSuite) {
    errors.push('Suite is required.')
  } else if (!knownSuiteNames.has(normalizedSuite.toLowerCase())) {
    if (createMissingSuites) {
      warnings.push(`Suite "${normalizedSuite}" will be created.`)
    } else {
      errors.push(`Suite "${normalizedSuite}" does not exist.`)
    }
  }

  if (normalizedTitle && normalizedSuite) {
    if (existingTitleKeys.has(titleKey)) {
      duplicate = 'database'
      warnings.push(`A case named "${normalizedTitle}" already exists in "${normalizedSuite}".`)
    } else if (fileTitleKeys.has(titleKey)) {
      duplicate = 'file'
      warnings.push(`Duplicate case "${normalizedTitle}" in "${normalizedSuite}" inside this CSV.`)
    } else {
      fileTitleKeys.add(titleKey)
    }
  }

  if (priority.warning) warnings.push(priority.warning)
  if (caseType.warning) warnings.push(caseType.warning)
  if (status.warning) warnings.push(status.warning)

  return {
    rowNumber,
    title: normalizedTitle,
    suite: normalizedSuite,
    status: status.value,
    priority: priority.value,
    caseType: caseType.value,
    steps: stripHtml(steps),
    expected: stripHtml(expected),
    stepsPreview: truncatePreview(steps),
    expectedPreview: truncatePreview(expected),
    duplicate,
    warnings,
    errors,
  }
}

async function buildRepositoryImportPreview({
  file,
  projectId,
  requestedSource,
  createMissingSuites,
}: {
  file: File
  projectId: number
  requestedSource: RepositoryImportSource
  createMissingSuites: boolean
}): Promise<RepositoryImportPlan> {
  const text = await file.text()
  const parsed = parseCsv(text)

  if (parsed.headers.length === 0) {
    throw new Error('CSV header row is empty.')
  }

  const detectedSource = detectImportSource(parsed.headers)
  const source = requestedSource === 'auto' ? detectedSource : requestedSource
  const db = getDb()
  const [sectionRows, existingCaseRows] = await Promise.all([
    db
      .select({ id: sections.id, name: sections.name })
      .from(sections)
      .where(eq(sections.projectId, projectId)),
    db
      .select({
        title: tests.title,
        sectionId: tests.sectionId,
      })
      .from(tests)
      .where(eq(tests.projectId, projectId)),
  ])
  const suiteNameById = new Map(
    sectionRows.map((section) => [section.id, section.name]),
  )
  const existingTitleKeys = new Set(
    existingCaseRows
      .map((test) => {
        const suiteName =
          test.sectionId === null ? '' : suiteNameById.get(test.sectionId) ?? ''

        return suiteName
          ? `${suiteName.trim().toLowerCase()}::${test.title.trim().toLowerCase()}`
          : ''
      })
      .filter((key) => key.length > 0),
  )
  const fileTitleKeys = new Set<string>()
  const knownSuiteNames = new Set(
    sectionRows.map((section) => section.name.trim().toLowerCase()),
  )
  const mappedRows = parsed.rows.map((row, index) =>
    mapImportRow({
      headers: parsed.headers,
      row,
      rowNumber: index + 2,
      source,
      knownSuiteNames,
      existingTitleKeys,
      fileTitleKeys,
      createMissingSuites,
    }),
  )
  const missingSuites = Array.from(
    new Set(
      mappedRows
        .filter(
          (row) =>
            row.suite && !knownSuiteNames.has(row.suite.trim().toLowerCase()),
        )
        .map((row) => row.suite),
    ),
  ).sort((first, second) => first.localeCompare(second))
  const errorRows = mappedRows.filter((row) => row.errors.length > 0).length
  const warningRows = mappedRows.filter((row) => row.warnings.length > 0).length
  const duplicateRows = mappedRows.filter((row) => row.duplicate !== 'none').length

  return {
    preview: {
      filename: file.name,
      source: requestedSource,
      detectedSource,
      totalRows: mappedRows.length,
      previewRows: mappedRows.slice(0, 50),
      validRows: mappedRows.length - errorRows,
      warningRows,
      errorRows,
      missingSuites,
      duplicateRows,
    },
    rows: mappedRows,
  }
}

function readRepositoryImportFormData(data: unknown): {
  file: File
  projectId: number
  requestedSource: RepositoryImportSource
} {
  if (!(data instanceof FormData)) {
    throw new Error('Import request must be sent as FormData.')
  }

  const file = data.get('file')
  const projectIdValue = Number(data.get('projectId'))
  const requestedSourceValue = String(data.get('source') ?? 'auto')
  const requestedSource: RepositoryImportSource =
    requestedSourceValue === 'native' || requestedSourceValue === 'testmo'
      ? requestedSourceValue
      : 'auto'

  if (!(file instanceof File)) {
    throw new Error('Choose a CSV file first.')
  }

  if (!Number.isInteger(projectIdValue) || projectIdValue <= 0) {
    throw new Error('Project is missing for import.')
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Only .csv files are supported for import.')
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('CSV file is too large. Maximum size is 5 MB.')
  }

  return {
    file,
    projectId: projectIdValue,
    requestedSource,
  }
}

export const previewRepositoryImportCsv = createServerFn({ method: 'POST' }).handler(
  async ({ data }): Promise<RepositoryImportPreview> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    const { file, projectId, requestedSource } = readRepositoryImportFormData(data)
    const createMissingSuites =
      data instanceof FormData &&
      String(data.get('createMissingSuites') ?? 'true') === 'true'

    const plan = await buildRepositoryImportPreview({
      file,
      projectId,
      requestedSource,
      createMissingSuites,
    })

    return plan.preview
  },
)

export const importRepositoryCsv = createServerFn({ method: 'POST' }).handler(
  async ({ data }): Promise<RepositoryImportResult> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const maybeFormData = data
    const { file, projectId, requestedSource } = readRepositoryImportFormData(
      maybeFormData,
    )
    const createMissingSuites =
      maybeFormData instanceof FormData &&
      String(maybeFormData.get('createMissingSuites') ?? 'false') === 'true'
    const { preview, rows } = await buildRepositoryImportPreview({
      file,
      projectId,
      requestedSource,
      createMissingSuites,
    })

    if (preview.errorRows > 0) {
      throw new Error('Resolve import errors before creating test cases.')
    }

    const db = getDb()
    const now = new Date().toISOString()
    const sectionRows = await db
      .select({ id: sections.id, name: sections.name })
      .from(sections)
      .where(eq(sections.projectId, projectId))
    const sectionByName = new Map(
      sectionRows.map((section) => [section.name.trim().toLowerCase(), section]),
    )
    let createdSuites = 0

    for (const suiteName of preview.missingSuites) {
      if (!createMissingSuites) {
        continue
      }

      const result = await db.insert(sections).values({
        name: suiteName,
        projectId,
      })
      sectionByName.set(suiteName.trim().toLowerCase(), {
        id: result[0].insertId,
        name: suiteName,
      })
      createdSuites += 1
    }

    const suiteIds = Array.from(sectionByName.values()).map((section) => section.id)
    const sortRows =
      suiteIds.length > 0
        ? await db
            .select({
              sectionId: tests.sectionId,
              maxSortOrder: sql<number>`coalesce(max(${tests.sortOrder}), 0)`,
            })
            .from(tests)
            .where(inArray(tests.sectionId, suiteIds))
            .groupBy(tests.sectionId)
        : []
    const nextSortOrderBySuite = new Map(
      sortRows.map((row) => [row.sectionId, Number(row.maxSortOrder ?? 0)]),
    )
    let importedCases = 0
    const importedRows = rows

    for (const row of importedRows) {
      const section = sectionByName.get(row.suite.trim().toLowerCase())

      if (!section) {
        continue
      }

      const nextSortOrder = (nextSortOrderBySuite.get(section.id) ?? 0) + 10
      nextSortOrderBySuite.set(section.id, nextSortOrder)
      const result = await db.insert(tests).values({
        title: row.title,
        steps: row.steps,
        expected: row.expected,
        status: row.status,
        priority: row.priority,
        caseType: row.caseType,
        sectionId: section.id,
        projectId,
        sortOrder: nextSortOrder,
        createdAt: now,
        updatedAt: now,
      })
      const testId = result[0].insertId

      await logTestCaseActivity({
        db,
        testId,
        projectId,
        actor: user,
        action: 'created',
        summary: `Imported from ${preview.filename}.`,
        createdAt: now,
      })
      importedCases += 1
    }

    return {
      importedCases,
      createdSuites,
      skippedRows: preview.totalRows - importedCases,
    }
  },
)

export const updateTestStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateTestStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const now = new Date().toISOString()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)
    const test = rows[0]

    await db
      .update(tests)
      .set({
        status: data.status,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(tests.id, data.id)))

    if (test) {
      await logTestCaseActivity({
        db,
        testId: test.id,
        projectId: test.projectId,
        actor: user,
        action: 'status_changed',
        summary: `Status changed from ${test.status ?? 'Draft'} to ${data.status}.`,
      })
    }

    return { ok: true }
  })

export const updateTestTitle = createServerFn({ method: 'POST' })
  .inputValidator(updateTestTitleInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        title: tests.title,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)
    const test = rows[0]

    await db
      .update(tests)
      .set({
        title: data.title,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tests.id, data.id))

    if (test) {
      await logTestCaseActivity({
        db,
        testId: test.id,
        projectId: test.projectId,
        actor: user,
        action: 'title_updated',
        summary: `Title changed from "${test.title}" to "${data.title}".`,
      })
    }

    return { ok: true }
  })

export const updateTestContent = createServerFn({ method: 'POST' })
  .inputValidator(updateTestContentInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)
    const test = rows[0]

    await db
      .update(tests)
      .set({
        steps: data.steps,
        expected: data.expected,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tests.id, data.id))

    if (test) {
      await logTestCaseActivity({
        db,
        testId: test.id,
        projectId: test.projectId,
        actor: user,
        action: 'content_updated',
        summary: 'Steps and expected result updated.',
      })
    }

    return { ok: true }
  })

export const bulkUpdateTestStatus = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateTestStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    if (rows.length === 0) {
      throw new Error('No test cases were selected.')
    }

    await db.transaction(async (tx) => {
      const now = new Date().toISOString()

      for (const test of rows) {
        if (data.status === 'Archived') {
          await tx
            .update(tests)
            .set({
              status: 'Archived',
              updatedAt: now,
              archivedFromStatus:
                test.status === 'Ready' || test.status === 'Draft'
                  ? test.status
                  : test.archivedFromStatus ?? 'Draft',
            })
            .where(eq(tests.id, test.id))

          continue
        }

        await tx
          .update(tests)
          .set({
            status: data.status,
            archivedFromStatus: null,
            updatedAt: now,
          })
          .where(eq(tests.id, test.id))
      }
    })

    await Promise.all(
      rows.map((test) =>
        logTestCaseActivity({
          db,
          testId: test.id,
          projectId: test.projectId,
          actor: user,
          action: data.status === 'Archived' ? 'archived' : 'status_changed',
          summary:
            data.status === 'Archived'
              ? `Archived from ${test.status ?? 'Draft'}.`
              : `Status changed from ${test.status ?? 'Draft'} to ${data.status}.`,
        }),
      ),
    )

    return { ok: true }
  })

export const bulkUpdateTestMetadata = createServerFn({ method: 'POST' })
  .inputValidator(bulkUpdateTestMetadataInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        priority: tests.priority,
        caseType: tests.caseType,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))
    const updateValues: {
      priority?: 'Low' | 'Medium' | 'High' | 'Critical'
      caseType?: 'Functional' | 'Regression' | 'Smoke' | 'E2E' | 'UI' | 'API'
      updatedAt: string
    } = {
      updatedAt: new Date().toISOString(),
    }

    if (data.priority) {
      updateValues.priority = data.priority
    }

    if (data.caseType) {
      updateValues.caseType = data.caseType
    }

    await db.update(tests).set(updateValues).where(inArray(tests.id, data.ids))

    await Promise.all(
      rows.map((test) => {
        const changes = [
          data.priority
            ? `priority from ${test.priority ?? 'Medium'} to ${data.priority}`
            : null,
          data.caseType
            ? `type from ${test.caseType ?? 'Functional'} to ${data.caseType}`
            : null,
        ].filter(Boolean)

        return logTestCaseActivity({
          db,
          testId: test.id,
          projectId: test.projectId,
          actor: user,
          action: 'metadata_updated',
          summary: `Updated ${changes.join(' and ')}.`,
        })
      }),
    )

    return { ok: true }
  })

export const bulkMoveTestCases = createServerFn({ method: 'POST' })
  .inputValidator(bulkMoveTestCasesInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const matchingSection = await db
      .select({
        id: sections.id,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.id, data.sectionId))
      .limit(1)

    const section = matchingSection[0]

    if (!section || !section.projectId) {
      throw new Error(
        'The target suite is missing or is not attached to a project.',
      )
    }

    const movingRows = await db
      .select({
        id: tests.id,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    await db
      .update(tests)
      .set({
        sectionId: section.id,
        projectId: section.projectId,
        updatedAt: new Date().toISOString(),
      })
      .where(inArray(tests.id, data.ids))

    await Promise.all(
      movingRows.map((test) =>
        logTestCaseActivity({
          db,
          testId: test.id,
          projectId: section.projectId,
          actor: user,
          action: 'moved',
          summary: `Moved from suite #${test.sectionId ?? '-'} to suite #${section.id}.`,
        }),
      ),
    )

    return { ok: true }
  })

export const moveAndReorderTestCases = createServerFn({ method: 'POST' })
  .inputValidator(moveAndReorderTestCasesInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const matchingSection = await db
      .select({
        id: sections.id,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.id, data.sectionId))
      .limit(1)

    const section = matchingSection[0]

    if (!section || !section.projectId) {
      throw new Error(
        'The target suite is missing or is not attached to a project.',
      )
    }

    const movingRows = await db
      .select({
        id: tests.id,
        sectionId: tests.sectionId,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    await db.transaction(async (tx) => {
      const now = new Date().toISOString()

      await tx
        .update(tests)
        .set({
          sectionId: section.id,
          projectId: section.projectId,
          updatedAt: now,
        })
        .where(inArray(tests.id, data.ids))

      for (const [index, testId] of data.orderedIds.entries()) {
        await tx
          .update(tests)
          .set({
            sortOrder: (index + 1) * 10,
            updatedAt: now,
          })
          .where(eq(tests.id, testId))
      }
    })

    await Promise.all(
      movingRows.map((test) =>
        logTestCaseActivity({
          db,
          testId: test.id,
          projectId: section.projectId,
          actor: user,
          action: 'moved',
          summary:
            test.sectionId === section.id
              ? `Reordered in suite #${section.id}.`
              : `Moved from suite #${test.sectionId ?? '-'} to suite #${section.id}.`,
        }),
      ),
    )

    return { ok: true }
  })

export const bulkRestoreTestCases = createServerFn({ method: 'POST' })
  .inputValidator(bulkRestoreTestCasesInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    const archivedRows = rows.filter((test) => test.status === 'Archived')

    if (archivedRows.length === 0) {
      throw new Error('No archived test cases were selected.')
    }

    await db.transaction(async (tx) => {
      const now = new Date().toISOString()

      for (const test of archivedRows) {
        await tx
          .update(tests)
          .set({
            status:
              test.archivedFromStatus === 'Ready'
                ? 'Ready'
                : test.archivedFromStatus === 'Draft'
                  ? 'Draft'
                  : 'Draft',
            archivedFromStatus: null,
            updatedAt: now,
          })
          .where(eq(tests.id, test.id))
      }
    })

    await Promise.all(
      archivedRows.map((test) =>
        logTestCaseActivity({
          db,
          testId: test.id,
          projectId: test.projectId,
          actor: user,
          action: 'restored',
          summary: `Restored to ${test.archivedFromStatus ?? 'Draft'}.`,
        }),
      ),
    )

    return { ok: true }
  })

export const bulkDeleteArchivedTestCases = createServerFn({ method: 'POST' })
  .inputValidator(bulkDeleteArchivedTestCasesInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
      })
      .from(tests)
      .where(inArray(tests.id, data.ids))

    const archivedRows = rows.filter((test) => test.status === 'Archived')

    if (archivedRows.length === 0) {
      throw new Error('No archived test cases were selected.')
    }

    const archivedIds = archivedRows.map((test) => test.id)
    const usedInRuns = await db
      .select({
        testId: testRunItems.testId,
      })
      .from(testRunItems)
      .where(inArray(testRunItems.testId, archivedIds))

    if (usedInRuns.length > 0) {
      throw new Error(
        'Some selected test cases are used in test runs and cannot be deleted permanently.',
      )
    }

    await db.delete(tests).where(inArray(tests.id, archivedIds))

    return { ok: true }
  })

export const archiveTestCase = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    await db
      .update(tests)
      .set({
        status: 'Archived',
        updatedAt: new Date().toISOString(),
        archivedFromStatus:
          test.status === 'Ready' || test.status === 'Draft'
            ? test.status
            : test.archivedFromStatus ?? 'Draft',
      })
      .where(eq(tests.id, data.id))

    await logTestCaseActivity({
      db,
      testId: test.id,
      projectId: test.projectId,
      actor: user,
      action: 'archived',
      summary: `Archived from ${test.status ?? 'Draft'}.`,
    })

    return { ok: true }
  })

export const restoreTestCase = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
        archivedFromStatus: tests.archivedFromStatus,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    await db
      .update(tests)
      .set({
        status:
          test.archivedFromStatus === 'Ready'
            ? 'Ready'
            : test.archivedFromStatus === 'Draft'
              ? 'Draft'
              : 'Draft',
        archivedFromStatus: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tests.id, data.id))

    await logTestCaseActivity({
      db,
      testId: test.id,
      projectId: test.projectId,
      actor: user,
      action: 'restored',
      summary: `Restored to ${test.archivedFromStatus ?? 'Draft'}.`,
    })

    return { ok: true }
  })

export const deleteArchivedTestCase = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const rows = await db
      .select({
        id: tests.id,
        status: tests.status,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    if (test.status !== 'Archived') {
      throw new Error('Only archived test cases can be deleted permanently.')
    }

    const runItemRows = await db
      .select({
        id: testRunItems.id,
      })
      .from(testRunItems)
      .where(eq(testRunItems.testId, data.id))
      .limit(1)

    if (runItemRows[0]) {
      throw new Error(
        'This test case is used in test runs and cannot be deleted permanently.',
      )
    }

    await db.delete(tests).where(eq(tests.id, data.id))

    return { ok: true }
  })

export const getCreateTestFormState = createServerFn({ method: 'POST' })
  .inputValidator(createTestFormInput)
  .handler(async ({ data }): Promise<CreateTestFormState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    if (!isDatabaseConfigured()) {
      return {
        databaseConfigured: false,
        sections: [],
      }
    }

    const db = getDb()
    const projectId = data.projectId
    await ensureProjectSlugs()
    const rows = projectId
      ? await db
          .select({
            id: sections.id,
            name: sections.name,
            projectId: sections.projectId,
          })
          .from(sections)
          .where(eq(sections.projectId, projectId))
          .orderBy(asc(sections.id))
      : await db
          .select({
            id: sections.id,
            name: sections.name,
            projectId: sections.projectId,
          })
          .from(sections)
          .orderBy(asc(sections.id))

    const projectRows = projectId
      ? await db
          .select({
            id: projects.id,
            name: projects.name,
            slug: projects.slug,
          })
          .from(projects)
          .where(eq(projects.id, projectId))
      : await db
          .select({
            id: projects.id,
            name: projects.name,
            slug: projects.slug,
          })
          .from(projects)

    const projectById = new Map(projectRows.map((project) => [project.id, project]))

    return {
      databaseConfigured: true,
      sections: rows.map((section) => ({
        ...section,
        projectName:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.name ?? null)
            : null,
        projectSlug:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.slug ?? null)
            : null,
      })),
    }
  })

export const createTestCase = createServerFn({ method: 'POST' })
  .inputValidator(createTestInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const now = new Date().toISOString()
    const matchingSection = await db
      .select({
        id: sections.id,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.id, data.sectionId))
      .limit(1)

    const section = matchingSection[0]

    if (!section || !section.projectId) {
      throw new Error(
        'The selected section is missing or is not attached to a project.',
      )
    }

    const result = await db.insert(tests).values({
      title: data.title,
      steps: data.steps,
      expected: data.expected,
      status: data.status,
      priority: data.priority,
      caseType: data.caseType,
      sectionId: data.sectionId,
      projectId: section.projectId,
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    const testId = result[0].insertId

    await logTestCaseActivity({
      db,
      testId,
      projectId: section.projectId,
      actor: user,
      action: 'created',
      summary: `Created in suite #${data.sectionId}.`,
      createdAt: now,
    })

    return {
      id: testId,
    }
  })

export const duplicateTestCase = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const now = new Date().toISOString()
    const rows = await db
      .select({
        id: tests.id,
        title: tests.title,
        steps: tests.steps,
        expected: tests.expected,
        status: tests.status,
        priority: tests.priority,
        caseType: tests.caseType,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
        sortOrder: tests.sortOrder,
        createdAt: tests.createdAt,
        updatedAt: tests.updatedAt,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const source = rows[0]

    if (!source || !source.sectionId || !source.projectId) {
      throw new Error('The source test case is missing or incomplete.')
    }

    const suiteRows = await db
      .select({
        id: tests.id,
      })
      .from(tests)
      .where(eq(tests.sectionId, source.sectionId))
      .orderBy(asc(tests.sortOrder), asc(tests.id))

    const sourceIndex = suiteRows.findIndex((test) => test.id === source.id)
    const result = await db.insert(tests).values({
      title: `Copy of ${source.title}`,
      steps: source.steps,
      expected: source.expected,
      status:
        source.status === 'Ready' || source.status === 'Draft'
          ? source.status
          : 'Draft',
      priority: source.priority ?? 'Medium',
      caseType: source.caseType ?? 'Functional',
      sectionId: source.sectionId,
      projectId: source.projectId,
      sortOrder: source.sortOrder ?? source.id,
      createdAt: now,
      updatedAt: now,
    })

    const duplicatedId = result[0].insertId
    const orderedIds = [
      ...suiteRows.slice(0, sourceIndex + 1).map((test) => test.id),
      duplicatedId,
      ...suiteRows.slice(sourceIndex + 1).map((test) => test.id),
    ]

    await db.transaction(async (tx) => {
      for (const [index, testId] of orderedIds.entries()) {
        await tx
          .update(tests)
          .set({
            sortOrder: (index + 1) * 10,
          })
          .where(eq(tests.id, testId))
      }
    })

    await logTestCaseActivity({
      db,
      testId: duplicatedId,
      projectId: source.projectId,
      actor: user,
      action: 'duplicated',
      summary: `Duplicated from case #${source.id}.`,
      createdAt: now,
    })

    return {
      id: duplicatedId,
    }
  })

export const getEditTestFormState = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<EditTestFormState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    if (!isDatabaseConfigured()) {
      throw new Error('Database is not configured.')
    }

    const db = getDb()
    await ensureProjectSlugs()
    const testRows = await db
      .select({
        id: tests.id,
        title: tests.title,
        steps: tests.steps,
        expected: tests.expected,
        status: tests.status,
        priority: tests.priority,
        caseType: tests.caseType,
        archivedFromStatus: tests.archivedFromStatus,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
        createdAt: tests.createdAt,
        updatedAt: tests.updatedAt,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = testRows[0]

    if (!test || test.sectionId === null) {
      throw notFound()
    }

    const sectionsRows = await db
      .select({
        id: sections.id,
        name: sections.name,
        projectId: sections.projectId,
      })
      .from(sections)
      .orderBy(asc(sections.id))

    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
      })
      .from(projects)

    const projectById = new Map(projectRows.map((project) => [project.id, project]))

    return {
      databaseConfigured: true,
      sections: sectionsRows.map((section) => ({
        ...section,
        projectName:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.name ?? null)
            : null,
        projectSlug:
          section.projectId !== null
            ? (projectById.get(section.projectId)?.slug ?? null)
            : null,
      })),
      test: {
        id: test.id,
        title: test.title,
        steps: test.steps ?? '',
        expected: test.expected ?? '',
        status:
          test.status === 'Ready'
            ? 'Ready'
            : test.status === 'Archived'
              ? 'Archived'
              : 'Draft',
        priority:
          test.priority === 'Low'
            ? 'Low'
            : test.priority === 'High'
              ? 'High'
              : test.priority === 'Critical'
                ? 'Critical'
                : 'Medium',
        caseType:
          test.caseType === 'Regression'
            ? 'Regression'
            : test.caseType === 'Smoke'
              ? 'Smoke'
              : test.caseType === 'E2E'
                ? 'E2E'
                : test.caseType === 'UI'
                  ? 'UI'
                  : test.caseType === 'API'
                    ? 'API'
                    : 'Functional',
        sectionId: test.sectionId,
        projectId: test.projectId,
      },
    }
  })

export const updateTestCase = createServerFn({ method: 'POST' })
  .inputValidator(updateTestInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    const existingRows = await db
      .select({
        id: tests.id,
        title: tests.title,
        status: tests.status,
        priority: tests.priority,
        caseType: tests.caseType,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)
    const existing = existingRows[0]
    const matchingSection = await db
      .select({
        id: sections.id,
        projectId: sections.projectId,
      })
      .from(sections)
      .where(eq(sections.id, data.sectionId))
      .limit(1)

    const section = matchingSection[0]

    if (!section || !section.projectId) {
      throw new Error(
        'The selected section is missing or is not attached to a project.',
      )
    }

    await db
      .update(tests)
      .set({
        title: data.title,
        steps: data.steps,
        expected: data.expected,
        status: data.status,
        priority: data.priority,
        caseType: data.caseType,
        sectionId: data.sectionId,
        projectId: section.projectId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(tests.id, data.id))

    if (existing) {
      const changes = [
        existing.title !== data.title ? 'title' : null,
        existing.status !== data.status ? 'status' : null,
        (existing.priority ?? 'Medium') !== data.priority ? 'priority' : null,
        (existing.caseType ?? 'Functional') !== data.caseType ? 'type' : null,
        existing.sectionId !== data.sectionId ? 'suite' : null,
        'content',
      ].filter(Boolean)

      await logTestCaseActivity({
        db,
        testId: existing.id,
        projectId: section.projectId,
        actor: user,
        action: 'updated',
        summary: `Updated ${changes.join(', ')}.`,
      })
    }

    return {
      id: data.id,
    }
  })

export const getTestDetail = createServerFn({ method: 'POST' })
  .inputValidator(getTestDetailInput)
  .handler(async ({ data }): Promise<TestDetail> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
    await ensureProjectSlugs()
    const rows = await db
      .select({
        id: tests.id,
        title: tests.title,
        steps: tests.steps,
        expected: tests.expected,
        status: tests.status,
        priority: tests.priority,
        caseType: tests.caseType,
        archivedFromStatus: tests.archivedFromStatus,
        sectionId: tests.sectionId,
        projectId: tests.projectId,
        createdAt: tests.createdAt,
        updatedAt: tests.updatedAt,
      })
      .from(tests)
      .where(eq(tests.id, data.id))
      .limit(1)

    const test = rows[0]

    if (!test) {
      throw notFound()
    }

    const sectionRows =
      test.sectionId === null
        ? []
        : await db
            .select({
              id: sections.id,
              name: sections.name,
              projectId: sections.projectId,
            })
            .from(sections)
            .where(eq(sections.id, test.sectionId))
            .limit(1)

    const section = sectionRows[0] ?? null

    const projectRows =
      test.projectId === null
        ? []
        : await db
            .select({
              id: projects.id,
              name: projects.name,
              slug: projects.slug,
            })
            .from(projects)
            .where(eq(projects.id, test.projectId))
            .limit(1)

    const project = projectRows[0] ?? null
    const projectSectionRows =
      test.projectId === null
        ? []
        : await db
            .select({
              id: sections.id,
              name: sections.name,
              projectId: sections.projectId,
            })
            .from(sections)
            .where(eq(sections.projectId, test.projectId))
            .orderBy(asc(sections.id))
    let activityRows: DashboardActivity[] = []

    try {
      const { getTestCaseActivities } = await import('./activity.server')
      activityRows = await getTestCaseActivities({
        db,
        testId: test.id,
        limit: 20,
      })
    } catch (error) {
      console.error('Failed to load test case activity', error)
    }

    return {
      ...test,
      sectionName: section?.name ?? null,
      projectName: project?.name ?? null,
      projectSlug: project?.slug ?? null,
      activities: activityRows,
      sections: projectSectionRows,
    }
  })
