import { desc, eq } from 'drizzle-orm'
import type { getDb } from '../../db/client'
import { testCaseActivity } from '../../db/schema'

type ActivityDb = ReturnType<typeof getDb>

type ActivityActor = {
  id: number
  username: string
}

export type TestCaseActivityEvent = {
  id: number
  testId: number
  projectId: number | null
  actorId: number | null
  actorName: string | null
  action: string
  summary: string
  createdAt: string
}

export async function logTestCaseActivity({
  db,
  testId,
  projectId,
  actor,
  action,
  summary,
  createdAt = new Date().toISOString(),
}: {
  db: ActivityDb
  testId: number
  projectId: number | null
  actor: ActivityActor
  action: string
  summary: string
  createdAt?: string
}): Promise<void> {
  await db.insert(testCaseActivity).values({
    testId,
    projectId,
    actorId: actor.id,
    actorName: actor.username,
    action,
    summary,
    createdAt,
  })
}

export async function getProjectTestCaseActivities({
  db,
  projectId,
  limit = 200,
}: {
  db: ActivityDb
  projectId: number
  limit?: number
}): Promise<TestCaseActivityEvent[]> {
  return db
    .select({
      id: testCaseActivity.id,
      testId: testCaseActivity.testId,
      projectId: testCaseActivity.projectId,
      actorId: testCaseActivity.actorId,
      actorName: testCaseActivity.actorName,
      action: testCaseActivity.action,
      summary: testCaseActivity.summary,
      createdAt: testCaseActivity.createdAt,
    })
    .from(testCaseActivity)
    .where(eq(testCaseActivity.projectId, projectId))
    .orderBy(desc(testCaseActivity.id))
    .limit(limit)
}
