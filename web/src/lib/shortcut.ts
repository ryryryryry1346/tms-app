/**
 * Pure helpers for the Shortcut integration (no I/O), shared by the server
 * module and the UI so they can be unit-tested directly.
 */

export const SHORTCUT_STORY_TYPES = ['bug', 'feature', 'chore'] as const

export type ShortcutStoryType = (typeof SHORTCUT_STORY_TYPES)[number]

export function isShortcutStoryType(value: unknown): value is ShortcutStoryType {
  return (
    typeof value === 'string' &&
    (SHORTCUT_STORY_TYPES as readonly string[]).includes(value)
  )
}

export type ShortcutWorkflowStateOption = {
  id: number
  name: string
  workflowName: string
  type: string
}

export type ShortcutGroupOption = {
  id: string
  name: string
}

type RawWorkflow = {
  name?: unknown
  states?: unknown
}

type RawState = {
  id?: unknown
  name?: unknown
  type?: unknown
  position?: unknown
}

/**
 * Flattens `GET /api/v3/workflows` into one list of states, labelled with the
 * workflow they belong to. Unknown or malformed entries are skipped.
 */
export function parseShortcutWorkflowStates(
  body: unknown,
): ShortcutWorkflowStateOption[] {
  if (!Array.isArray(body)) {
    return []
  }

  const result: ShortcutWorkflowStateOption[] = []

  for (const rawWorkflow of body as RawWorkflow[]) {
    if (!rawWorkflow || !Array.isArray(rawWorkflow.states)) {
      continue
    }

    const workflowName =
      typeof rawWorkflow.name === 'string' ? rawWorkflow.name : 'Workflow'
    const states = (rawWorkflow.states as RawState[])
      .filter(
        (state) =>
          state &&
          typeof state.id === 'number' &&
          Number.isInteger(state.id) &&
          typeof state.name === 'string',
      )
      .sort(
        (a, b) =>
          (typeof a.position === 'number' ? a.position : 0) -
          (typeof b.position === 'number' ? b.position : 0),
      )

    for (const state of states) {
      result.push({
        id: state.id as number,
        name: state.name as string,
        workflowName,
        type: typeof state.type === 'string' ? state.type : '',
      })
    }
  }

  return result
}

/** Parses `GET /api/v3/groups` (teams), dropping archived ones. */
export function parseShortcutGroups(body: unknown): ShortcutGroupOption[] {
  if (!Array.isArray(body)) {
    return []
  }

  return (body as Array<{ id?: unknown; name?: unknown; archived?: unknown }>)
    .filter(
      (group) =>
        group &&
        typeof group.id === 'string' &&
        typeof group.name === 'string' &&
        group.archived !== true,
    )
    .map((group) => ({ id: group.id as string, name: group.name as string }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function formatWorkflowStateLabel(
  state: Pick<ShortcutWorkflowStateOption, 'name' | 'workflowName'>,
): string {
  return `${state.workflowName} · ${state.name}`
}

export type StoryDescriptionSection = {
  heading: string
  content: string
  /** Render each non-empty line as a numbered list item. */
  numbered?: boolean
}

/**
 * Builds a Markdown story description (Shortcut renders Markdown):
 * a `### Heading` per section, `-` for empty sections so the structure is
 * always visible, and an optional footer separated by a rule.
 */
export function buildShortcutDescription(
  sections: StoryDescriptionSection[],
  footer?: string,
): string {
  const parts = sections.map((section) => {
    const lines = section.content
      .replace(/\r\n/g, '\n')
      .trim()
      .split('\n')
      .map((line) => line.trimEnd())

    let body: string

    if (lines.every((line) => !line.trim())) {
      body = '-'
    } else if (section.numbered) {
      body = lines
        .filter((line) => line.trim())
        .map((line, index) => `${index + 1}. ${line.trim()}`)
        .join('\n')
    } else {
      body = lines.join('\n')
    }

    return `### ${section.heading}\n${body}`
  })

  if (footer?.trim()) {
    parts.push(`---\n${footer.trim()}`)
  }

  return parts.join('\n\n')
}

/**
 * Turns a Shortcut HTTP failure into a message a TMS user can act on.
 */
export function describeShortcutHttpError(
  status: number,
  rawMessage = '',
): string {
  if (status === 401) {
    return 'Shortcut rejected the API token. Check it in Project settings → Integrations.'
  }

  if (status === 403) {
    return 'The Shortcut API token has no permission for this action.'
  }

  if (status === 404) {
    return 'Shortcut could not find the selected workflow state or team. Re-select them in Project settings → Integrations.'
  }

  if (status === 429) {
    return 'Shortcut rate limit reached. Try again in a minute.'
  }

  const cleaned = rawMessage.trim().slice(0, 200)

  return cleaned
    ? `Shortcut returned ${status}: ${cleaned}`
    : `Shortcut returned ${status}.`
}
