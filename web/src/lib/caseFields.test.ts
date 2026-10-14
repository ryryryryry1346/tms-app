import { describe, expect, it } from 'vitest'
import { parseRefs, parseTags, serializeRefs, serializeTags } from './caseFields'

describe('parseTags', () => {
  it('parses a JSON array', () => {
    expect(parseTags('["smoke","auth"]')).toEqual(['smoke', 'auth'])
  })

  it('falls back to comma-separated text', () => {
    expect(parseTags('smoke, auth ,smoke')).toEqual(['smoke', 'auth'])
  })

  it('trims, dedupes case-insensitively, drops empties', () => {
    expect(parseTags('["  Smoke ","smoke","",  "Auth"]')).toEqual([
      'Smoke',
      'Auth',
    ])
  })

  it('handles null/empty', () => {
    expect(parseTags(null)).toEqual([])
    expect(parseTags('')).toEqual([])
  })
})

describe('serializeTags round-trip', () => {
  it('normalizes and re-parses', () => {
    const raw = serializeTags([' a ', 'A', 'b'])
    expect(parseTags(raw)).toEqual(['a', 'b'])
  })
})

describe('parseRefs', () => {
  it('parses label+url objects', () => {
    const raw = JSON.stringify([
      { label: 'JIRA-1', url: 'https://j/1' },
      { label: '', url: 'https://j/2' },
      { label: 'no-url', url: '' },
      'garbage',
    ])
    expect(parseRefs(raw)).toEqual([
      { label: 'JIRA-1', url: 'https://j/1' },
      { label: 'https://j/2', url: 'https://j/2' },
    ])
  })

  it('returns [] for non-array / empty', () => {
    expect(parseRefs(null)).toEqual([])
    expect(parseRefs('not json')).toEqual([])
    expect(parseRefs('{}')).toEqual([])
  })
})

describe('serializeRefs round-trip', () => {
  it('drops urlless rows and defaults label to url', () => {
    const raw = serializeRefs([
      { label: ' ', url: ' https://x ' },
      { label: 'L', url: 'https://y' },
      { label: 'z', url: '' },
    ])
    expect(parseRefs(raw)).toEqual([
      { label: 'https://x', url: 'https://x' },
      { label: 'L', url: 'https://y' },
    ])
  })
})
