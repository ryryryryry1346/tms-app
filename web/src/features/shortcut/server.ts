import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  SHORTCUT_STORY_TYPES,
  describeShortcutHttpError,
  isShortcutStoryType,
  parseShortcutMember,
  parseShortcutGroups,
  parseShortcutWorkflowStates,
  type ShortcutGroupOption,
  type ShortcutMember,
  type ShortcutStoryType,
  type ShortcutWorkflowStateOption,
} from '../../lib/shortcut'

const SHORTCUT_API = 'https://api.app.shortcut.com/api/v3'

const projectScopeInput = z.object({
  projectId: z.number().int().positive(),
})

const loadShortcutOptionsInput = z.object({
  projectId: z.number().int().positive(),
  // A token typed into the form but not saved yet; falls back to the saved one.
  apiToken: z.string().trim().max(512).optional(),
})

const saveShortcutSettingsInput = z.object({
  projectId: z.number().int().positive(),
  // Optional: only overwrite the stored token when a new value is provided.
  apiToken: z.string().trim().max(512).optional(),
  workflowStateId: z.number().int().positive(),
  workflowStateName: z.string().trim().max(255).optional(),
  groupId: z.string().trim().max(64).optional(),
  groupName: z.string().trim().max(255).optional(),
  storyType: z.enum(SHORTCUT_STORY_TYPES),
  labelName: z.string().trim().max(64).optional(),
})

const createShortcutStoryInput = z.object({
  projectId: z.number().int().positive(),
  name: z.string().trim().min(1).max(512),
  description: z.string().max(100_000).optional().default(''),
  storyType: z.enum(SHORTCUT_STORY_TYPES).optional(),
  externalLinks: z.array(z.string().url().max(2048)).max(10).optional(),
})

export type ShortcutStoryResult = {
  id: number | null
  url: string
  name: string
}

type ResolvedShortcutConfig = {
  apiToken: string | null
  workflowStateId: number | null
  groupId: string | null
  storyType: ShortcutStoryType
  labelName: string | null
  source: 'project' | 'env' | 'none'
}

export type ShortcutSettings = {
  hasToken: boolean
  workflowStateId: number | null
  workflowStateName: string | null
  groupId: string | null
  groupName: string | null
  storyType: ShortcutStoryType
  labelName: string
  /** Effective configuration (project settings or env fallback) is usable. */
  configured: boolean
  /** Nothing saved on the project, but SHORTCUT_* env variables are in use. */
  envFallbackActive: boolean
  canManage: boolean
}

export type ShortcutOptions = {
  memberName: string | null
  workspaceSlug: string | null
  workflowStates: ShortcutWorkflowStateOption[]
  groups: ShortcutGroupOption[]
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim()
  return value || undefined
}

async function loadDeps() {
  const [dbClient, schema, drizzle, crypto] = await Promise.all([
    import('../../db/client'),
    import('../../db/schema'),
    import('drizzle-orm'),
    import('../../lib/secretCrypto'),
  ])

  return { dbClient, schema, drizzle, crypto }
}

async function requireAccess(projectId: number, minRole: 'viewer' | 'editor' | 'owner') {
  const { requireProjectAccess } = await import('../auth/project-access.server')
  return requireProjectAccess(projectId, minRole)
}

async function readSettingsRow(projectId: number) {
  const { dbClient, schema, drizzle } = await loadDeps()

  if (!dbClient.isDatabaseConfigured()) {
    return null
  }

  const rows = await dbClient
    .getDb()
    .select()
    .from(schema.projectShortcutSettings)
    .where(drizzle.eq(schema.projectShortcutSettings.projectId, projectId))
    .limit(1)

  return rows[0] ?? null
}

