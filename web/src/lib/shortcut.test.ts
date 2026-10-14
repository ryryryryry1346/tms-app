import { describe, expect, it } from 'vitest'
import {
  buildShortcutDescription,
  describeShortcutHttpError,
  formatWorkflowStateLabel,
  isShortcutStoryType,
  parseShortcutGroups,
  parseShortcutWorkflowStates,
} from './shortcut'

describe('parseShortcutWorkflowStates', () => {
  it('flattens workflows into ordered states labelled with the workflow', () => {
    const states = parseShortcutWorkflowStates([
      {
        name: 'Engineering',
        states: [
          { id: 3, name: 'Done', type: 'done', position: 3 },
          { id: 1, name: 'Backlog', type: 'unstarted', position: 1 },
          { id: 2, name: 'In Progress', type: 'started', position: 2 },
        ],
      },
      { name: 'QA', states: [{ id: 10, name: 'To test', type: 'unstarted' }] },
    ])

    expect(states.map((state) => state.id)).toEqual([1, 2, 3, 10])
    expect(states[0]).toEqual({
      id: 1,
      name: 'Backlog',
      workflowName: 'Engineering',
      type: 'unstarted',
    })
    expect(formatWorkflowStateLabel(states[3])).toBe('QA · To test')
  })

  it('skips malformed data instead of throwing', () => {
    expect(parseShortcutWorkflowStates(null)).toEqual([])
    expect(parseShortcutWorkflowStates({ message: 'Unauthorized' })).toEqual([])
    expect(
      parseShortcutWorkflowStates([
        { name: 'W', states: [{ id: '7', name: 'Bad id' }, { id: 8 }] },
        { name: 'No states' },
      ]),
    ).toEqual([])
  })
})

describe('parseShortcutGroups', () => {
  it('keeps active teams sorted by name', () => {
    expect(
      parseShortcutGroups([
        { id: 'b-uuid', name: 'QA', archived: false },
        { id: 'a-uuid', name: 'Backend' },
        { id: 'c-uuid', name: 'Old team', archived: true },
        { id: 42, name: 'Broken' },
      ]),
    ).toEqual([
      { id: 'a-uuid', name: 'Backend' },
      { id: 'b-uuid', name: 'QA' },
    ])
  })
})

describe('buildShortcutDescription', () => {
  it('renders headings, numbered steps, empty placeholders and a footer', () => {
    const description = buildShortcutDescription(
      [
        { heading: 'Environment', content: '  Staging, Chrome 128  ' },
        { heading: 'Steps to reproduce', content: 'Open page\n\nClick save\n', numbered: true },
        { heading: 'Notes', content: '   ' },
      ],
      'Source: [Run #3](https://tms.example.com/run/3)',
    )

    expect(description).toBe(
      [
        '### Environment',
        'Staging, Chrome 128',
        '',
        '### Steps to reproduce',
        '1. Open page',
        '2. Click save',
        '',
        '### Notes',
        '-',
        '',
        '---',
        'Source: [Run #3](https://tms.example.com/run/3)',
      ].join('\n'),
    )
  })
})

describe('misc', () => {
  it('validates story types', () => {
    expect(isShortcutStoryType('bug')).toBe(true)
    expect(isShortcutStoryType('epic')).toBe(false)
    expect(isShortcutStoryType(undefined)).toBe(false)
  })

  it('describes common HTTP failures', () => {
    expect(describeShortcutHttpError(401)).toContain('API token')
    expect(describeShortcutHttpError(500, 'boom')).toBe('Shortcut returned 500: boom')
    expect(describeShortcutHttpError(502)).toBe('Shortcut returned 502.')
  })
})
