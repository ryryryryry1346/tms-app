/**
 * Minimal dependency-free structured logger.
 *
 * Emits one JSON object per line to stdout/stderr, which hosting platforms
 * (Render, etc.) capture and make searchable. Keeping a single choke point
 * here means error tracking (e.g. Sentry) can later be wired in one place via
 * `onError` without touching call sites.
 */
type LogLevel = 'info' | 'warn' | 'error'

export type LogContext = Record<string, unknown>

let onError: ((message: string, context: LogContext) => void) | null = null

/** Register a sink for error-level logs (e.g. Sentry). Optional. */
export function setErrorSink(
  sink: (message: string, context: LogContext) => void,
): void {
  onError = sink
}

export function serializeError(error: unknown): LogContext {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack }
  }

  return { message: String(error) }
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  }

  const line = JSON.stringify(entry)

  if (level === 'error') {
    console.error(line)

    if (onError) {
      try {
        onError(message, context ?? {})
      } catch {
        // Never let the error sink break the request.
      }
    }
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.info(line)
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) =>
    emit('error', message, context),
}
