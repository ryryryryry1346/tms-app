import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  DOC_CATEGORY_COLORS,
  DOC_CATEGORY_ICONS,
  GENERAL_DOC_CATEGORY,
  planCategorySeed,
} from '../../lib/docCategories'

let and: typeof import('drizzle-orm')['and']
let asc: typeof import('drizzle-orm')['asc']
let desc: typeof import('drizzle-orm')['desc']
let eq: typeof import('drizzle-orm')['eq']
let inArray: typeof import('drizzle-orm')['inArray']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let comments: typeof import('../../db/schema')['comments']
let docCategories: typeof import('../../db/schema')['docCategories']
let projectDocs: typeof import('../../db/schema')['projectDocs']
let projects: typeof import('../../db/schema')['projects']
let user: typeof import('../../db/schema')['user']

async function ensureDocsServerDeps(): Promise<void> {
  if (typeof getDb !== 'undefined') {
    return
  }

  const [drizzle, dbClient, schema] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/client'),
    import('../../db/schema'),
  ])

  and = drizzle.and
  asc = drizzle.asc
  desc = drizzle.desc
  eq = drizzle.eq
  inArray = drizzle.inArray
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  comments = schema.comments
  docCategories = schema.docCategories
  projectDocs = schema.projectDocs
  projects = schema.projects
  user = schema.user
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

const setDocPinnedInput = z.object({
  docId: z.number().int().positive(),
  pinned: z.boolean(),
})

const categoryNameSchema = z.string().trim().min(1).max(40)

const createDocCategoryInput = z.object({
  projectId: z.number().int().positive(),
  name: categoryNameSchema,
  color: z.enum(DOC_CATEGORY_COLORS),
  icon: z.enum(DOC_CATEGORY_ICONS),
})

const updateDocCategoryInput = z.object({
  categoryId: z.number().int().positive(),
  name: categoryNameSchema.optional(),
  color: z.enum(DOC_CATEGORY_COLORS).optional(),
  icon: z.enum(DOC_CATEGORY_ICONS).optional(),
})

const deleteDocCategoryInput = z.object({
  categoryId: z.number().int().positive(),
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
  /** When the doc was pinned for the whole project; null if not pinned. */
  pinnedAt: string | null
  createdBy: string | null
  updatedBy: string | null
  createdByName: string | null
  updatedByName: string | null
}

export type ProjectDocProject = {
  id: number
  name: string
  slug: string | null
  status: string | null
}

export type DocCategory = {
  id: number
  name: string
  color: string
  icon: string
  position: number
}

function nowIso(): string {
  return new Date().toISOString()
}

async function withAuthorNames(
  rows: Array<typeof projectDocs.$inferSelect>,
): Promise<ProjectDoc[]> {
  const ids = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.createdBy, row.updatedBy])
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const names = new Map<string, string>()

  if (ids.length > 0) {
    const users = await getDb()
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, ids))

    for (const row of users) {
      names.set(row.id, row.name)
    }
  }

  return rows.map((row) => ({
    ...row,
    createdByName: row.createdBy ? (names.get(row.createdBy) ?? null) : null,
    updatedByName: row.updatedBy ? (names.get(row.updatedBy) ?? null) : null,
  }))
}

function toDocCategory(row: typeof docCategories.$inferSelect): DocCategory {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon,
    position: row.position,
  }
}

/** Manual order, with the system General category always last. */
function sortCategories(items: DocCategory[]): DocCategory[] {
  return [...items].sort(
    (a, b) =>
      Number(a.name === GENERAL_DOC_CATEGORY) -
        Number(b.name === GENERAL_DOC_CATEGORY) ||
      a.position - b.position ||
      a.id - b.id,
  )
}

/**
 * Returns the project's categories. A project that has none yet is seeded
 * from the shipped defaults plus whatever categories its docs already use,
 * so existing docs never end up in a category that does not exist.
 */
async function loadCategories(projectId: number): Promise<DocCategory[]> {
  const db = getDb()
  const read = () =>
    db
      .select()
      .from(docCategories)
      .where(eq(docCategories.projectId, projectId))
      .orderBy(asc(docCategories.position), asc(docCategories.id))

  let rows = await read()

  if (rows.length === 0) {
    const used = await db
      .selectDistinct({ category: projectDocs.category })
      .from(projectDocs)
      .where(eq(projectDocs.projectId, projectId))
    const plan = planCategorySeed(used.map((row) => row.category))
    const timestamp = nowIso()

    try {
      await db.insert(docCategories).values(
        plan.map((category, index) => ({
          projectId,
          name: category.name,
          color: category.color,
          icon: category.icon,
          position: index,
          createdAt: timestamp,
        })),
      )
    } catch (error) {
      // Two requests seeding at once: the unique (project, name) index makes
      // the loser fail; the winner's rows are what we read below.
      console.error('Seeding doc categories failed', projectId, error)
    }

    rows = await read()
  }

  return sortCategories(rows.map(toDocCategory))
}

