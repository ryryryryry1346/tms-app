import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let asc: typeof import('drizzle-orm')['asc']
let eq: typeof import('drizzle-orm')['eq']
let inArray: typeof import('drizzle-orm')['inArray']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let projects: typeof import('../../db/schema')['projects']
let sections: typeof import('../../db/schema')['sections']
let testRunItems: typeof import('../../db/schema')['testRunItems']
let testRuns: typeof import('../../db/schema')['testRuns']
let tests: typeof import('../../db/schema')['tests']
let ensureProjectSlugs: typeof import('../projects/slug')['ensureProjectSlugs']

async function ensureRunServerDeps(): Promise<void> {
  if (getDb) {
    return
  }

  const [drizzle, dbClient, schema, slug] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/client'),
    import('../../db/schema'),
    import('../projects/slug'),
  ])

  asc = drizzle.asc
  eq = drizzle.eq
  inArray = drizzle.inArray
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  projects = schema.projects
  sections = schema.sections
  testRunItems = schema.testRunItems
  testRuns = schema.testRuns
  tests = schema.tests
  ensureProjectSlugs = slug.ensureProjectSlugs
}

const runsForProjectInput = z.object({
  projectId: z.number().int().positive().optional(),
})

const createRunInput = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(1),
  testIds: z.array(z.number().int().positive()).optional(),
})

const updateRunNameInput = z.object({
  runId: z.number().int().positive(),
  name: z.string().trim().min(1),
})

const updateRunStatusInput = z.object({
  runId: z.number().int().positive(),
  status: z.enum(['In progress', 'Completed', 'Closed']),
})

const getRunDetailInput = z.object({
  runId: z.number().int().positive(),
})

const caseHistoryInput = z.object({
  testId: z.number().int().positive(),
})

const executeRunTestInput = z.object({
  runId: z.number().int().positive(),
  testId: z.number().int().positive(),
  status: z.enum(['Passed', 'Failed', 'Blocked']).nullable().optional(),
  comment: z.string().max(10_000).nullable().optional(),
})

const runItemCommentInput = z.object({
  runId: z.number().int().positive(),
  testId: z.number().int().positive(),
  comment: z.string().max(10_000),
})

type RunItemStatus = 'Passed' | 'Failed' | 'Blocked' | null
type RunStatus = 'In progress' | 'Completed' | 'Closed'

function normalizeRunStatus(value: string | null | undefined): RunStatus {
  return value === 'Completed' || value === 'Closed' ? value : 'In progress'
}

export type ProjectRun = {
  id: number
  projectId: number | null
  name: string
  projectSlug?: string | null
  total: number
  passed: number
  failed: number
  blocked: number
  notRun: number
}

export type RunDetail = {
  run: ProjectRun & {
    projectName: string | null
    status: RunStatus
  }
  tests: Array<{
    id: number
    title: string
    status: RunItemStatus
    comment: string | null
    suiteName: string | null
    priority: string | null
    caseType: string | null
    steps: string | null
    expected: string | null
    executedBy: string | null
    executedAt: string | null
  }>
  currentUser: {
    id: string
    name: string
  }
}

export type CaseExecutionHistoryEntry = {
  runId: number
  runName: string
  status: Exclude<RunItemStatus, null>
  executedBy: string | null
  executedAt: string | null
  comment: string | null
}

export const getRunsForProject = createServerFn({ method: 'POST' })
  .inputValidator(runsForProjectInput)
  .handler(async ({ data }): Promise<{ runs: ProjectRun[] }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureRunServerDeps()

    if (!isDatabaseConfigured() || !data.projectId) {
      return { runs: [] }
    }

    const db = getDb()
    await ensureProjectSlugs()
    const rows = await db
      .select({
        id: testRuns.id,
        projectId: testRuns.projectId,
        name: testRuns.name,
        projectSlug: projects.slug,
      })
      .from(testRuns)
      .leftJoin(projects, eq(projects.id, testRuns.projectId))
      .where(eq(testRuns.projectId, data.projectId))
      .orderBy(asc(testRuns.id))

    const runIds = rows.map((run) => run.id)
    const runItemRows =
      runIds.length === 0
        ? []
        : await db
            .select({
              runId: testRunItems.runId,
              status: testRunItems.status,
            })
            .from(testRunItems)
            .where(inArray(testRunItems.runId, runIds))

    const countsByRunId = new Map<
      number,
      Pick<ProjectRun, 'total' | 'passed' | 'failed' | 'blocked' | 'notRun'>
    >()

    for (const run of rows) {
      countsByRunId.set(run.id, {
        total: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        notRun: 0,
      })
    }

    for (const item of runItemRows) {
      if (item.runId === null) {
        continue
      }

      const counts = countsByRunId.get(item.runId)

      if (!counts) {
        continue
      }

      counts.total += 1

      if (item.status === 'Passed') {
        counts.passed += 1
      } else if (item.status === 'Failed') {
        counts.failed += 1
      } else if (item.status === 'Blocked') {
        counts.blocked += 1
      } else {
        counts.notRun += 1
      }
    }

    return {
      runs: rows.map((run) => ({
        ...run,
        ...(countsByRunId.get(run.id) ?? {
          total: 0,
          passed: 0,
          failed: 0,
          blocked: 0,
          notRun: 0,
        }),
      })),
    }
  })

