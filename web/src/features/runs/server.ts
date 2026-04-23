import { asc, eq } from 'drizzle-orm'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDb, isDatabaseConfigured } from '../../db/client'
import { projects, testRunItems, testRuns, tests } from '../../db/schema'

const runsForProjectInput = z.object({
  projectId: z.number().int().positive().optional(),
})

const createRunInput = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(1),
})

const getRunDetailInput = z.object({
  runId: z.number().int().positive(),
})

const executeRunTestInput = z.object({
  runId: z.number().int().positive(),
  testId: z.number().int().positive(),
  status: z.enum(['Passed', 'Failed']),
})

export type ProjectRun = {
  id: number
  projectId: number | null
  name: string
}

export type RunDetail = {
  run: ProjectRun & {
    projectName: string | null
  }
  tests: Array<{
    id: number
    title: string
    status: 'Passed' | 'Failed' | null
  }>
}

export const getRunsForProject = createServerFn({ method: 'POST' })
  .inputValidator(runsForProjectInput)
  .handler(async ({ data }): Promise<{ runs: ProjectRun[] }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    if (!isDatabaseConfigured() || !data.projectId) {
      return { runs: [] }
    }

    const db = getDb()
    const rows = await db
      .select({
        id: testRuns.id,
        projectId: testRuns.projectId,
        name: testRuns.name,
      })
      .from(testRuns)
      .where(eq(testRuns.projectId, data.projectId))
      .orderBy(asc(testRuns.id))

    return {
      runs: rows,
    }
  })

export const createRun = createServerFn({ method: 'POST' })
  .inputValidator(createRunInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const result = await db.insert(testRuns).values({
      projectId: data.projectId,
      name: data.name,
    })

    return {
      id: result[0].insertId,
    }
  })

export const getRunDetail = createServerFn({ method: 'POST' })
  .inputValidator(getRunDetailInput)
  .handler(async ({ data }): Promise<RunDetail> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const runRows = await db
      .select({
        id: testRuns.id,
        projectId: testRuns.projectId,
        name: testRuns.name,
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
            })
            .from(projects)
            .where(eq(projects.id, run.projectId))
            .limit(1)

    const project = projectRows[0] ?? null

    const runTests =
      run.projectId === null
        ? []
        : await db
            .select({
              id: tests.id,
              title: tests.title,
            })
            .from(tests)
            .where(eq(tests.projectId, run.projectId))
            .orderBy(asc(tests.id))

    const runItemRows = await db
      .select({
        testId: testRunItems.testId,
        status: testRunItems.status,
      })
      .from(testRunItems)
      .where(eq(testRunItems.runId, run.id))

    const statusByTestId = new Map<number, 'Passed' | 'Failed'>()

    for (const row of runItemRows) {
      if (
        typeof row.testId === 'number' &&
        (row.status === 'Passed' || row.status === 'Failed')
      ) {
        statusByTestId.set(row.testId, row.status)
      }
    }

    return {
      run: {
        ...run,
        projectName: project?.name ?? null,
      },
      tests: runTests.map((test) => ({
        ...test,
        status: statusByTestId.get(test.id) ?? null,
      })),
    }
  })

export const executeRunTest = createServerFn({ method: 'POST' })
  .inputValidator(executeRunTestInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

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
      await db
        .update(testRunItems)
        .set({
          status: data.status,
        })
        .where(eq(testRunItems.id, existingRow.id))
    } else {
      await db.insert(testRunItems).values({
        runId: data.runId,
        testId: data.testId,
        status: data.status,
      })
    }

    return { ok: true }
  })
