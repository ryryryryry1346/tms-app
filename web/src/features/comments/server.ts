import { notFound } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let and: typeof import('drizzle-orm')['and']
let asc: typeof import('drizzle-orm')['asc']
let eq: typeof import('drizzle-orm')['eq']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let comments: typeof import('../../db/schema')['comments']
let projectDocs: typeof import('../../db/schema')['projectDocs']
let user: typeof import('../../db/schema')['user']

async function ensureCommentsServerDeps(): Promise<void> {
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
  eq = drizzle.eq
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  comments = schema.comments
  projectDocs = schema.projectDocs
  user = schema.user
}

/**
 * Comments hang off any entity by (type, id). Only docs are wired up today;
 * add a case to resolveEntityProjectId (and to the delete cleanup of that
 * entity) to open another place for discussion.
 */
const entityTypeSchema = z.enum(['doc'])

export type CommentEntityType = z.infer<typeof entityTypeSchema>

export type CommentItem = {
  id: number
  /** Id of the thread's root comment; null for root comments. */
  parentId: number | null
  authorId: string | null
  authorName: string
  body: string
  createdAt: string
  updatedAt: string | null
  deleted: boolean
  canEdit: boolean
  canDelete: boolean
}

export type CommentsState = {
  comments: CommentItem[]
  canComment: boolean
  currentUserName: string
}

const MAX_COMMENT_LENGTH = 20_000

const entityInput = z.object({
  entityType: entityTypeSchema,
  entityId: z.number().int().positive(),
})

const createCommentInput = entityInput.extend({
  parentId: z.number().int().positive().optional(),
  body: z.string().max(MAX_COMMENT_LENGTH),
})

const updateCommentInput = z.object({
  commentId: z.number().int().positive(),
  body: z.string().max(MAX_COMMENT_LENGTH),
})

const deleteCommentInput = z.object({
  commentId: z.number().int().positive(),
})

function nowIso(): string {
  return new Date().toISOString()
}

async function resolveEntityProjectId(
  entityType: CommentEntityType,
  entityId: number,
): Promise<number> {
  switch (entityType) {
    case 'doc': {
      const rows = await getDb()
        .select({ projectId: projectDocs.projectId, status: projectDocs.status })
        .from(projectDocs)
        .where(eq(projectDocs.id, entityId))
        .limit(1)

      const row = rows[0]

      if (!row || row.status === 'Archived') {
        throw notFound()
      }

      return row.projectId
    }
  }
}

function assertHasContent(html: string): void {
  const hasMedia = /<(img|video|pre)\b/i.test(html)
  const text = html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  if (!hasMedia && text.length === 0) {
    throw new Error('Comment cannot be empty.')
  }
}

export const getComments = createServerFn({ method: 'POST' })
  .inputValidator(entityInput)
  .handler(async ({ data }): Promise<CommentsState> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    const { roleAtLeast } = await import('../auth/roles')
    await ensureCommentsServerDeps()

    if (!isDatabaseConfigured()) {
      return { comments: [], canComment: false, currentUserName: '' }
    }

    const projectId = await resolveEntityProjectId(
      data.entityType,
      data.entityId,
    )
    const { user: sessionUser, role } = await requireProjectAccess(
      projectId,
      'viewer',
    )

    const rows = await getDb()
      .select({
        id: comments.id,
        parentId: comments.parentId,
        authorId: comments.authorId,
        authorName: user.name,
        body: comments.body,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        deletedAt: comments.deletedAt,
      })
      .from(comments)
      .leftJoin(user, eq(comments.authorId, user.id))
      .where(
        and(
          eq(comments.entityType, data.entityType),
          eq(comments.entityId, data.entityId),
        ),
      )
      .orderBy(asc(comments.createdAt), asc(comments.id))

    const isOwner = role === 'owner'

    return {
      comments: rows.map((row) => {
        const deleted = row.deletedAt !== null
        const isAuthor = row.authorId !== null && row.authorId === sessionUser.id

        return {
          id: row.id,
          parentId: row.parentId,
          authorId: row.authorId,
          authorName: row.authorName ?? 'Deleted user',
          body: deleted ? '' : row.body,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          deleted,
          canEdit: isAuthor && !deleted && roleAtLeast(role, 'editor'),
          canDelete: !deleted && (isAuthor || isOwner),
        }
      }),
      canComment: roleAtLeast(role, 'editor'),
      currentUserName: sessionUser.displayName,
    }
  })