export const createRun = createServerFn({ method: 'POST' })
  .inputValidator(createRunInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureRunServerDeps()

    const db = getDb()
    const result = await db.transaction(async (tx) => {
      const insertedRun = await tx.insert(testRuns).values({
        projectId: data.projectId,
        name: data.name,
      })

      const runId = insertedRun[0].insertId
      const projectTests = await tx
        .select({
          id: tests.id,
          title: tests.title,
          status: tests.status,
        })
        .from(tests)
        .where(eq(tests.projectId, data.projectId))
        .orderBy(asc(tests.id))
      const selectedTestIdSet =
        data.testIds && data.testIds.length > 0 ? new Set(data.testIds) : null
      const executableTests = projectTests.filter(
        (test) =>
          test.status !== 'Archived' &&
          (selectedTestIdSet === null || selectedTestIdSet.has(test.id)),
      )

      if (executableTests.length === 0) {
        throw new Error('Choose at least one active test case for this run.')
      }

      if (executableTests.length > 0) {
        await tx.insert(testRunItems).values(
          executableTests.map((test) => ({
            runId,
            testId: test.id,
            testTitle: test.title,
            status: null,
          })),
        )
      }

      return insertedRun
    })

    return {
      id: result[0].insertId,
    }
  })

export const getRunDetail = createServerFn({ method: 'POST' })
  .inputValidator(getRunDetailInput)
  .handler(async ({ data }): Promise<RunDetail> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const sessionUser = await requireSessionUser()
    await ensureRunServerDeps()

    const db = getDb()
    await ensureProjectSlugs()
    const runRows = await db
      .select({
        id: testRuns.id,
        projectId: testRuns.projectId,
        name: testRuns.name,
        status: testRuns.status,
      })
      .from(testRuns)
      .where(eq(testRuns.id, data.runId))
      .limit(1)

    const run = runRows[0]

    if (!run) {
      throw notFound()
    }

    const projectRows =
      run.projectId === null
        ? []
        : await db
            .select({
              id: projects.id,
              name: projects.name,
              slug: projects.slug,
            })
            .from(projects)
            .where(eq(projects.id, run.projectId))
            .limit(1)

    const project = projectRows[0] ?? null

    const runItemRows = await db
      .select({
        id: testRunItems.id,
        testId: testRunItems.testId,
        testTitle: testRunItems.testTitle,
        status: testRunItems.status,
        comment: testRunItems.comment,
        executedByName: testRunItems.executedByName,
        executedAt: testRunItems.executedAt,
        title: tests.title,
        suiteName: sections.name,
        priority: tests.priority,
        caseType: tests.caseType,
        steps: tests.steps,
        expected: tests.expected,
      })
      .from(testRunItems)
      .leftJoin(tests, eq(testRunItems.testId, tests.id))
      .leftJoin(sections, eq(tests.sectionId, sections.id))
      .where(eq(testRunItems.runId, run.id))

    const runTests =
      runItemRows.length > 0
        ? runItemRows.map((row) => ({
            id: row.testId ?? row.id,
            title: row.testTitle ?? row.title ?? `Test ${row.testId ?? row.id}`,
            status:
              row.status === 'Passed' ||
              row.status === 'Failed' ||
              row.status === 'Blocked'
                ? row.status
                : null,
            comment: row.comment ?? null,
            suiteName: row.suiteName ?? null,
            priority: row.priority ?? null,
            caseType: row.caseType ?? null,
            steps: row.steps ?? null,
            expected: row.expected ?? null,
            executedBy: row.executedByName ?? null,
            executedAt: row.executedAt ?? null,
          }))
        : run.projectId === null
          ? []
          : await db
              .select({
                id: tests.id,
                title: tests.title,
                suiteName: sections.name,
                priority: tests.priority,
                caseType: tests.caseType,
                steps: tests.steps,
                expected: tests.expected,
              })
              .from(tests)
              .leftJoin(sections, eq(tests.sectionId, sections.id))
              .where(eq(tests.projectId, run.projectId))
              .orderBy(asc(tests.id))

    const fallbackRunTests =
      runItemRows.length > 0
        ? runTests
        : runTests.map((test) => ({
            ...test,
            status: null,
            comment: null,
            suiteName: test.suiteName ?? null,
            priority: test.priority ?? null,
            caseType: test.caseType ?? null,
            steps: test.steps ?? null,
            expected: test.expected ?? null,
            executedBy: null,
            executedAt: null,
          }))
    const passed = fallbackRunTests.filter((test) => test.status === 'Passed').length
    const failed = fallbackRunTests.filter((test) => test.status === 'Failed').length
    const blocked = fallbackRunTests.filter((test) => test.status === 'Blocked').length
    const notRun = fallbackRunTests.filter((test) => test.status === null).length

    return {
      run: {
        ...run,
        projectName: project?.name ?? null,
        projectSlug: project?.slug ?? null,
        status: normalizeRunStatus(run.status),
        total: fallbackRunTests.length,
        passed,
        failed,
        blocked,
        notRun,
      },
      tests: fallbackRunTests,
      currentUser: {
        id: sessionUser.id,
        name: sessionUser.displayName,
      },
    }
  })

