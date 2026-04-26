import { asc, eq } from 'drizzle-orm'
import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDb, isDatabaseConfigured } from '../../db/client'
import { projects, testRunItems, testRuns, tests } from '../../db/schema'
import { ensureProjectSlugs } from '../projects/slug'

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
  status: z.enum(['Passed', 'Failed', 'Blocked']).nullable().optional(),
  comment: z.string().max(10_000).nullable().optional(),
})

const runItemCommentInput = z.object({
  runId: z.number().int().positive(),
  testId: z.number().int().positive(),
  comment: z.string().max(10_000),
})

type RunItemStatus = 'Passed' | 'Failed' | 'Blocked' | null

export type ProjectRun = {
  id: number
  projectId: number | null
  name: string
  projectSlug?: string | null
}

export type RunDetail = {
  run: ProjectRun & {
    projectName: string | null
  }
  tests: Array<{
    id: number
    title: string
    status: RunItemStatus
    comment: string | null
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
        })
        .from(tests)
        .where(eq(tests.projectId, data.projectId))
        .orderBy(asc(tests.id))

      if (projectTests.length > 0) {
        await tx.insert(testRunItems).values(
          projectTests.map((test) => ({
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
    await requireSessionUser()

    const db = getDb()
    await ensureProjectSlugs()
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
      })
      .from(testRunItems)
      .where(eq(testRunItems.runId, run.id))

    const runTests =
      runItemRows.length > 0
        ? runItemRows.map((row) => ({
            id: row.testId ?? row.id,
            title: row.testTitle ?? `Test ${row.testId ?? row.id}`,
            status:
              row.status === 'Passed' ||
              row.status === 'Failed' ||
              row.status === 'Blocked'
                ? row.status
                : null,
            comment: row.comment ?? null,
          }))
        : run.projectId === null
          ? []
          : await db
              .select({
                id: tests.id,
                title: tests.title,
              })
              .from(tests)
              .where(eq(tests.projectId, run.projectId))
              .orderBy(asc(tests.id))

    const fallbackRunTests =
      runItemRows.length > 0
        ? runTests
        : runTests.map((test) => ({
            ...test,
            status: null,
            comment: null,
          }))

    return {
      run: {
        ...run,
        projectName: project?.name ?? null,
        projectSlug: project?.slug ?? null,
      },
      tests: fallbackRunTests,
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
      const updatePayload: {
        status?: 'Passed' | 'Failed' | 'Blocked' | null
        comment?: string | null
      } = {}

      if (data.status !== undefined) {
        updatePayload.status = data.status ?? null
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
      })
    }

    return { ok: true }
  })

export const saveRunItemComment = createServerFn({ method: 'POST' })
  .inputValidator(runItemCommentInput)
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
