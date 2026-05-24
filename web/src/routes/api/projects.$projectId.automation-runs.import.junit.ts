import { createFileRoute } from '@tanstack/react-router'
import {
  assertProjectApiToken,
  importJunitAutomationRun,
} from '../../features/automation/server'

export const Route = createFileRoute(
  '/api/projects/$projectId/automation-runs/import/junit',
)({
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
          const formData = await request.formData()
          const file = formData.get('file')

          if (!(file instanceof File)) {
            return jsonResponse({ error: 'Upload a JUnit XML file.' }, 400)
          }

          const xml = await file.text()
          const result = await importJunitAutomationRun({
            projectId,
            xml,
            name: readFormString(formData, 'name'),
            externalId: readFormString(formData, 'externalId'),
            environment: readFormString(formData, 'environment'),
            branch: readFormString(formData, 'branch'),
            commitSha:
              readFormString(formData, 'commitSha') ??
              readFormString(formData, 'commit'),
            ciBuildUrl: readFormString(formData, 'ciBuildUrl'),
            triggerSource: readTriggerSource(formData),
          })

          return jsonResponse(result, result.created ? 201 : 200)
        } catch (error) {
          if (error instanceof Response) {
            throw error
          }

          return jsonResponse(
            { error: error instanceof Error ? error.message : 'Import failed.' },
            400,
          )
        }
      },
    },
  },
})

function readFormString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)

  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()

  return trimmed || undefined
}

function readTriggerSource(
  formData: FormData,
): 'manual' | 'ci' | 'api' | undefined {
  const value = readFormString(formData, 'triggerSource')

  return value === 'manual' || value === 'ci' || value === 'api'
    ? value
    : undefined
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
    },
  })
}
