import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

export type AccountProjectRole = {
  id: number
  name: string
  slug: string | null
  status: string | null
  role: 'owner' | 'editor' | 'viewer'
}

export type AccountOverview = {
  name: string
  email: string
  projects: AccountProjectRole[]
}

const updateNameInput = z.object({
  name: z.string().trim().min(1).max(255),
})

const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
})

export const getAccountOverview = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AccountOverview> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const sessionUser = await requireSessionUser()

    const [{ getDb, isDatabaseConfigured }, drizzle, schema] = await Promise.all(
      [
        import('../../db/client'),
        import('drizzle-orm'),
        import('../../db/schema'),
      ],
    )

    if (!isDatabaseConfigured()) {
      return { name: sessionUser.name, email: sessionUser.email, projects: [] }
    }

    const rows = await getDb()
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        slug: schema.projects.slug,
        status: schema.projects.status,
        role: schema.projectMembers.role,
      })
      .from(schema.projectMembers)
      .innerJoin(
        schema.projects,
        drizzle.eq(schema.projects.id, schema.projectMembers.projectId),
      )
      .where(drizzle.eq(schema.projectMembers.userId, sessionUser.id))
      .orderBy(drizzle.asc(schema.projects.id))

    return {
      name: sessionUser.name,
      email: sessionUser.email,
      projects: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        role: (row.role as AccountProjectRole['role']) ?? 'viewer',
      })),
    }
  },
)

export const updateAccountName = createServerFn({ method: 'POST' })
  .inputValidator(updateNameInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const sessionUser = await requireSessionUser()

    const [{ getDb }, { user }, { eq }] = await Promise.all([
      import('../../db/client'),
      import('../../db/schema'),
      import('drizzle-orm'),
    ])

    await getDb()
      .update(user)
      .set({ name: data.name, updatedAt: new Date() })
      .where(eq(user.id, sessionUser.id))

    return { ok: true }
  })

export const changeAccountPassword = createServerFn({ method: 'POST' })
  .inputValidator(changePasswordInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    await requireSessionUser()

    const [{ auth }, { getRequestHeaders }] = await Promise.all([
      import('../../lib/auth'),
      import('@tanstack/react-start/server'),
    ])

    await auth.api.changePassword({
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: true,
      },
      headers: getRequestHeaders(),
    })

    return { ok: true }
  })
