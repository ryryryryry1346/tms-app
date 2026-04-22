import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'
import { hashPassword, verifyPassword } from './password'

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
    const {
      createSessionForUser,
      findUserWithPasswordByUsername,
    } = await import('./helpers.server')
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
  })

export const registerUser = createServerFn({ method: 'POST' })
  .inputValidator(credentialsInput)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { findUserWithPasswordByUsername } = await import('./helpers.server')
    const existingUser = await findUserWithPasswordByUsername(data.username)

    if (!existingUser) {
      const db = getDb()
      await db.insert(users).values({
        username: data.username,
        password: await hashPassword(data.password),
      })
    }

    return { ok: true }
  })

export const logoutUser = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: true }> => {
    const { clearSession } = await import('./helpers.server')
    await clearSession()

    return { ok: true }
  },
)
