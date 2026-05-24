import { createFileRoute } from '@tanstack/react-router'
import {
  assertProjectApiToken,
  importJsonAutomationRun,
} from '../../features/automation/server'

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