export const getCaseExecutionHistory = createServerFn({ method: 'POST' })
  .inputValidator(caseHistoryInput)
  .handler(
    async ({
      data,
    }): Promise<{ entries: CaseExecutionHistoryEntry[] }> => {
      const { requireSessionUser } = await import('../auth/helpers.server')
      await requireSessionUser()
      await ensureRunServerDeps()

      const db = getDb()
      const rows = await db
        .select({
          runId: testRunItems.runId,
          runName: testRuns.name,
          status: testRunItems.status,
          executedByName: testRunItems.executedByName,
          executedAt: testRunItems.executedAt,
          comment: testRunItems.comment,
        })
        .from(testRunItems)
        .leftJoin(testRuns, eq(testRunItems.runId, testRuns.id))
        .where(eq(testRunItems.testId, data.testId))

      const entries: CaseExecutionHistoryEntry[] = rows
        .filter(
          (row) =>
            row.status === 'Passed' ||
            row.status === 'Failed' ||
            row.status === 'Blocked',
        )
        .map((row) => ({
          runId: row.runId ?? 0,
          runName: row.runName ?? `Run #${row.runId ?? '?'}`,
          status: row.status as Exclude<RunItemStatus, null>,
          executedBy: row.executedByName ?? null,
          executedAt: row.executedAt ?? null,
          comment: row.comment ?? null,
        }))
        .sort((a, b) => {
          const at = a.executedAt ? Date.parse(a.executedAt) : 0
          const bt = b.executedAt ? Date.parse(b.executedAt) : 0

          if (bt !== at) {
            return bt - at
          }

          return b.runId - a.runId
        })

      return { entries }
    },
  )

export const updateRunName = createServerFn({ method: 'POST' })
  .inputValidator(updateRunNameInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureRunServerDeps()

    const db = getDb()
    const existingRun = await db
      .select({
        id: testRuns.id,
      })
      .from(testRuns)
      .where(eq(testRuns.id, data.runId))
      .limit(1)

    if (existingRun.length === 0) {
      throw notFound()
    }

    await db
      .update(testRuns)
      .set({
        name: data.name,
      })
      .where(eq(testRuns.id, data.runId))

    return { ok: true }
  })

export const updateRunStatus = createServerFn({ method: 'POST' })
  .inputValidator(updateRunStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureRunServerDeps()

    const db = getDb()
    const existingRun = await db
      .select({
        id: testRuns.id,
      })
      .from(testRuns)
      .where(eq(testRuns.id, data.runId))
      .limit(1)

    if (existingRun.length === 0) {
      throw notFound()
    }

    await db
      .update(testRuns)
      .set({
        status: data.status,
      })
      .where(eq(testRuns.id, data.runId))

    return { ok: true }
  })

