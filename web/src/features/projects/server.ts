import { asc, eq, inArray } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDb, isDatabaseConfigured } from '../../db/client'
import {
  projects,
  sections,
  testRunItems,
  testRuns,
  tests,
} from '../../db/schema'
import { ensureProjectSlugs, ensureUniqueProjectSlug } from './slug'

const createProjectInput = z.object({
  name: z.string().trim().min(1),
})

const createSuiteInput = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(1),
})

const updateSuiteInput = z.object({
  suiteId: z.number().int().positive(),
  name: z.string().trim().min(1),
})

const deleteSuiteInput = z.object({
  suiteId: z.number().int().positive(),
})

const deleteProjectInput = z.object({
  projectId: z.number().int().positive(),
})

export type ProjectsDashboardState = {
  databaseConfigured: boolean
  projects: Array<{
    id: number
    name: string
    slug: string | null
  }>
}

export const listProjects = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ProjectsDashboardState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    if (!isDatabaseConfigured()) {
      return {
        databaseConfigured: false,
        projects: [],
      }
    }

    await ensureProjectSlugs()

    const db = getDb()
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
      })
      .from(projects)
      .orderBy(asc(projects.id))

    return {
      databaseConfigured: true,
      projects: rows,
    }
  },
)

export const createProject = createServerFn({ method: 'POST' })
  .inputValidator(createProjectInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const slug = await ensureUniqueProjectSlug(data.name)
    const result = await db.insert(projects).values({
      name: data.name,
      slug,
    })

    return {
      id: result[0].insertId,
    }
  })

export const createSuite = createServerFn({ method: 'POST' })
  .inputValidator(createSuiteInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const result = await db.insert(sections).values({
      projectId: data.projectId,
      name: data.name,
    })

    return {
      id: result[0].insertId,
    }
  })

export const updateSuite = createServerFn({ method: 'POST' })
  .inputValidator(updateSuiteInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    await db
      .update(sections)
      .set({
        name: data.name,
      })
      .where(eq(sections.id, data.suiteId))

    return {
      ok: true,
    }
  })

export const deleteSuite = createServerFn({ method: 'POST' })
  .inputValidator(deleteSuiteInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()
    const linkedTests = await db
      .select({
        id: tests.id,
      })
      .from(tests)
      .where(eq(tests.sectionId, data.suiteId))
      .limit(1)

    if (linkedTests.length > 0) {
      throw new Error(
        'This suite still contains test cases. Move or delete them before removing the suite.',
      )
    }

    await db.delete(sections).where(eq(sections.id, data.suiteId))

    return {
      ok: true,
    }
  })

export const deleteProject = createServerFn({ method: 'POST' })
  .inputValidator(deleteProjectInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const db = getDb()

    const runRows = await db
      .select({
        id: testRuns.id,
      })
      .from(testRuns)
      .where(eq(testRuns.projectId, data.projectId))

    const testRows = await db
      .select({
        id: tests.id,
      })
      .from(tests)
      .where(eq(tests.projectId, data.projectId))

    const runIds = runRows.map((row) => row.id)
    const testIds = testRows.map((row) => row.id)

    await db.transaction(async (tx) => {
      if (runIds.length > 0) {
        await tx
          .delete(testRunItems)
          .where(inArray(testRunItems.runId, runIds))
      }

      if (testIds.length > 0) {
        await tx.delete(tests).where(inArray(tests.id, testIds))
      }

      if (runIds.length > 0) {
        await tx.delete(testRuns).where(inArray(testRuns.id, runIds))
      }

      await tx.delete(sections).where(eq(sections.projectId, data.projectId))
      await tx.delete(projects).where(eq(projects.id, data.projectId))
    })

    return {
      ok: true,
    }
  })
