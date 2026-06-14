/**
 * Turns a thrown value into a user-facing message.
 *
 * Server functions validate input with Zod; when validation fails the thrown
 * Error's message is a serialized issues array (JSON starting with `[` or `{`).
 * That is meaningless to users, so we fall back to a friendly message in that
 * case and only surface real, human-readable error text.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    const message = error.message.trim()

    if (message.startsWith('[') || message.startsWith('{')) {
      return fallback
    }

    return message
  }

  return fallback
}
