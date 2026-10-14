import { describe, expect, it } from 'vitest'
import { buildDocToc, estimateReadingMinutes } from './docToc'

describe('buildDocToc', () => {
  it('numbers h2/h3 headings and lists them in order', () => {
    const result = buildDocToc(
      '<h2>Auth</h2><p>x</p><h3>Login &amp; tokens</h3><h2><strong>Errors</strong></h2>',
    )

    expect(result.items).toEqual([
      { id: 'sec-1', text: 'Auth', level: 2 },
      { id: 'sec-2', text: 'Login & tokens', level: 3 },
      { id: 'sec-3', text: 'Errors', level: 2 },
    ])
    expect(result.html).toContain('<h2 id="sec-1">Auth</h2>')
    expect(result.html).toContain('<h2 id="sec-3"><strong>Errors</strong></h2>')
  })

  it('replaces an existing id and skips empty headings', () => {
    const result = buildDocToc('<h2 id="old" class="a">Hi</h2><h3> </h3>')

    expect(result.items).toHaveLength(1)
    expect(result.html).toContain('<h2 class="a" id="sec-1">Hi</h2>')
    expect(result.html).toContain('<h3> </h3>')
  })

  it('ignores h1 and h4', () => {
    expect(buildDocToc('<h1>A</h1><h4>B</h4>').items).toEqual([])
  })
})

describe('estimateReadingMinutes', () => {
  it('is 0 for empty content and at least 1 otherwise', () => {
    expect(estimateReadingMinutes('<p> </p>')).toBe(0)
    expect(estimateReadingMinutes('<p>short</p>')).toBe(1)
  })

  it('rounds up per 200 words', () => {
    const words = Array.from({ length: 450 }, () => 'word').join(' ')

    expect(estimateReadingMinutes(`<p>${words}</p>`)).toBe(3)
  })
})
