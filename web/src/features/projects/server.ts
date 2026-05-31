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
let ensureProjectSlugs: typeof import('./slug')['ensureProjectSlugs']
let ensureUniqueProjectSlug: typeof import('./slug')['ensureUniqueProjectSlug']

async function ensureProjectServerDeps(): Promise<void> {
  if (typeof getDb !== 'undefined') {
    return
  }

  const [drizzle, dbClient, schema, slug] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/client'),
    import('../../db/schema'),
    import('./slug'),
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
  ensureUniqueProjectSlug = slug.ensureUniqueProjectSlug
}

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

const updateProjectStatusInput = z.object({
  projectId: z.number().int().positive(),
})

export type ProjectsDashboardState = {
  databaseConfigured: boolean
  projects: Array<{
    id: number
    name: string
    slug: string | null
    status: string | null
  }>
}

export const listProjects = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ProjectsDashboardState> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureProjectServerDeps()

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
        status: projects.status,
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
    await ensureProjectServerDeps()

    const db = getDb()
    const slug = await ensureUniqueProjectSlug(data.name)
    const result = await db.insert(projects).values({
      name: data.name,
      slug,
      status: 'Active',
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
    await ensureProjectServerDeps()

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
    await ensureProjectServerDeps()

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
    await ensureProjectServerDeps()

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

export const archiveProject = createServerFn({ method: 'POST' })
  .inputValidator(updateProjectStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureProjectServerDeps()

    const db = getDb()
    await db
      .update(projects)
      .set({
        status: 'Archived',
      })
      .where(eq(projects.id, data.projectId))

    return {
      ok: true,
    }
  })

export const restoreProject = createServerFn({ method: 'POST' })
  .inputValidator(updateProjectStatusInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureProjectServerDeps()

    const db = getDb()
    await db
      .update(projects)
      .set({
        status: 'Active',
      })
      .where(eq(projects.id, data.projectId))

    return {
      ok: true,
    }
  })

export const deleteProject = createServerFn({ method: 'POST' })
  .inputValidator(deleteProjectInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()
    await ensureProjectServerDeps()

    const db = getDb()

    const projectRow = await db
      .select({
        id: projects.id,
        status: projects.status,
      })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1)

    if (projectRow.length === 0) {
      throw new Error('Project not found.')
    }

    if (projectRow[0].status !== 'Archived') {
      throw new Error(
        'Project must be archived before it can be deleted permanently.',
      )
    }

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
