import { createFileRoute } from '@tanstack/react-router'
import {
  assertProjectApiToken,
  importJunitAutomationRun,
} from '../../features/automation/server'

const MAX_IMPORT_BYTES = 20 * 1024 * 1024

// Basic fixed-window rate limit for the import endpoint.
// NOTE: in-memory only — fine for a single instance. For multi-instance
// deployments move this to a shared store (e.g. Redis).
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30
const importRateLimitBuckets = new Map<
  string,
  { count: number; resetAt: number }
>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const bucket = importRateLimitBuckets.get(key)

  if (!bucket || now > bucket.resetAt) {
    importRateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return false
  }

  bucket.count += 1
  return bucket.count > RATE_LIMIT_MAX
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }

  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

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

        if (isRateLimited(`${projectId}:${getClientIp(request)}`)) {
          return jsonResponse(
            { error: 'Too many import requests. Try again in a minute.' },
            429,
          )
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

          if (file.size > MAX_IMPORT_BYTES) {
            return jsonResponse(
              { error: 'JUnit file is too large. Maximum size is 20 MB.' },
              413,
            )
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