/** Maps a requested category onto one that exists; unknown means General. */
async function resolveCategoryName(
  projectId: number,
  requested: string | undefined,
): Promise<string> {
  const wanted = requested?.trim().toLowerCase()

  if (!wanted) {
    return GENERAL_DOC_CATEGORY
  }

  const categories = await loadCategories(projectId)
  const match = categories.find((item) => item.name.toLowerCase() === wanted)

  return match?.name ?? GENERAL_DOC_CATEGORY
}

async function loadCategory(categoryId: number) {
  const rows = await getDb()
    .select()
    .from(docCategories)
    .where(eq(docCategories.id, categoryId))
    .limit(1)

  const row = rows[0]

  if (!row) {
    throw notFound()
  }

  return row
}

async function assertCategoryNameFree(
  projectId: number,
  name: string,
  exceptId?: number,
): Promise<void> {
  const existing = await loadCategories(projectId)
  const taken = existing.some(
    (item) =>
      item.id !== exceptId && item.name.toLowerCase() === name.toLowerCase(),
  )

  if (taken) {
    throw new Error('A category with this name already exists.')
  }
}

export const getProjectDocs = createServerFn({ method: 'POST' })
  .inputValidator(projectDocsInput)
  .handler(
    async ({
      data,
    }): Promise<{
      docs: ProjectDoc[]
      categories: DocCategory[]
      canEdit: boolean
      /** Live (not deleted) comments per doc id; docs without any are absent. */
      commentCounts: Record<number, number>
    }> => {
      const { requireProjectAccess } = await import(
        '../auth/project-access.server'
      )
      const { roleAtLeast } = await import('../auth/roles')
      await ensureDocsServerDeps()

      if (!isDatabaseConfigured()) {
        return { docs: [], categories: [], canEdit: false, commentCounts: {} }
      }

      const { role } = await requireProjectAccess(data.projectId, 'viewer')

      const db = getDb()
      const docs = await db
        .select()
        .from(projectDocs)
        .where(eq(projectDocs.projectId, data.projectId))
        .orderBy(desc(projectDocs.updatedAt), desc(projectDocs.id))

      const commentCounts: Record<number, number> = {}

      try {
        const commentRows = await db
          .select({
            entityId: comments.entityId,
            deletedAt: comments.deletedAt,
          })
          .from(comments)
          .where(
            and(
              eq(comments.projectId, data.projectId),
              eq(comments.entityType, 'doc'),
            ),
          )

        for (const row of commentRows) {
          if (row.deletedAt === null) {
            commentCounts[row.entityId] = (commentCounts[row.entityId] ?? 0) + 1
          }
        }
      } catch (error) {
        // The list must still load if the comments table is not migrated yet.
        console.error('Loading doc comment counts failed', error)
      }

      return {
        docs: await withAuthorNames(
          docs.filter((doc) => doc.status !== 'Archived'),
        ),
        categories: await loadCategories(data.projectId),
        canEdit: roleAtLeast(role, 'editor'),
        commentCounts,
      }
    },
  )

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

    const row = rows[0]

    if (!row || row.status === 'Archived') {
      throw notFound()
    }

    const [doc] = await withAuthorNames([row])

    return { doc }
  })

export const getProjectDocDetail = createServerFn({ method: 'POST' })
  .inputValidator(projectDocDetailInput)
  .handler(
    async ({
      data,
    }): Promise<{
      project: ProjectDocProject
      doc: ProjectDoc
      categories: DocCategory[]
      canEdit: boolean
    }> => {
      const { requireProjectAccess } = await import(
        '../auth/project-access.server'
      )
      const { roleAtLeast } = await import('../auth/roles')
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

      const { role } = await requireProjectAccess(project.id, 'viewer')

      const docRows = await db
        .select()
        .from(projectDocs)
        .where(eq(projectDocs.id, data.docId))
        .limit(1)

      const row = docRows[0]

      if (!row || row.status === 'Archived' || row.projectId !== project.id) {
        throw notFound()
      }

      const [doc] = await withAuthorNames([row])
      const categories = await loadCategories(project.id)

      return { project, doc, categories, canEdit: roleAtLeast(role, 'editor') }
    },
  )

