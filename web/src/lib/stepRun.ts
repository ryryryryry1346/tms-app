/**
 * Per-step run execution model.
 *
 * When a test case uses structured steps, each step gets its own verdict during
 * a run. Results are stored as JSON in `test_run_items.step_results`, aligned by
 * index to the steps snapshot captured when the run was created.
 */
export type StepRunStatus = 'Passed' | 'Failed' | 'Blocked' | 'Skipped'

export type StepResult = {
  status: StepRunStatus | null
  comment: string
}

/** Overall case verdict (Skipped never rolls up to a case-level status). */
export type CaseRunStatus = 'Passed' | 'Failed' | 'Blocked' | null

export const STEP_RUN_STATUSES: StepRunStatus[] = [
  'Passed',
  'Failed',
  'Blocked',
  'Skipped',
]

function isStepRunStatus(value: unknown): value is StepRunStatus {
  return (
    value === 'Passed' ||
    value === 'Failed' ||
    value === 'Blocked' ||
    value === 'Skipped'
  )
}

function emptyStepResult(): StepResult {
  return { status: null, comment: '' }
}

/**
 * Parses stored step results into an array sized to `stepCount`. Missing or
 * malformed entries become empty (untested) results, so the editor always has a
 * slot per step even if the snapshot grew.
 */
export function parseStepResults(
  raw: string | null | undefined,
  stepCount: number,
): StepResult[] {
  let parsed: unknown[] = []

  if (raw && raw.trim().startsWith('[')) {
    try {
      const value = JSON.parse(raw)
      if (Array.isArray(value)) {
        parsed = value
      }
    } catch {
      // Fall through to empty results.
    }
  }

  const results: StepResult[] = []

  for (let index = 0; index < stepCount; index += 1) {
    const entry = parsed[index]

    if (entry && typeof entry === 'object') {
      const record = entry as Record<string, unknown>
      results.push({
        status: isStepRunStatus(record.status) ? record.status : null,
        comment: typeof record.comment === 'string' ? record.comment : '',
      })
    } else {
      results.push(emptyStepResult())
    }
  }

  return results
}

export function serializeStepResults(results: StepResult[]): string {
  return JSON.stringify(
    results.map((result) => ({
      status: result.status,
      comment: result.comment.trim(),
    })),
  )
}

/**
 * Derives the overall case verdict from its step results:
 *   - any Failed  -> Failed
 *   - else any Blocked -> Blocked
 *   - else if every step is decided (Passed/Skipped) and at least one Passed -> Passed
 *   - otherwise -> null (not fully executed yet)
 */
export function deriveCaseStatus(results: StepResult[]): CaseRunStatus {
  if (results.length === 0) {
    return null
  }

  if (results.some((result) => result.status === 'Failed')) {
    return 'Failed'
  }

  if (results.some((result) => result.status === 'Blocked')) {
    return 'Blocked'
  }

  const hasPassed = results.some((result) => result.status === 'Passed')
  const allDecided = results.every(
    (result) => result.status === 'Passed' || result.status === 'Skipped',
  )

  if (allDecided && hasPassed) {
    return 'Passed'
  }

  return null
}

export type StepRunProgress = {
  total: number
  decided: number
}

export function getStepRunProgress(results: StepResult[]): StepRunProgress {
  return {
    total: results.length,
    decided: results.filter((result) => result.status !== null).length,
  }
}
