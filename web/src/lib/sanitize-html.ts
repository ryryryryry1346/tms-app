import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize user-authored rich text (Tiptap output) before rendering it via
 * dangerouslySetInnerHTML. Runs isomorphically (server + client) so SSR output
 * is also safe. Strips scripts, event handlers, javascript: URLs, etc.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) {
    return ''
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  })
}
