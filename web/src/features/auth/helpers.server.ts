import { eq } from 'drizzle-orm'
import { redirect } from '@tanstack/react-router'
import { useSession } from '@tanstack/react-start/server'
import { getDb } from '../../db/client'
import { users } from '../../db/schema'

export type SessionUser = {
  id: number
  username: string
}

type AppSessionData = {
  userId?: number
  username?: string
}

function useAppSession() {
  const password = process.env.SESSION_SECRET

  if (!password || password.length < 32) {
    throw new Error(
      'SESSION_SECRET must be configured with at least 32 characters.',
    )
  }

  return useSession<AppSessionData>({
    name: 'tms-session',
    password,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    },
  })
}

export async function findUserById(id: number): Promise<SessionUser | null> {
  const db = getDb()
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  return rows[0] ?? null
}

export async function findUserWithPasswordByUsername(
  username: string,
): Promise<{ id: number; username: string; password: string } | null> {
  const db = getDb()
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      password: users.password,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1)

  return rows[0] ?? null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await useAppSession()
  const userId = session.data.userId

  if (!userId) {
    return null
  }

  return findUserById(userId)
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

export async function createSessionForUser(user: SessionUser): Promise<void> {
  const session = await useAppSession()
  await session.update({
    userId: user.id,
    username: user.username,
  })
}

export async function clearSession(): Promise<void> {
  const session = await useAppSession()
  await session.clear()
}
