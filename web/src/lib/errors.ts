/**
 * Message shown when a network filter (WAF / hosting firewall) rejects a
 * request before it reaches the app. The filter replies with a full HTML
 * page, which must never be shown to a user as an error message.
 */
export const BLOCKED_BY_FILTER_MESSAGE =
  'The request was blocked by a network filter. The text probably contains a fragment that looks like an attack, such as a bash command, SQL or XML. Remove it and try again.'

function looksLikeHtml(message: string): boolean {
  const head = message.slice(0, 200).toLowerCase()

  return (
    head.startsWith('<!doctype') ||
    head.startsWith('<html') ||
    head.includes('<head>') ||
    head.includes('<title>')
  )
}

function readMessage(error: unknown): string | null {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message
  }

  return null
}

/**
 * Turns a thrown value into a user-facing message.
 *
 * Server functions validate input with Zod; when validation fails the thrown
 * Error's message is a serialized issues array (JSON starting with `[` or `{`).
 * That is meaningless to users, so we fall back to a friendly message in that
 * case and only surface real, human-readable error text. A raw HTML page
 * (a firewall block page) is replaced with an explanation.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const raw = readMessage(error)

  if (raw === null) {
    return fallback
  }

  const message = raw.trim()

  if (looksLikeHtml(message)) {
    return BLOCKED_BY_FILTER_MESSAGE
  }

  if (message.startsWith('[') || message.startsWith('{')) {
    return fallback
  }

  return message
}
