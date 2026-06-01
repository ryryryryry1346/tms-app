import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

let eq: typeof import('drizzle-orm')['eq']
let getDb: typeof import('../../db/client')['getDb']
let isDatabaseConfigured: typeof import('../../db/client')['isDatabaseConfigured']
let projects: typeof import('../../db/schema')['projects']

async function ensureShortcutServerDeps(): Promise<void> {
  if (typeof getDb !== 'undefined') {
    return
  }

  const [drizzle, dbClient, schema] = await Promise.all([
    import('drizzle-orm'),
    import('../../db/client'),
    import('../../db/schema'),
  ])

  eq = drizzle.eq
  getDb = dbClient.getDb
  isDatabaseConfigured = dbClient.isDatabaseConfigured
  projects = schema.projects
}

const createShortcutRepositoryStoryInput = z.object({
  projectId: z.number().int().positive(),
})

type ShortcutStoryResponse = {
  id?: number
  app_url?: string
  name?: string
}

export type ShortcutRepositoryStoryResult = {
  id: number | null
  url: string
  name: string
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()

  return value || undefined
}

function buildShortcutStoryName(projectName: string): string {
  return `TMS: ${projectName} repository follow-up`
}

function buildShortcutStoryDescription({
  projectName,
  repositoryUrl,
}: {
  projectName: string
  repositoryUrl: string
}): string {
  return [
    `Created from TMS repository for **${projectName}**.`,
    '',
    `TMS repository: ${repositoryUrl}`,
    '',
    'Use this story to track repository-level QA work, cleanup, or follow-up items.',
  ].join('\n')
}

export const createShortcutRepositoryStory = createServerFn({ method: 'POST' })
  .inputValidator(createShortcutRepositoryStoryInput)
  .handler(async ({ data }): Promise<ShortcutRepositoryStoryResult> => {
    const { requireSessionUser } = await import('../auth/helpers.server')
    const { getRequestUrl } = await import('@tanstack/react-start/server')

    await requireSessionUser()
    await ensureShortcutServerDeps()

    if (!isDatabaseConfigured()) {
      throw new Error('Database is not configured.')
    }

    const db = getDb()
    const projectRows = await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
      })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1)
    const project = projectRows[0]

    if (!project) {
      throw new Error('Project was not found.')
    }

    const apiToken = readRequiredEnv('SHORTCUT_API_TOKEN')
    const workflowStateId = Number(readRequiredEnv('SHORTCUT_WORKFLOW_STATE_ID'))

    if (!Number.isInteger(workflowStateId) || workflowStateId <= 0) {
      throw new Error('SHORTCUT_WORKFLOW_STATE_ID must be a positive integer.')
    }

    const requestUrl = getRequestUrl({
      xForwardedHost: true,
    })
    const repositoryPath = `/project/${project.slug ?? project.id}/repository`
    const repositoryUrl = new URL(repositoryPath, requestUrl.origin).toString()
    const name = buildShortcutStoryName(project.name)
    const payload: Record<string, unknown> = {
      name,
      description: buildShortcutStoryDescription({
        projectName: project.name,
        repositoryUrl,
      }),
      external_links: [repositoryUrl],
      story_type: readOptionalEnv('SHORTCUT_STORY_TYPE') ?? 'chore',
      workflow_state_id: workflowStateId,
    }
    const groupId = readOptionalEnv('SHORTCUT_GROUP_ID')
    const labelName = readOptionalEnv('SHORTCUT_LABEL_NAME') ?? 'tms'

    if (groupId) {
      payload.group_id = groupId
    }

    if (labelName) {
      payload.labels = [{ name: labelName }]
    }

    const response = await fetch('https://api.app.shortcut.com/api/v3/stories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Shortcut-Token': apiToken,
      },
      body: JSON.stringify(payload),
    })
    const responseBody = (await response.json().catch(() => null)) as
      | ShortcutStoryResponse
      | { message?: string; error?: string }
      | null

    if (!response.ok) {
      const message =
        responseBody && 'message' in responseBody
          ? responseBody.message
          : responseBody && 'error' in responseBody
            ? responseBody.error
            : `Shortcut API returned ${response.status}.`

      throw new Error(message ?? `Shortcut API returned ${response.status}.`)
    }

    const story = responseBody as ShortcutStoryResponse | null
    const storyUrl = story?.app_url

    if (!storyUrl) {
      throw new Error('Shortcut did not return a story URL.')
    }

    return {
      id: typeof story.id === 'number' ? story.id : null,
      url: storyUrl,
      name: story.name ?? name,
    }
  })
