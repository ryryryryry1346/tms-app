import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const credentialsInput = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
})

export type { SessionUser } from './helpers.server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSessionUser } = await import('./helpers.server')
    return getSessionUser()
  },
)

export const loginUser = createServerFn({ method: 'POST' })
  .inputValidator(credentialsInput)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const {
        createSessionForUser,
        findUserWithPasswordByUsername,
      } = await import('./helpers.server')
      const { verifyPassword } = await import('./password')
      const user = await findUserWithPasswordByUsername(data.username)

      if (!user) {
        return { ok: false }
      }

      const isValid = await verifyPassword(data.password, user.password)

      if (!isValid) {
        return { ok: false }
      }

      await createSessionForUser({
        id: user.id,
        username: user.username,
      })

      return { ok: true }
    } catch (error) {
      console.error('loginUser failed', {
        username: data.username,
        error,
      })
      throw error
    }
  })

export const registerUser = createServerFn({ method: 'POST' })
  .inputValidator(credentialsInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      const { findUserWithPasswordByUsername } = await import('./helpers.server')
      const { hashPassword } = await import('./password')
      const existingUser = await findUserWithPasswordByUsername(data.username)

      if (!existingUser) {
        const [{ getDb }, { users }] = await Promise.all([
          import('../../db/client'),
          import('../../db/schema'),
        ])
        const db = getDb()
        await db.insert(users).values({
          username: data.username,
          password: await hashPassword(data.password),
        })
      }

      return { ok: true }
    } catch (error) {
      console.error('registerUser failed', {
        username: data.username,
        error,
      })
      throw error
    }
  })

export const logoutUser = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: true }> => {
    const { clearSession } = await import('./helpers.server')
    await clearSession()

    return { ok: true }
  },
)