export const executeRunTest = createServerFn({ method: 'POST' })
  .inputValidator(executeRunTestInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const sessionUser = await requireSessionUser()
    await ensureRunServerDeps()

    const db = getDb()
    const runRows = await db
      .select({
        id: testRuns.id,
        projectId: testRuns.projectId,
      })
      .from(testRuns)
      .where(eq(testRuns.id, data.runId))
      .limit(1)

    const run = runRows[0]

    if (!run) {
      throw notFound()
    }

    const testRows = await db
      .select({
        id: tests.id,
        projectId: tests.projectId,
      })
      .from(tests)
      .where(eq(tests.id, data.testId))
      .limit(1)

    const test = testRows[0]

    if (!test) {
      throw notFound()
    }

    if (run.projectId !== test.projectId) {
      throw new Error('Test does not belong to this run project.')
    }

    const existingRows = await db
      .select({
        id: testRunItems.id,
        testId: testRunItems.testId,
      })
      .from(testRunItems)
      .where(eq(testRunItems.runId, data.runId))

    const existingRow = existingRows.find((row) => row.testId === data.testId)

    if (existingRow) {
      const updatePayload: {
        status?: 'Passed' | 'Failed' | 'Blocked' | null
        comment?: string | null
        executedById?: string | null
        executedByName?: string | null
        executedAt?: string | null
      } = {}

      if (data.status !== undefined) {
        updatePayload.status = data.status ?? null

        if (data.status) {
          updatePayload.executedById = sessionUser.id
          updatePayload.executedByName = sessionUser.displayName
          updatePayload.executedAt = new Date().toISOString()
        } else {
          updatePayload.executedById = null
          updatePayload.executedByName = null
          updatePayload.executedAt = null
        }
      }

      if (data.comment !== undefined) {
        updatePayload.comment = data.comment ?? null
      }

      await db
        .update(testRunItems)
        .set(updatePayload)
        .where(eq(testRunItems.id, existingRow.id))
    } else {
      const testTitleRows = await db
        .select({
          title: tests.title,
        })
        .from(tests)
        .where(eq(tests.id, data.testId))
        .limit(1)

      await db.insert(testRunItems).values({
        runId: data.runId,
        testId: data.testId,
        testTitle: testTitleRows[0]?.title ?? null,
        status: data.status ?? null,
        comment: data.comment ?? null,
        executedById: data.status ? sessionUser.id : null,
        executedByName: data.status ? sessionUser.displayName : null,
        executedAt: data.status ? new Date().toISOString() : null,
      })
    }

    return { ok: true }
  })

export const saveRunItemComment = createServerFn({ method: 'POST' })
  .inputValidator(runItemCommentInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureRunServerDeps()

    const db = getDb()
    const runRows = await db
      .select({
        id: testRuns.id,
        projectId: testRuns.projectId,
      })
      .from(testRuns)
      .where(eq(testRuns.id, data.runId))
      .limit(1)

    const run = runRows[0]

    if (!run) {
      throw notFound()
    }

    const testRows = await db
      .select({
        id: tests.id,
        projectId: tests.projectId,
        title: tests.title,
      })
      .from(tests)
      .where(eq(tests.id, data.testId))
      .limit(1)

    const test = testRows[0]

    if (!test) {
      throw notFound()
    }

    if (run.projectId !== test.projectId) {
      throw new Error('Test does not belong to this run project.')
    }

    const existingRows = await db
      .select({
        id: testRunItems.id,
        testId: testRunItems.testId,
        status: testRunItems.status,
      })
      .from(testRunItems)
      .where(eq(testRunItems.runId, data.runId))

    const existingRow = existingRows.find((row) => row.testId === data.testId)

    if (existingRow) {
      await db
        .update(testRunItems)
        .set({
          comment: data.comment,
        })
        .where(eq(testRunItems.id, existingRow.id))
    } else {
      await db.insert(testRunItems).values({
        runId: data.runId,
        testId: data.testId,
        testTitle: test.title,
        status:
          existingRow?.status === 'Passed' ||
          existingRow?.status === 'Failed' ||
          existingRow?.status === 'Blocked'
            ? existingRow.status
            : null,
        comment: data.comment,
      })
    }

    return { ok: true }
  })
