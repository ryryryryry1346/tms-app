import { createFileRoute } from '@tanstack/react-router'

// Serves media uploaded with STORAGE_DRIVER=local (see
// features/media/local-storage.server.ts). Signed-in users only.
// Supports HTTP Range requests so videos can be streamed and seeked.

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  // Opened directly in a tab, a media file must not be able to run anything.
  'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox",
}

function plainResponse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS },
  })
}

async function serveMedia(request: Request, splat: string | undefined): Promise<Response> {
  const { auth } = await import('../../../lib/auth')
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user) {
    return plainResponse(401, 'Sign in to view this file.')
  }

  const { resolveLocalMediaPath } = await import(
    '../../../features/media/local-storage.server'
  )
  const resolved = resolveLocalMediaPath(splat ?? '')

  if (!resolved) {
    return plainResponse(404, 'Not found.')
  }

  const { stat } = await import('node:fs/promises')
  const { createReadStream } = await import('node:fs')
  const { Readable } = await import('node:stream')

  let size: number

  try {
    const fileStat = await stat(resolved.filePath)

    if (!fileStat.isFile()) {
      return plainResponse(404, 'Not found.')
    }

    size = fileStat.size
  } catch {
    return plainResponse(404, 'Not found.')
  }

  const baseHeaders: Record<string, string> = {
    'Content-Type': resolved.contentType,
    'Accept-Ranges': 'bytes',
    // File names are random and never reused, so the content never changes.
    'Cache-Control': 'private, max-age=31536000, immutable',
    ...SECURITY_HEADERS,
  }

  const isHead = request.method === 'HEAD'
  const rangeHeader = request.headers.get('range')
  const rangeMatch = rangeHeader ? /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim()) : null

  if (rangeHeader && rangeMatch && size > 0) {
    let start: number
    let end: number

    if (rangeMatch[1] === '') {
      // "bytes=-N": the last N bytes.
      const suffixLength = Number(rangeMatch[2])
      start = Math.max(0, size - suffixLength)
      end = size - 1
    } else {
      start = Number(rangeMatch[1])
      end = rangeMatch[2] === '' ? size - 1 : Math.min(Number(rangeMatch[2]), size - 1)
    }

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
      return new Response(null, {
        status: 416,
        headers: { ...baseHeaders, 'Content-Range': `bytes */${size}` },
      })
    }

    const headers = {
      ...baseHeaders,
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
    }

    if (isHead) {
      return new Response(null, { status: 206, headers })
    }

    const stream = Readable.toWeb(
      createReadStream(resolved.filePath, { start, end }),
    ) as unknown as ReadableStream<Uint8Array>

    return new Response(stream, { status: 206, headers })
  }

  const headers = { ...baseHeaders, 'Content-Length': String(size) }

  if (isHead) {
    return new Response(null, { status: 200, headers })
  }

  const stream = Readable.toWeb(
    createReadStream(resolved.filePath),
  ) as unknown as ReadableStream<Uint8Array>

  return new Response(stream, { status: 200, headers })
}

export const Route = createFileRoute('/api/media/$')({
  server: {
    handlers: {
      GET: async ({ request, params }) => serveMedia(request, params._splat),
      HEAD: async ({ request, params }) => serveMedia(request, params._splat),
    },
  },
})