export const createComment = createServerFn({ method: 'POST' })
  .inputValidator(createCommentInput)
  .handler(async ({ data }): Promise<{ id: number }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureCommentsServerDeps()

    assertHasContent(data.body)

    const projectId = await resolveEntityProjectId(
      data.entityType,
      data.entityId,
    )
    const { user: sessionUser } = await requireProjectAccess(
      projectId,
      'editor',
    )

    const db = getDb()
    let rootId: number | null = null

    if (data.parentId) {
      const parentRows = await db
        .select({ id: comments.id, parentId: comments.parentId })
        .from(comments)
        .where(
          and(
            eq(comments.id, data.parentId),
            eq(comments.entityType, data.entityType),
            eq(comments.entityId, data.entityId),
          ),
        )
        .limit(1)

      const parent = parentRows[0]

      if (!parent) {
        throw notFound()
      }

      // Threads are two levels deep: a reply to a reply joins the same thread.
      rootId = parent.parentId ?? parent.id
    }

    const timestamp = nowIso()
    const inserted = await db.insert(comments).values({
      projectId,
      entityType: data.entityType,
      entityId: data.entityId,
      parentId: rootId,
      authorId: sessionUser.id,
      body: data.body,
      createdAt: timestamp,
    })

    return { id: inserted[0].insertId }
  })

async function loadComment(commentId: number) {
  const rows = await getDb()
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1)

  const row = rows[0]

  if (!row) {
    throw notFound()
  }

  return row
}

export const updateComment = createServerFn({ method: 'POST' })
  .inputValidator(updateCommentInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureCommentsServerDeps()

    assertHasContent(data.body)

    const comment = await loadComment(data.commentId)
    const { user: sessionUser } = await requireProjectAccess(
      comment.projectId,
      'editor',
    )

    if (comment.deletedAt !== null) {
      throw notFound()
    }

    if (comment.authorId !== sessionUser.id) {
      throw new Error('You can only edit your own comments.')
    }

    await getDb()
      .update(comments)
      .set({ body: data.body, updatedAt: nowIso() })
      .where(eq(comments.id, data.commentId))

    return { ok: true }
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .inputValidator(deleteCommentInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireProjectAccess } = await import(
      '../auth/project-access.server'
    )
    await ensureCommentsServerDeps()

    const comment = await loadComment(data.commentId)
    const { user: sessionUser, role } = await requireProjectAccess(
      comment.projectId,
      'viewer',
    )

    if (comment.authorId !== sessionUser.id && role !== 'owner') {
      throw new Error('You can only delete your own comments.')
    }

    const db = getDb()

    if (comment.parentId === null) {
      const replies = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.parentId, comment.id))
        .limit(1)

      if (replies.length > 0) {
        // Keep the root as a placeholder so its replies still make sense.
        await db
          .update(comments)
          .set({ body: '', deletedAt: nowIso() })
          .where(eq(comments.id, comment.id))

        return { ok: true }
      }

      await db.delete(comments).where(eq(comments.id, comment.id))

      return { ok: true }
    }

    await db.delete(comments).where(eq(comments.id, comment.id))

    // Last reply of an already-deleted root: drop the empty placeholder too.
    const root = await db
      .select({ id: comments.id, deletedAt: comments.deletedAt })
      .from(comments)
      .where(eq(comments.id, comment.parentId))
      .limit(1)

    if (root[0]?.deletedAt) {
      const remaining = await db
        .select({ id: comments.id })
        .from(comments)
        .where(eq(comments.parentId, comment.parentId))
        .limit(1)

      if (remaining.length === 0) {
        await db.delete(comments).where(eq(comments.id, comment.parentId))
      }
    }

    return { ok: true }
  })
