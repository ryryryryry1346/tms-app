import { describe, expect, it } from 'vitest'
import {
  caseContentForEditing,
  flattenCaseContentToText,
  parseCaseContent,
  serializeCaseContent,
} from './caseContent'

describe('parseCaseContent', () => {
  it('parses structured JSON content', () => {
    const raw = JSON.stringify({
      description: '<p>Context</p>',
      steps: [{ action: 'Open page', expected: 'Page loads' }],
    })

    const content = parseCaseContent(raw, '')

    expect(content.isStructured).toBe(true)
    expect(content.description).toBe('<p>Context</p>')
    expect(content.steps).toEqual([
      { action: 'Open page', expected: 'Page loads' },
    ])
    expect(content.legacyExpected).toBe('')
  })

  it('treats legacy rich-text as unstructured', () => {
    const content = parseCaseContent('<p>Do the thing</p>', '<p>It works</p>')

    expect(content.isStructured).toBe(false)
    expect(content.description).toBe('<p>Do the thing</p>')
    expect(content.legacyExpected).toBe('<p>It works</p>')
    expect(content.steps).toEqual([])
  })

  it('drops empty steps and coerces missing fields', () => {
    const raw = JSON.stringify({
      steps: [
        { action: 'A', expected: '' },
        { action: '', expected: '' },
        { action: '', expected: 'B' },
        { foo: 'bar' },
      ],
    })

    const content = parseCaseContent(raw, '')

    expect(content.steps).toEqual([
      { action: 'A', expected: '' },
      { action: '', expected: 'B' },
    ])
  })

  it('falls back to legacy when JSON is malformed', () => {
    const content = parseCaseContent('{not valid json', 'exp')

    expect(content.isStructured).toBe(false)
    expect(content.description).toBe('{not valid json')
  })
})

describe('serializeCaseContent round-trip', () => {
  it('serializes and re-parses to the same structured content', () => {
    const steps = [
      { action: ' Open ', expected: ' Loaded ' },
      { action: '', expected: '' },
    ]

    const serialized = serializeCaseContent('<p>Desc</p>', steps)
    const parsed = parseCaseContent(serialized, '')

    expect(parsed.isStructured).toBe(true)
    expect(parsed.description).toBe('<p>Desc</p>')
    expect(parsed.steps).toEqual([{ action: 'Open', expected: 'Loaded' }])
  })
})

describe('caseContentForEditing', () => {
  it('returns structured content unchanged', () => {
    const raw = serializeCaseContent('<p>D</p>', [
      { action: 'A', expected: 'E' },
    ])

    expect(caseContentForEditing(raw, '')).toEqual({
      description: '<p>D</p>',
      steps: [{ action: 'A', expected: 'E' }],
    })
  })

  it('folds legacy expected into the description', () => {
    const result = caseContentForEditing('<p>Steps</p>', '<p>Outcome</p>')

    expect(result.steps).toEqual([])
    expect(result.description).toContain('<p>Steps</p>')
    expect(result.description).toContain('Expected result')
    expect(result.description).toContain('<p>Outcome</p>')
  })
})

describe('flattenCaseContentToText', () => {
  it('flattens structured steps to numbered plain text', () => {
    const content = parseCaseContent(
      serializeCaseContent('<p>Intro</p>', [
        { action: 'Click', expected: 'Opens' },
        { action: 'Type', expected: '' },
      ]),
      '',
    )

    const flat = flattenCaseContentToText(content)

    expect(flat.steps).toContain('Intro')
    expect(flat.steps).toContain('1. Click => Opens')
    expect(flat.steps).toContain('2. Type')
    expect(flat.expected).toBe('1. Opens')
  })

  it('strips HTML from legacy content', () => {
    const content = parseCaseContent('<p>Do<br>it</p>', '<p>Done</p>')
    const flat = flattenCaseContentToText(content)

    expect(flat.steps).toBe('Do\nit')
    expect(flat.expected).toBe('Done')
  })
})
