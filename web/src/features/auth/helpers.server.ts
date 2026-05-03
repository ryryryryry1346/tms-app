import { redirect } from '@tanstack/react-router'
import {
  getRequestHeaders,
  getRequestUrl,
} from '@tanstack/react-start/server'
import { auth } from '../../lib/auth'

export type SessionUser = {
  id: string
  username: string
  email: string
  name: string
  displayName: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })

  if (!session?.user) {
    return null
  }

  const displayName = session.user.name || session.user.email

  return {
    id: session.user.id,
    username: displayName,
    email: session.user.email,
    name: session.user.name,
    displayName,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) {
    throw redirect({
      to: '/login',
      search: {
        redirectTo: getLoginRedirectTo(),
      },
    })
  }

  return user
}

function getLoginRedirectTo(): string {
  const requestUrl = getRequestUrl({
    xForwardedHost: true,
  })
  const requestPath = toLocalRedirectPath(requestUrl)

  if (requestPath) {
    return requestPath
  }

  const referer = getRequestHeaders().get('referer')

  if (!referer) {
    return '/'
  }

  try {
    const refererUrl = new URL(referer)

    if (refererUrl.origin !== requestUrl.origin) {
      return '/'
    }

    return toLocalRedirectPath(refererUrl) ?? '/'
  } catch {
    return '/'
  }
}

function toLocalRedirectPath(url: URL): string | null {
  const path = `${url.pathname}${url.search}`

  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/forgot-password') ||
    path.startsWith('/reset-password') ||
    path.startsWith('/api/auth')
  ) {
    return null
  }

  return path
}

export async function clearSession(): Promise<void> {
  await auth.api.signOut({
    headers: getRequestHeaders(),
  })
}