function readEnvConfig(): ResolvedShortcutConfig | null {
  const apiToken = readOptionalEnv('SHORTCUT_API_TOKEN')
  const workflowStateId = Number(readOptionalEnv('SHORTCUT_WORKFLOW_STATE_ID'))

  if (!apiToken || !Number.isInteger(workflowStateId) || workflowStateId <= 0) {
    return null
  }

  const storyType = readOptionalEnv('SHORTCUT_STORY_TYPE')

  return {
    apiToken,
    workflowStateId,
    groupId: readOptionalEnv('SHORTCUT_GROUP_ID') ?? null,
    storyType: isShortcutStoryType(storyType) ? storyType : 'chore',
    labelName: readOptionalEnv('SHORTCUT_LABEL_NAME') ?? 'tms',
    source: 'env',
  }
}

/**
 * Effective configuration for a project: settings saved on the project win;
 * when nothing is saved, the legacy SHORTCUT_* environment variables are used
 * so existing deployments keep working.
 */
async function getProjectShortcutConfig(
  projectId: number,
): Promise<ResolvedShortcutConfig> {
  const row = await readSettingsRow(projectId)

  if (row) {
    const { crypto } = await loadDeps()

    return {
      apiToken: crypto.decryptSecret(row.apiToken),
      workflowStateId: row.workflowStateId ?? null,
      groupId: row.groupId ?? null,
      storyType: isShortcutStoryType(row.storyType) ? row.storyType : 'chore',
      labelName: row.labelName ?? null,
      source: 'project',
    }
  }

  return (
    readEnvConfig() ?? {
      apiToken: null,
      workflowStateId: null,
      groupId: null,
      storyType: 'chore',
      labelName: null,
      source: 'none',
    }
  )
}

function isConfigured(config: ResolvedShortcutConfig): boolean {
  return Boolean(config.apiToken && config.workflowStateId)
}

