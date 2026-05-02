import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let and: typeof import('drizzle-orm')['and']
let asc: typeof import('drizzle-orm')['asc']
let eq: typeof import('drizzle-orm')['eq']
let inArray: typeof import('drizzle-orm')['inArray']
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
  eq = drizzle.eq
  inArray = drizzle.inArray
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
  steps: string | null
  expected: string | null
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
        steps: tests.steps,
        expected: tests.expected,
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

    let activityRows: DashboardActivity[] = []

    try {
      const { getProjectTestCaseActivities } = await import('./activity.server')
      activityRows = await getProjectTestCaseActivities({
        db,
        projectId: selectedProjectId,
        limit: 200,
      })
    } catch (error) {
      console.error('Failed to load test case activity', error)
    }

    return {
      databaseConfigured: true,
      projects: projectRows,
      selectedProjectId,
      sections: sectionRows,
      tests: testRows,
      activities: activityRows,
    }
  })

export const updateTestStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateTestStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const user = await requireSessionUser()
    await ensureTestServerDeps()

    const db = getDb()
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

export const getCreateTestFormState = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CreateTestFormState> => {
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
    await ensureProjectSlugs()
    const rows = await db
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
  },
)

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
