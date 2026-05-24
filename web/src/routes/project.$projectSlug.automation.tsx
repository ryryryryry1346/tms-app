import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import {
  createProjectApiToken,
  getProjectApiTokens,
  revokeProjectApiToken,
  type ProjectApiTokenSummary,
} from '../features/automation/server'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute('/project/$projectSlug/automation')({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()

    if (!projectSlug) {
      throw notFound()
    }

    const numericProjectId = Number(projectSlug)

    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      const legacyDashboard = await getDashboardState({
        data: {
          projectId: numericProjectId,
        },
      })

      const legacyProject =
        legacyDashboard.projects.find((item) => item.id === numericProjectId) ??
        null

      if (!legacyProject?.slug) {
        throw notFound()
      }

      if (legacyProject.slug !== projectSlug) {
        throw redirect({
          to: '/project/$projectSlug/automation',
          params: {
            projectSlug: legacyProject.slug,
          },
          replace: true,
        })
      }
    }

    const dashboard = await getDashboardState({
      data: {
        projectSlug,
      },
    })

    const project =
      dashboard.projects.find((item) => item.slug === projectSlug) ?? null
    const selectedProjectId = dashboard.selectedProjectId ?? project?.id ?? null

    if (!project || !selectedProjectId) {
      throw notFound()
    }

    const tokenState = await getProjectApiTokens({
      data: {
        projectId: selectedProjectId,
      },
    })

    return {
      project,
      tokens: tokenState.tokens,
    }
  },
  component: ProjectAutomationPage,
})

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function CodeBlock({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: (value: string) => void
}) {
  return (
    <div className="rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)]">
      <div className="flex items-center justify-between border-b border-[var(--tms-border-subtle)] px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
          {label}
        </span>
        <Button size="sm" onClick={() => onCopy(value)}>
          Copy
        </Button>
      </div>
      <pre className="m-0 overflow-auto p-3 text-xs leading-6 text-[var(--tms-text)]">
        <code>{value}</code>
      </pre>
    </div>
  )
}