async function shortcutRequest(
  apiToken: string,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<unknown> {
  let response: Response

  try {
    response = await fetch(`${SHORTCUT_API}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Shortcut-Token': apiToken,
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new Error('Could not reach Shortcut. Check the server network connection.')
  }

  const body = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    const raw =
      body && typeof body === 'object'
        ? String(
            (body as { message?: unknown; error?: unknown }).message ??
              (body as { error?: unknown }).error ??
              '',
          )
        : ''
    throw new Error(describeShortcutHttpError(response.status, raw))
  }

  return body
}

async function fetchMember(apiToken: string): Promise<ShortcutMember> {
  return parseShortcutMember(await shortcutRequest(apiToken, '/member'))
}

export async function createShortcutStoryForProject(
  projectId: number,
  story: {
    name: string
    description: string
    storyType?: ShortcutStoryType
    externalLinks?: string[]
  },
): Promise<ShortcutStoryResult> {
  const config = await getProjectShortcutConfig(projectId)

  if (!isConfigured(config) || !config.apiToken) {
    throw new Error(
      'Shortcut is not configured for this project. Open Project settings → Integrations to connect it.',
    )
  }

  const payload: Record<string, unknown> = {
    name: story.name,
    description: story.description,
    story_type: story.storyType ?? config.storyType,
    workflow_state_id: config.workflowStateId,
  }

  if (story.externalLinks && story.externalLinks.length > 0) {
    payload.external_links = story.externalLinks
  }

  if (config.groupId) {
    payload.group_id = config.groupId
  }

  if (config.labelName) {
    payload.labels = [{ name: config.labelName }]
  }

  const created = (await shortcutRequest(config.apiToken, '/stories', {
    method: 'POST',
    body: payload,
  })) as { id?: unknown; app_url?: unknown; name?: unknown } | null

  if (typeof created?.app_url !== 'string' || !created.app_url) {
    throw new Error('Shortcut did not return a story URL.')
  }

  return {
    id: typeof created.id === 'number' ? created.id : null,
    url: created.app_url,
    name:
      typeof created.id === 'number'
        ? `sc-${created.id}: ${story.name}`
        : story.name,
  }
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function getShortcutSettingsHandler(
  data: z.infer<typeof projectScopeInput>,
): Promise<ShortcutSettings> {
  const { role } = await requireAccess(data.projectId, 'viewer')
  const row = await readSettingsRow(data.projectId)
  const config = await getProjectShortcutConfig(data.projectId)
  const storedType = row?.storyType

  return {
    hasToken: Boolean(row?.apiToken),
    workflowStateId: row?.workflowStateId ?? null,
    workflowStateName: row?.workflowStateName ?? null,
    groupId: row?.groupId ?? null,
    groupName: row?.groupName ?? null,
    storyType: isShortcutStoryType(storedType) ? storedType : 'chore',
    labelName: row ? (row.labelName ?? '') : 'tms',
    configured: isConfigured(config),
    envFallbackActive: !row && config.source === 'env',
    canManage: role === 'owner',
  }
}

export const getShortcutSettings = createServerFn({ method: 'POST' })
  .inputValidator(projectScopeInput)
  .handler(({ data }) => getShortcutSettingsHandler(data))

/** Lightweight check for pages that only need to know whether to show buttons. */
export const getShortcutStatus = createServerFn({ method: 'POST' })
  .inputValidator(projectScopeInput)
  .handler(async ({ data }): Promise<{ configured: boolean }> => {
    await requireAccess(data.projectId, 'viewer')
    const config = await getProjectShortcutConfig(data.projectId)
    return { configured: isConfigured(config) }
  })

export async function loadShortcutOptionsHandler(
  data: z.infer<typeof loadShortcutOptionsInput>,
): Promise<ShortcutOptions> {
  await requireAccess(data.projectId, 'owner')

  let apiToken = data.apiToken || null

  if (!apiToken) {
    const row = await readSettingsRow(data.projectId)
    const { crypto } = await loadDeps()
    apiToken = crypto.decryptSecret(row?.apiToken)
  }

  if (!apiToken) {
    throw new Error('Paste a Shortcut API token first.')
  }

  const member = await fetchMember(apiToken)
  const [workflows, groups] = await Promise.all([
    shortcutRequest(apiToken, '/workflows'),
    shortcutRequest(apiToken, '/groups'),
  ])

  return {
    memberName: member.name,
    workspaceSlug: member.workspaceSlug,
    workflowStates: parseShortcutWorkflowStates(workflows),
    groups: parseShortcutGroups(groups),
  }
}

export const loadShortcutOptions = createServerFn({ method: 'POST' })
  .inputValidator(loadShortcutOptionsInput)
  .handler(({ data }) => loadShortcutOptionsHandler(data))

export async function saveShortcutSettingsHandler(
  data: z.infer<typeof saveShortcutSettingsInput>,
): Promise<{ ok: true }> {
  await requireAccess(data.projectId, 'owner')
  const { dbClient, schema, drizzle, crypto } = await loadDeps()

  if (!dbClient.isDatabaseConfigured()) {
    throw new Error('Database is not configured.')
  }

  const db = dbClient.getDb()
  const now = new Date().toISOString()
  const existing = await readSettingsRow(data.projectId)
  const hasNewToken = Boolean(data.apiToken)

  if (!hasNewToken && !existing?.apiToken) {
    throw new Error('Paste a Shortcut API token.')
  }

  const values = {
    workflowStateId: data.workflowStateId,
    workflowStateName: data.workflowStateName || null,
    groupId: data.groupId || null,
    groupName: data.groupId ? data.groupName || null : null,
    storyType: data.storyType,
    labelName: data.labelName || null,
    updatedAt: now,
  }

  if (existing) {
    await db
      .update(schema.projectShortcutSettings)
      .set({
        ...values,
        ...(hasNewToken
          ? { apiToken: crypto.encryptSecret(data.apiToken as string) }
          : {}),
      })
      .where(drizzle.eq(schema.projectShortcutSettings.id, existing.id))
  } else {
    await db.insert(schema.projectShortcutSettings).values({
      projectId: data.projectId,
      apiToken: crypto.encryptSecret(data.apiToken as string),
      ...values,
      createdAt: now,
    })
  }

  return { ok: true }
}

export const saveShortcutSettings = createServerFn({ method: 'POST' })
  .inputValidator(saveShortcutSettingsInput)
  .handler(({ data }) => saveShortcutSettingsHandler(data))

export async function disconnectShortcutHandler(
  data: z.infer<typeof projectScopeInput>,
): Promise<{ ok: true }> {
  await requireAccess(data.projectId, 'owner')
  const { dbClient, schema, drizzle } = await loadDeps()

  if (!dbClient.isDatabaseConfigured()) {
    throw new Error('Database is not configured.')
  }

  await dbClient
    .getDb()
    .delete(schema.projectShortcutSettings)
    .where(drizzle.eq(schema.projectShortcutSettings.projectId, data.projectId))

  return { ok: true }
}

export const disconnectShortcut = createServerFn({ method: 'POST' })
  .inputValidator(projectScopeInput)
  .handler(({ data }) => disconnectShortcutHandler(data))

export async function testShortcutConnectionHandler(
  data: z.infer<typeof projectScopeInput>,
): Promise<{ ok: boolean; message: string }> {
  await requireAccess(data.projectId, 'owner')
  const config = await getProjectShortcutConfig(data.projectId)

  if (!isConfigured(config) || !config.apiToken) {
    return {
      ok: false,
      message: 'Save an API token and a workflow state first.',
    }
  }

  try {
    const memberName = (await fetchMember(config.apiToken)).name
    const states = parseShortcutWorkflowStates(
      await shortcutRequest(config.apiToken, '/workflows'),
    )
    const state = states.find((item) => item.id === config.workflowStateId)

    if (!state) {
      return {
        ok: false,
        message:
          'Connected, but the saved workflow state no longer exists in Shortcut. Pick another one.',
      }
    }

    return {
      ok: true,
      message: `Connected${memberName ? ` as ${memberName}` : ''}. New stories go to “${state.workflowName} · ${state.name}”.`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : 'Could not connect to Shortcut.',
    }
  }
}

export const testShortcutConnection = createServerFn({ method: 'POST' })
  .inputValidator(projectScopeInput)
  .handler(({ data }) => testShortcutConnectionHandler(data))

// ---------------------------------------------------------------------------
// Creating stories
// ---------------------------------------------------------------------------

export const createShortcutStory = createServerFn({ method: 'POST' })
  .inputValidator(createShortcutStoryInput)
  .handler(async ({ data }): Promise<ShortcutStoryResult> => {
    await requireAccess(data.projectId, 'editor')

    return createShortcutStoryForProject(data.projectId, {
      name: data.name,
      description: data.description,
      storyType: data.storyType,
      externalLinks: data.externalLinks,
    })
  })

function buildRepositoryStoryDescription({
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
  .inputValidator(projectScopeInput)
  .handler(async ({ data }): Promise<ShortcutStoryResult> => {
    await requireAccess(data.projectId, 'editor')
    const { getRequestUrl } = await import('@tanstack/react-start/server')
    const { dbClient, schema, drizzle } = await loadDeps()

    if (!dbClient.isDatabaseConfigured()) {
      throw new Error('Database is not configured.')
    }

    const projectRows = await dbClient
      .getDb()
      .select({
        id: schema.projects.id,
        name: schema.projects.name,
        slug: schema.projects.slug,
      })
      .from(schema.projects)
      .where(drizzle.eq(schema.projects.id, data.projectId))
      .limit(1)
    const project = projectRows[0]

    if (!project) {
      throw new Error('Project was not found.')
    }

    const requestUrl = getRequestUrl({ xForwardedHost: true })
    const repositoryUrl = new URL(
      `/project/${project.slug ?? project.id}/repository`,
      requestUrl.origin,
    ).toString()

    return createShortcutStoryForProject(project.id, {
      name: `TMS: ${project.name} repository follow-up`,
      description: buildRepositoryStoryDescription({
        projectName: project.name,
        repositoryUrl,
      }),
      externalLinks: [repositoryUrl],
    })
  })
