import { asc } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDb, isDatabaseConfigured } from '../../db/client'
import { projects, sections } from '../../db/schema'

const createProjectInput = z.object({
  name: z.string().trim().min(1),
})

const createSuiteInput = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(1),
})

export type ProjectsDashboardState = {
  databaseConfigured: boolean
  projects: Array<{
    id: number
    name: string
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

    const db = getDb()
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
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
    const result = await db.insert(projects).values({
      name: data.name,
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
