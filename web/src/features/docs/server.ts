import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let desc: typeof import('drizzle-orm')['desc']
let eq: typeof import('drizzle-orm')['eq']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let projectDocs: typeof import('../../db/schema')['projectDocs']
let projects: typeof import('../../db/schema')['projects']

async function ensureDocsServerDeps(): Promise<void> {
  if (typeof getDb !== 'undefined') {
    return
  }

  const [drizzle, dbClient, schema] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/client'),
    import('../../db/schema'),
  ])

  desc = drizzle.desc
  eq = drizzle.eq
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  projectDocs = schema.projectDocs
  projects = schema.projects
}

async function resolveDocProjectId(docId: number): Promise<number> {
  const rows = await getDb()
    .select({ projectId: projectDocs.projectId })
    .from(projectDocs)
    .where(eq(projectDocs.id, docId))
    .limit(1)

  const projectId = rows[0]?.projectId

  if (!projectId) {
    throw notFound()
  }

  return projectId
}

const projectDocsInput = z.object({
  projectId: z.number().int().positive(),
})

const projectDocInput = z.object({
  docId: z.number().int().positive(),
})

const projectDocDetailInput = z.object({
  projectSlug: z.string().trim().min(1),
  docId: z.number().int().positive(),
})

const createProjectDocInput = z.object({
  projectId: z.number().int().positive(),
  title: z.string().trim().min(1).max(240),
  category: z.string().trim().max(128).optional(),
  content: z.string().max(65_000).optional(),
})

const updateProjectDocInput = z.object({
  docId: z.number().int().positive(),
  title: z.string().trim().min(1).max(240),
  category: z.string().trim().max(128).optional(),
  content: z.string().max(65_000).optional(),
})

const deleteProjectDocInput = z.object({
  docId: z.number().int().positive(),
})

export type ProjectDoc = {
  id: number
  projectId: number
  title: string
  category: string | null
  content: string | null
  status: string
  createdAt: string | null
  updatedAt: string | null
}

export type ProjectDocProject = {
  id: number
  name: string
  slug: string | null
  status: string | null
}

function nowIso(): string {
  return new Date().toISOString()
}

export const getProjectDocs = createServerFn({ method: 'POST' })
  .inputValidator(projectDocsInput)
  .handler(async ({ data }): Promise<{ docs: ProjectDoc[] }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    if (!isDatabaseConfigured()) {
      return { docs: [] }
    }

    await requireProjectAccess(data.projectId, 'viewer')

    const db = getDb()
    const docs = await db
      .select()
      .from(projectDocs)
      .where(eq(projectDocs.projectId, data.projectId))
      .orderBy(desc(projectDocs.updatedAt), desc(projectDocs.id))

    return {
      docs: docs.filter((doc) => doc.status !== 'Archived') as ProjectDoc[],
    }
  })

export const getProjectDoc = createServerFn({ method: 'POST' })
  .inputValidator(projectDocInput)
  .handler(async ({ data }): Promise<{ doc: ProjectDoc }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    const projectId = await resolveDocProjectId(data.docId)
    await requireProjectAccess(projectId, 'viewer')

    const db = getDb()
    const rows = await db
      .select()
      .from(projectDocs)
      .where(eq(projectDocs.id, data.docId))
      .limit(1)

    const doc = rows[0] as ProjectDoc | undefined

    if (!doc || doc.status === 'Archived') {
      throw notFound()
    }

    return { doc }
  })

export const getProjectDocDetail = createServerFn({ method: 'POST' })
  .inputValidator(projectDocDetailInput)
  .handler(
    async ({
      data,
    }): Promise<{ project: ProjectDocProject; doc: ProjectDoc }> => {
      const { requireProjectAccess } = await import(
        '../auth/project-access.server'
      )
      await ensureDocsServerDeps()

      const db = getDb()
      const numericProjectId = Number(data.projectSlug)
      const projectRows = await db
        .select()
        .from(projects)
        .where(
          Number.isInteger(numericProjectId) && numericProjectId > 0
            ? eq(projects.id, numericProjectId)
            : eq(projects.slug, data.projectSlug),
        )
        .limit(1)

      const project = projectRows[0] as ProjectDocProject | undefined

      if (!project) {
        throw notFound()
      }

      await requireProjectAccess(project.id, 'viewer')

      const docRows = await db
        .select()
        .from(projectDocs)
        .where(eq(projectDocs.id, data.docId))
        .limit(1)

      const doc = docRows[0] as ProjectDoc | undefined

      if (!doc || doc.status === 'Archived' || doc.projectId !== project.id) {
        throw notFound()
      }

      return { project, doc }
    },
  )

export const createProjectDoc = createServerFn({ method: 'POST' })
  .inputValidator(createProjectDocInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()
    await requireProjectAccess(data.projectId, 'editor')

    const db = getDb()
    const projectRows = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1)

    if (!projectRows[0]) {
      throw notFound()
    }

    const timestamp = nowIso()
    const inserted = await db.insert(projectDocs).values({
      projectId: data.projectId,
      title: data.title,
      category: data.category || 'General',
      content: data.content ?? '',
      status: 'Published',
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    return {
      id: inserted[0].insertId,
    }
  })

export const updateProjectDoc = createServerFn({ method: 'POST' })
  .inputValidator(updateProjectDocInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    const projectId = await resolveDocProjectId(data.docId)
    await requireProjectAccess(projectId, 'editor')

    const db = getDb()
    await db
      .update(projectDocs)
      .set({
        title: data.title,
        category: data.category || 'General',
        content: data.content ?? '',
        updatedAt: nowIso(),
      })
      .where(eq(projectDocs.id, data.docId))

    return { ok: true }
  })

export const deleteProjectDoc = createServerFn({ method: 'POST' })
  .inputValidator(deleteProjectDocInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    const projectId = await resolveDocProjectId(data.docId)
    await requireProjectAccess(projectId, 'editor')

    const db = getDb()
    await db.delete(projectDocs).where(eq(projectDocs.id, data.docId))

    return { ok: true }
  })
