import { describe, expect, it } from 'vitest'
import { BLOCKED_BY_FILTER_MESSAGE, getErrorMessage } from './errors'

describe('getErrorMessage', () => {
  it('returns a readable error message as is', () => {
    expect(getErrorMessage(new Error('Title is required'), 'fallback')).toBe(
      'Title is required',
    )
  })

  it('falls back for serialized validation issues', () => {
    expect(getErrorMessage(new Error('[{"code":"too_small"}]'), 'fallback')).toBe(
      'fallback',
    )
  })

  it('replaces a firewall block page with a friendly message', () => {
    const page = '<!DOCTYPE html><html><head><title>Blocked</title></head></html>'

    expect(getErrorMessage(new Error(page), 'fallback')).toBe(
      BLOCKED_BY_FILTER_MESSAGE,
    )
  })

  it('reads message from plain objects and uses the fallback otherwise', () => {
    expect(getErrorMessage({ message: 'Oops' }, 'fallback')).toBe('Oops')
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