export const createProjectDoc = createServerFn({ method: 'POST' })
  .inputValidator(createProjectDocInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()
    const { user: sessionUser } = await requireProjectAccess(
      data.projectId,
      'editor',
    )

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
      category: await resolveCategoryName(data.projectId, data.category),
      content: data.content ?? '',
      status: 'Published',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: sessionUser.id,
      updatedBy: sessionUser.id,
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
    const { user: sessionUser } = await requireProjectAccess(
      projectId,
      'editor',
    )

    const db = getDb()
    await db
      .update(projectDocs)
      .set({
        title: data.title,
        category: await resolveCategoryName(projectId, data.category),
        content: data.content ?? '',
        updatedAt: nowIso(),
        updatedBy: sessionUser.id,
      })
      .where(eq(projectDocs.id, data.docId))

    return { ok: true }
  })

export const setProjectDocPinned = createServerFn({ method: 'POST' })
  .inputValidator(setDocPinnedInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    const projectId = await resolveDocProjectId(data.docId)
    await requireProjectAccess(projectId, 'editor')

    // Pinning is a presentation choice, not an edit: updatedAt stays as is.
    await getDb()
      .update(projectDocs)
      .set({ pinnedAt: data.pinned ? nowIso() : null })
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

    // Comments have no FK to the doc (they are shared across entity types).
    // A failure here (e.g. the comments migration not applied yet) must not
    // block deleting the doc itself.
    try {
      await db
        .delete(comments)
        .where(
          and(eq(comments.entityType, 'doc'), eq(comments.entityId, data.docId)),
        )
    } catch (error) {
      console.error('Failed to delete comments of doc', data.docId, error)
    }

    await db.delete(projectDocs).where(eq(projectDocs.id, data.docId))

    return { ok: true }
  })

export const getDocCategories = createServerFn({ method: 'POST' })
  .inputValidator(projectDocsInput)
  .handler(async ({ data }): Promise<{ categories: DocCategory[] }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    if (!isDatabaseConfigured()) {
      return { categories: [] }
    }

    await requireProjectAccess(data.projectId, 'viewer')

    return { categories: await loadCategories(data.projectId) }
  })

export const createDocCategory = createServerFn({ method: 'POST' })
  .inputValidator(createDocCategoryInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()
    await requireProjectAccess(data.projectId, 'editor')

    await assertCategoryNameFree(data.projectId, data.name)

    const existing = await loadCategories(data.projectId)
    const position =
      existing
        .filter((item) => item.name !== GENERAL_DOC_CATEGORY)
        .reduce((max, item) => Math.max(max, item.position), -1) + 1

    const inserted = await getDb().insert(docCategories).values({
      projectId: data.projectId,
      name: data.name,
      color: data.color,
      icon: data.icon,
      position,
      createdAt: nowIso(),
    })

    return { id: inserted[0].insertId }
  })

export const updateDocCategory = createServerFn({ method: 'POST' })
  .inputValidator(updateDocCategoryInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    const category = await loadCategory(data.categoryId)
    await requireProjectAccess(category.projectId, 'editor')

    if (category.name === GENERAL_DOC_CATEGORY) {
      throw new Error('The General category cannot be changed.')
    }

    const nextName = data.name ?? category.name

    if (nextName.toLowerCase() !== category.name.toLowerCase()) {
      await assertCategoryNameFree(category.projectId, nextName, category.id)
    }

    await getDb().transaction(async (tx) => {
      await tx
        .update(docCategories)
        .set({
          name: nextName,
          color: data.color ?? category.color,
          icon: data.icon ?? category.icon,
        })
        .where(eq(docCategories.id, category.id))

      // Docs reference their category by name, so a rename carries them along.
      if (nextName !== category.name) {
        await tx
          .update(projectDocs)
          .set({ category: nextName })
          .where(
            and(
              eq(projectDocs.projectId, category.projectId),
              eq(projectDocs.category, category.name),
            ),
          )
      }
    })

    return { ok: true }
  })

export const deleteDocCategory = createServerFn({ method: 'POST' })
  .inputValidator(deleteDocCategoryInput)
  .handler(async ({ data }): Promise<{ ok: true; movedDocs: number }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureDocsServerDeps()

    const category = await loadCategory(data.categoryId)
    await requireProjectAccess(category.projectId, 'editor')

    if (category.name === GENERAL_DOC_CATEGORY) {
      throw new Error('The General category cannot be deleted.')
    }

    let movedDocs = 0

    await getDb().transaction(async (tx) => {
      const affected = await tx
        .select({ id: projectDocs.id })
        .from(projectDocs)
        .where(
          and(
            eq(projectDocs.projectId, category.projectId),
            eq(projectDocs.category, category.name),
          ),
        )

      movedDocs = affected.length

      if (movedDocs > 0) {
        await tx
          .update(projectDocs)
          .set({ category: GENERAL_DOC_CATEGORY })
          .where(
            and(
              eq(projectDocs.projectId, category.projectId),
              eq(projectDocs.category, category.name),
            ),
          )
      }

      await tx.delete(docCategories).where(eq(docCategories.id, category.id))
    })

    return { ok: true, movedDocs }
  })
