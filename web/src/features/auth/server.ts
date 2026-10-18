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

export type AuthProviders = {
  slack: { workspaceName: string | null } | null
}

/** Which sign-in providers are configured (for the login and account pages). */
export const getAuthProviders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AuthProviders> => {
    const { slackAuthConfig } = await import('../../lib/auth')

    return {
      slack: slackAuthConfig
        ? { workspaceName: slackAuthConfig.workspaceName }
        : null,
    }
  },
)
