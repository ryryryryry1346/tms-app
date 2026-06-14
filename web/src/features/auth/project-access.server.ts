import { notFound } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { projectMembers } from '../../db/schema'
import { requireSessionUser, type SessionUser } from './helpers.server'
import { isProjectRole, roleAtLeast, type ProjectRole } from './roles'

export type { ProjectRole }
export { isProjectRole, roleAtLeast }

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

/**
 * Ensures the current user has at least `minRole` in EVERY distinct project the
 * given rows belong to. Used by bulk operations that span multiple test cases.
 */
export async function requireProjectsAccess(
  projectIds: Array<number | null | undefined>,
  minRole: ProjectRole = 'viewer',
): Promise<SessionUser> {
  const user = await requireSessionUser()
  const distinct = Array.from(
    new Set(projectIds.filter((id): id is number => typeof id === 'number')),
  )

  for (const projectId of distinct) {
    const role = await getProjectRole(projectId, user.id)

    if (!role) {
      throw notFound()
    }

    if (!roleAtLeast(role, minRole)) {
      throw new Error(
        'You do not have permission to perform this action in this project.',
      )
    }
  }

  return user
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
