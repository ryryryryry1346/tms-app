import { createFileRoute } from '@tanstack/react-router'
import {
  assertProjectApiToken,
  importJsonAutomationRun,
} from '../../features/automation/server'
import { logger, serializeError } from '../../lib/logger'

const MAX_IMPORT_BYTES = 20 * 1024 * 1024

export const Route = createFileRoute('/api/projects/$projectId/automation-runs')(
  {
    server: {
      handlers: {
        POST: async ({ request, params }) => {
          const projectId = Number(params.projectId)

          if (!Number.isInteger(projectId) || projectId <= 0) {
            return jsonResponse({ error: 'Invalid project id.' }, 400)
          }

          await assertProjectApiToken(
            projectId,
            request.headers.get('authorization'),
          )

          const contentLength = Number(
            request.headers.get('content-length') ?? '0',
          )

          if (contentLength > MAX_IMPORT_BYTES) {
            return jsonResponse(
              { error: 'Request body is too large. Maximum size is 20 MB.' },
              413,
            )
          }

          try {
            const payload = await request.json()
            const result = await importJsonAutomationRun({
              ...payload,
              projectId,
            })

            return jsonResponse(result, result.created ? 201 : 200)
          } catch (error) {
            if (error instanceof Response) {
              throw error
            }

            logger.error('json import failed', {
              projectId,
              ...serializeError(error),
            })

            return jsonResponse(
              {
                error: error instanceof Error ? error.message : 'Import failed.',
              },
              400,
            )
          }
        },
      },
    },
  },
)

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}