function ProjectAutomationPage() {
  const { project, tokens: initialTokens } = Route.useLoaderData()
  const [tokens, setTokens] = useState<ProjectApiTokenSummary[]>(initialTokens)
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [revokingTokenId, setRevokingTokenId] = useState<number | null>(null)
  const activeTokenCount = tokens.filter((token) => token.status === 'active').length
  const origin =
    typeof window === 'undefined'
      ? 'https://tms-app-web-staging.onrender.com'
      : window.location.origin
  const junitEndpoint = `${origin}/api/projects/${project.id}/automation-runs/import/junit`
  const jsonEndpoint = `${origin}/api/projects/${project.id}/automation-runs`
  const curlExample = `curl -X POST "${junitEndpoint}" \\
  -H "Authorization: Bearer <project-api-token>" \\
  -F "file=@junit.xml" \\
  -F "name=Playwright staging" \\
  -F "environment=staging" \\
  -F "branch=main" \\
  -F "commit=abc123" \\
  -F "triggerSource=ci"`
  const githubExample = `- name: Upload JUnit results to TMS
  run: |
    curl -X POST "${junitEndpoint}" \\
      -H "Authorization: Bearer \${{ secrets.TMS_PROJECT_TOKEN }}" \\
      -F "file=@test-results/junit.xml" \\
      -F "name=GitHub Actions regression" \\
      -F "environment=staging" \\
      -F "branch=\${{ github.ref_name }}" \\
      -F "commit=\${{ github.sha }}" \\
      -F "ciBuildUrl=\${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}" \\
      -F "triggerSource=ci"`
  const jsonExample = `curl -X POST "${jsonEndpoint}" \\
  -H "Authorization: Bearer <project-api-token>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Nightly regression",
    "environment": "staging",
    "branch": "main",
    "commitSha": "abc123",
    "triggerSource": "ci",
    "results": [
      {
        "name": "Login with valid credentials",
        "suite": "auth.spec.ts",
        "status": "passed",
        "durationMs": 1240,
        "caseId": "TMS-142"
      }
    ]
  }'`

  async function copyText(value: string): Promise<void> {
    await navigator.clipboard?.writeText(value)
  }

  async function handleCreateToken(): Promise<void> {
    setErrorMessage(null)
    setIsCreating(true)

    try {
      const result = await createProjectApiToken({
        data: {
          projectId: project.id,
          name: tokenName.trim() || undefined,
        },
      })

      setTokens((current) => [result.tokenRecord, ...current])
      setNewToken(result.token)
      setTokenName('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not create API token.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRevokeToken(tokenId: number): Promise<void> {
    setErrorMessage(null)
    setRevokingTokenId(tokenId)

    try {
      await revokeProjectApiToken({
        data: {
          projectId: project.id,
          tokenId,
        },
      })

      setTokens((current) =>
        current.map((token) =>
          token.id === tokenId ? { ...token, status: 'revoked' } : token,
        ),
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not revoke API token.',
      )
    } finally {
      setRevokingTokenId(null)
    }
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            description="Connect CI/CD pipelines and upload automation test results into this project."
            actions={
              <Badge variant="primary">
                {activeTokenCount} active token{activeTokenCount === 1 ? '' : 's'}
              </Badge>
            }
          />

          {errorMessage ? (
            <Alert variant="danger" title="Automation token error">
              {errorMessage}
            </Alert>
          ) : null}

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="Project API token"
              description="Generate a token for CI jobs. Store it as a CI secret; the full token is shown only once."
              className="mb-4"
            />

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={tokenName}
                onChange={(event) => setTokenName(event.target.value)}
                placeholder="Token name, e.g. GitHub Actions staging"
              />
              <Button
                variant="primary"
                disabled={isCreating}
                onClick={handleCreateToken}
              >
                {isCreating ? 'Creating...' : 'Generate token'}
              </Button>
            </div>

            {newToken ? (
              <Alert
                variant="success"
                title="Copy this token now"
                className="mt-4"
                action={
                  <Button size="sm" onClick={() => copyText(newToken)}>
                    Copy token
                  </Button>
                }
              >
                <code className="break-all text-xs">{newToken}</code>
              </Alert>
            ) : null}
          </Panel>

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="Tokens"
              description="Active tokens can upload JUnit XML or JSON automation runs for this project."
              className="mb-4"
            />

            {tokens.length === 0 ? (
              <EmptyState
                title="No project tokens"
                description="Generate a token before wiring CI/CD to this project."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--tms-border-subtle)]">
                <div className="grid grid-cols-[minmax(180px,1fr)_130px_160px_160px_auto] gap-3 border-b border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                  <span>Name</span>
                  <span>Prefix</span>
                  <span>Last used</span>
                  <span>Created</span>
                  <span>Status</span>
                </div>
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="grid grid-cols-[minmax(180px,1fr)_130px_160px_160px_auto] items-center gap-3 border-b border-[var(--tms-border-subtle)] px-4 py-3 last:border-b-0"
                  >
                    <span className="font-semibold text-[var(--tms-text)]">
                      {token.name}
                    </span>
                    <code className="text-xs text-[var(--tms-text-muted)]">
                      {token.tokenPrefix}...
                    </code>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {formatDate(token.lastUsedAt)}
                    </span>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {formatDate(token.createdAt)}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Badge
                        variant={token.status === 'active' ? 'success' : 'draft'}
                      >
                        {token.status}
                      </Badge>
                      {token.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={revokingTokenId === token.id}
                          onClick={() => handleRevokeToken(token.id)}
                        >
                          {revokingTokenId === token.id ? 'Revoking...' : 'Revoke'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="CI upload examples"
              description="Use the token as a secret. JUnit XML is the first supported import format; JSON is available for custom runners."
              className="mb-4"
            />

            <div className="grid gap-4 xl:grid-cols-2">
              <CodeBlock label="JUnit curl" value={curlExample} onCopy={copyText} />
              <CodeBlock
                label="GitHub Actions"
                value={githubExample}
                onCopy={copyText}
              />
              <CodeBlock label="JSON API" value={jsonExample} onCopy={copyText} />
              <div className="rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-4">
                <h3 className="m-0 text-sm font-semibold text-[var(--tms-text)]">
                  Supported metadata
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--tms-text-muted)]">
                  Send run name, environment, branch, commit SHA, CI build URL,
                  and trigger source. Results can be linked to manual cases with
                  a case key like TMS-142.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  )
}
