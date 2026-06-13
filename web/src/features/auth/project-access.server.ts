import { notFound } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { projectMembers } from '../../db/schema'
import { requireSessionUser, type SessionUser } from './helpers.server'

export type ProjectRole = 'owner' | 'editor' | 'viewer'

const ROLE_RANK: Record<ProjectRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
}

export function isProjectRole(value: unknown): value is ProjectRole {
  return value === 'owner' || value === 'editor' || value === 'viewer'
}

export function roleAtLeast(role: ProjectRole, minRole: ProjectRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

export async function getProjectRole(
  projectId: number,
  userId: string,
): Promise<ProjectRole | null> {
  const rows = await getDb()
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1)

  const role = rows[0]?.role

  return isProjectRole(role) ? role : null
}

/**
 * Ensures the current session user is a member of the project with at least
 * `minRole`. Throws notFound() when the user has no access (so we don't reveal
 * that the project exists) and a generic error when the role is too low.
 */
export async function requireProjectAccess(
  projectId: number,
  minRole: ProjectRole = 'viewer',
): Promise<{ user: SessionUser; role: ProjectRole }> {
  const user = await requireSessionUser()
  const role = await getProjectRole(projectId, user.id)

  if (!role) {
    throw notFound()
  }

  if (!roleAtLeast(role, minRole)) {
    throw new Error(
      'You do not have permission to perform this action in this project.',
    )
  }

  return { user, role }
}

export async function getAccessibleProjectIds(
  userId: string,
): Promise<number[]> {
  const rows = await getDb()
    .select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, userId))

  return rows.map((row) => row.projectId)
}

export async function addProjectMembership(
  projectId: number,
  userId: string,
  role: ProjectRole,
): Promise<void> {
  await getDb()
    .insert(projectMembers)
    .values({
      projectId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    })
}
