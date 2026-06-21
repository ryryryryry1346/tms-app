import { describe, expect, it } from 'vitest'
import {
  deriveCaseStatus,
  getStepRunProgress,
  parseStepResults,
  serializeStepResults,
  type StepResult,
} from './stepRun'

function results(...statuses: (StepResult['status'])[]): StepResult[] {
  return statuses.map((status) => ({ status, comment: '' }))
}

describe('parseStepResults', () => {
  it('sizes the array to stepCount, padding missing entries', () => {
    const raw = JSON.stringify([{ status: 'Passed', comment: 'ok' }])
    const parsed = parseStepResults(raw, 3)

    expect(parsed).toHaveLength(3)
    expect(parsed[0]).toEqual({ status: 'Passed', comment: 'ok' })
    expect(parsed[1]).toEqual({ status: null, comment: '' })
    expect(parsed[2]).toEqual({ status: null, comment: '' })
  })

  it('drops unknown statuses and non-string comments', () => {
    const raw = JSON.stringify([{ status: 'Nope', comment: 5 }])
    expect(parseStepResults(raw, 1)).toEqual([{ status: null, comment: '' }])
  })

  it('handles null / malformed input', () => {
    expect(parseStepResults(null, 2)).toEqual([
      { status: null, comment: '' },
      { status: null, comment: '' },
    ])
    expect(parseStepResults('garbage', 1)).toEqual([
      { status: null, comment: '' },
    ])
  })
})

describe('serializeStepResults round-trip', () => {
  it('trims comments and preserves status', () => {
    const raw = serializeStepResults([{ status: 'Failed', comment: '  bug ' }])
    expect(parseStepResults(raw, 1)).toEqual([
      { status: 'Failed', comment: 'bug' },
    ])
  })
})

describe('deriveCaseStatus', () => {
  it('returns Failed if any step failed', () => {
    expect(deriveCaseStatus(results('Passed', 'Failed', null))).toBe('Failed')
  })

  it('returns Blocked if blocked and none failed', () => {
    expect(deriveCaseStatus(results('Passed', 'Blocked'))).toBe('Blocked')
  })

  it('Failed wins over Blocked', () => {
    expect(deriveCaseStatus(results('Blocked', 'Failed'))).toBe('Failed')
  })

  it('returns Passed when all decided and at least one passed', () => {
    expect(deriveCaseStatus(results('Passed', 'Passed'))).toBe('Passed')
    expect(deriveCaseStatus(results('Passed', 'Skipped'))).toBe('Passed')
  })

  it('returns null when not fully executed', () => {
    expect(deriveCaseStatus(results('Passed', null))).toBeNull()
    expect(deriveCaseStatus(results('Skipped', 'Skipped'))).toBeNull()
    expect(deriveCaseStatus([])).toBeNull()
  })
})

describe('getStepRunProgress', () => {
  it('counts decided steps', () => {
    expect(getStepRunProgress(results('Passed', null, 'Blocked'))).toEqual({
      total: 3,
      decided: 2,
    })
  })
})
