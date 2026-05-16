const REPOSITORY_PREVIEW_STALE_KEY = 'tms.repository.preview.stale'

function readPreviewStaleMap(): Record<string, number> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(REPOSITORY_PREVIEW_STALE_KEY)

    if (!rawValue) {
      return {}
    }

    const parsedValue = JSON.parse(rawValue)

    if (!parsedValue || typeof parsedValue !== 'object') {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number',
      ),
    )
  } catch {
    return {}
  }
}

export function getRepositoryPreviewDetailStaleAt(testId: number): number {
  return readPreviewStaleMap()[testId.toString()] ?? 0
}

export function markRepositoryPreviewDetailStale(testId: number): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      REPOSITORY_PREVIEW_STALE_KEY,
      JSON.stringify({
        ...readPreviewStaleMap(),
        [testId]: Date.now(),
      }),
    )
  } catch {
    // Preview cache invalidation is best-effort.
  }
}
