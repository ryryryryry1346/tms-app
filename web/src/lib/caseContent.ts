/**
 * Test case content model.
 *
 * Structured cases store everything as JSON in the `tests.steps` column:
 *   { "description": string, "steps": [{ "action": string, "expected": string }] }
 *
 * Legacy cases predate this: `tests.steps` holds free rich-text and
 * `tests.expected` holds the expected-result rich-text. parseCaseContent
 * transparently handles both so the UI never breaks on old data.
 */
export type CaseStep = {
  action: string
  expected: string
}

export type CaseContent = {
  description: string
  steps: CaseStep[]
  /** Legacy "expected result" rich-text, only present for old free-text cases. */
  legacyExpected: string
  /** True when the case uses the structured steps format. */
  isStructured: boolean
}

function coerceStep(value: unknown): CaseStep | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const action = typeof record.action === 'string' ? record.action : ''
  const expected = typeof record.expected === 'string' ? record.expected : ''

  if (!action.trim() && !expected.trim()) {
    return null
  }

  return { action, expected }
}

export function parseCaseContent(
  stepsRaw: string | null | undefined,
  expectedRaw: string | null | undefined,
): CaseContent {
  const trimmed = stepsRaw?.trim() ?? ''

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>

      if (parsed && Array.isArray(parsed.steps)) {
        return {
          description:
            typeof parsed.description === 'string' ? parsed.description : '',
          steps: parsed.steps
            .map(coerceStep)
            .filter((step): step is CaseStep => step !== null),
          legacyExpected: '',
          isStructured: true,
        }
      }
    } catch {
      // Not valid JSON — fall through to legacy handling.
    }
  }

  return {
    description: stepsRaw ?? '',
    steps: [],
    legacyExpected: expectedRaw ?? '',
    isStructured: false,
  }
}

export function serializeCaseContent(
  description: string,
  steps: CaseStep[],
): string {
  const cleanSteps = steps
    .map((step) => ({
      action: step.action.trim(),
      expected: step.expected.trim(),
    }))
    .filter((step) => step.action || step.expected)

  return JSON.stringify({ description, steps: cleanSteps })
}

function stripHtmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|div|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Flattens a case's content to plain text (for CSV export / previews). */
export function flattenCaseContentToText(content: CaseContent): {
  steps: string
  expected: string
} {
  if (!content.isStructured) {
    return {
      steps: stripHtmlToText(content.description),
      expected: stripHtmlToText(content.legacyExpected),
    }
  }

  const description = stripHtmlToText(content.description)
  const stepLines = content.steps.map(
    (step, index) =>
      `${index + 1}. ${step.action}${
        step.expected ? ` => ${step.expected}` : ''
      }`,
  )
  const expectedLines = content.steps
    .map((step, index) => (step.expected ? `${index + 1}. ${step.expected}` : null))
    .filter((line): line is string => line !== null)

  return {
    steps: [description, stepLines.join('\n')].filter(Boolean).join('\n\n'),
    expected: expectedLines.join('\n'),
  }
}
