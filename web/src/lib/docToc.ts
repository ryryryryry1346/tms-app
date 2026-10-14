/**
 * Helpers for the read-only article view: the "On this page" outline built
 * from the h2/h3 headings, and a reading-time estimate. Pure string work so
 * it behaves the same on the server and in the browser.
 */

export type DocTocItem = {
  id: string
  text: string
  level: 2 | 3
}

const HEADING_PATTERN = /<h([23])((?:\s[^>]*)?)>([\s\S]*?)<\/h\1>/gi

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

export function htmlToPlainText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Gives every non-empty h2/h3 a stable `sec-N` id (replacing any existing
 * id) and returns the outline. Empty headings are left untouched.
 */
export function buildDocToc(html: string): { html: string; items: DocTocItem[] } {
  const items: DocTocItem[] = []

  const withIds = html.replace(
    HEADING_PATTERN,
    (match, level: string, attributes: string, inner: string) => {
      const text = htmlToPlainText(inner)

      if (text.length === 0) {
        return match
      }

      const id = `sec-${items.length + 1}`
      const cleanAttributes = attributes.replace(/\sid\s*=\s*("[^"]*"|'[^']*'|\S+)/i, '')

      items.push({ id, text, level: level === '2' ? 2 : 3 })

      return `<h${level}${cleanAttributes} id="${id}">${inner}</h${level}>`
    },
  )

  return { html: withIds, items }
}

/** Whole minutes at ~200 words per minute; 0 for an empty article. */
export function estimateReadingMinutes(html: string): number {
  const text = htmlToPlainText(html)

  if (text.length === 0) {
    return 0
  }

  return Math.max(1, Math.ceil(text.split(' ').length / 200))
}
