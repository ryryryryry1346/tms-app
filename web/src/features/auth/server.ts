import { createServerFn } from '@tanstack/react-start'

export type { SessionUser } from './helpers.server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSessionUser } = await import('./helpers.server')
    return getSessionUser()
  },
)

export const logoutUser = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ ok: true }> => {
    const { clearSession } = await import('./helpers.server')
    await clearSession()

    return { ok: true }
  },
)
