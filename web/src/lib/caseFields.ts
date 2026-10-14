/**
 * Optional structured metadata for a test case.
 *
 * - `tags`  : free-form labels, stored as a JSON string array in `tests.tags`.
 * - `refs`  : requirement / issue links, stored as JSON `{label,url}[]` in
 *             `tests.refs`.
 * Both helpers tolerate legacy/empty values and never throw on bad input.
 */
export type CaseRef = {
  label: string
  url: string
}

export function parseTags(raw: string | null | undefined): string[] {
  const trimmed = raw?.trim() ?? ''

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return normalizeTags(
          parsed.filter((item): item is string => typeof item === 'string'),
        )
      }
    } catch {
      // fall through to comma handling
    }
  }

  if (!trimmed) {
    return []
  }

  return normalizeTags(trimmed.split(','))
}

function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const tag of tags) {
    const clean = tag.trim()
    if (!clean) {
      continue
    }
    const key = clean.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    result.push(clean)
  }

  return result
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(normalizeTags(tags))
}

export function parseRefs(raw: string | null | undefined): CaseRef[] {
  const trimmed = raw?.trim() ?? ''

  if (!trimmed.startsWith('[')) {
    return []
  }

  try {
    const parsed = JSON.parse(trimmed)
    if (!Array.isArray(parsed)) {
      return []
    }

    const result: CaseRef[] = []
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') {
        continue
      }
      const record = entry as Record<string, unknown>
      const url = typeof record.url === 'string' ? record.url.trim() : ''
      if (!url) {
        continue
      }
      const label =
        typeof record.label === 'string' && record.label.trim()
          ? record.label.trim()
          : url
      result.push({ label, url })
    }

    return result
  } catch {
    return []
  }
}

export function serializeRefs(refs: CaseRef[]): string {
  const cleaned = refs
    .map((ref) => ({
      label: ref.label.trim(),
      url: ref.url.trim(),
    }))
    .filter((ref) => ref.url)
    .map((ref) => ({ label: ref.label || ref.url, url: ref.url }))

  return JSON.stringify(cleaned)
}
