import { redirect } from '@tanstack/react-router'
import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '../../lib/auth'

export type SessionUser = {
  id: string
  username: string
  email: string
  name: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  })

  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    username: session.user.name || session.user.email,
    email: session.user.email,
    name: session.user.name,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()

  if (!user) {
    throw redirect({
      to: '/login',
    })
  }

  return user
}

export async function clearSession(): Promise<void> {
  await auth.api.signOut({
    headers: getRequestHeaders(),
  })
}
