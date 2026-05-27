import {
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button, buttonVariants } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { cx } from '../components/ui/utils'
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

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10)
  }

  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function CodeBlock({
  label,
  value,
  onCopy,
  description,
}: {
  label: string
  value: string
  onCopy: (value: string) => void
  description?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)]">
      <div className="flex items-center justify-between border-b border-[var(--tms-border-subtle)] px-3 py-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
            {label}
          </span>
          {description ? (
            <p className="m-0 mt-1 text-xs text-[var(--tms-text-muted)]">
              {description}
            </p>
          ) : null}
        </div>
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

function EndpointCard({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy: (value: string) => void
}) {
  return (
    <div className="grid gap-2 rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
          {label}
        </span>
        <Button size="sm" onClick={() => onCopy(value)}>
          Copy endpoint
        </Button>
      </div>
      <code className="break-all text-xs leading-5 text-[var(--tms-text)]">
        {value}
      </code>
    </div>
  )
}

function IntegrationStep({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] text-xs font-semibold text-[var(--tms-text-muted)]">
        {step}
      </span>
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--tms-text)]">
          {title}
        </p>
        <p className="m-0 mt-1 text-sm leading-5 text-[var(--tms-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  )
}

function ProjectAutomationPage() {
  const { project, tokens: initialTokens } = Route.useLoaderData()
  const { projectSlug } = Route.useParams()
  const location = useLocation()
  const automationRootPath = `/project/${projectSlug}/automation`
  const currentPath = location.pathname.replace(/\/+$/, '')

  if (currentPath !== automationRootPath) {
    return <Outlet />
  }

  return <ProjectAutomationIndex project={project} initialTokens={initialTokens} />
}

function ProjectAutomationIndex({
  project,
  initialTokens,
}: {
  project: {
    id: number
    name: string
    slug: string | null
  }
  initialTokens: ProjectApiTokenSummary[]
}) {
  const [tokens, setTokens] = useState<ProjectApiTokenSummary[]>(initialTokens)
  const [tokenName, setTokenName] = useState('')
  const [newToken, setNewToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [revokingTokenId, setRevokingTokenId] = useState<number | null>(null)
  const [origin, setOrigin] = useState('https://tms-app-web-staging.onrender.com')
  const activeTokenCount = tokens.filter((token) => token.status === 'active').length
  const junitEndpoint = `${origin}/api/projects/${project.id}/automation-runs/import/junit`
  const jsonEndpoint = `${origin}/api/projects/${project.id}/automation-runs`
  const runsHref = `/project/${project.slug ?? project.id.toString()}/automation/runs`

  const curlExample = `curl -X POST "${junitEndpoint}" \\
  -H "Authorization: Bearer <project-api-token>" \\
  -F "file=@junit.xml" \\
  -F "name=Playwright staging" \\
  -F "environment=staging" \\
  -F "branch=main" \\
  -F "commit=abc123" \\
  -F "triggerSource=ci"`
  const githubExample = `- name: Upload JUnit results to TMS
  if: always()
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
  const jenkinsExample = `stage('Upload JUnit to TMS') {
  steps {
    withCredentials([string(credentialsId: 'tms-project-token', variable: 'TMS_PROJECT_TOKEN')]) {
      sh '''
        curl -X POST "${junitEndpoint}" \\
          -H "Authorization: Bearer $TMS_PROJECT_TOKEN" \\
          -F "file=@reports/junit.xml" \\
          -F "name=Jenkins regression" \\
          -F "environment=staging" \\
          -F "branch=$BRANCH_NAME" \\
          -F "commit=$GIT_COMMIT" \\
          -F "ciBuildUrl=$BUILD_URL" \\
          -F "triggerSource=ci"
      '''
    }
  }
}`
  const playwrightExample = `# playwright.config.ts
export default defineConfig({
  reporter: [['junit', { outputFile: 'test-results/junit.xml' }]],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
})

# Upload after tests. Add artifact URLs via JUnit properties or stdout markers.
curl -X POST "${junitEndpoint}" \\
  -H "Authorization: Bearer <project-api-token>" \\
  -F "file=@test-results/junit.xml" \\
  -F "name=Playwright regression" \\
  -F "environment=staging" \\
  -F "triggerSource=ci"`
  const cypressExample = `# cypress.config.ts
export default defineConfig({
  reporter: 'junit',
  reporterOptions: {
    mochaFile: 'cypress/results/junit-[hash].xml',
  },
  video: true,
  screenshotOnRunFailure: true,
})

# Merge/upload JUnit XML after Cypress finishes.
curl -X POST "${junitEndpoint}" \\
  -H "Authorization: Bearer <project-api-token>" \\
  -F "file=@cypress/results/junit.xml" \\
  -F "name=Cypress regression" \\
  -F "environment=staging" \\
  -F "triggerSource=ci"`
  const pytestExample = `pytest --junitxml=reports/junit.xml

curl -X POST "${junitEndpoint}" \\
  -H "Authorization: Bearer <project-api-token>" \\
  -F "file=@reports/junit.xml" \\
  -F "name=pytest regression" \\
  -F "environment=staging" \\
  -F "triggerSource=ci"`
  const jestExample = `npm install --save-dev jest-junit
JEST_JUNIT_OUTPUT=reports/junit.xml jest --reporters=default --reporters=jest-junit

curl -X POST "${junitEndpoint}" \\
  -H "Authorization: Bearer <project-api-token>" \\
  -F "file=@reports/junit.xml" \\
  -F "name=Jest regression" \\
  -F "environment=staging" \\
  -F "triggerSource=ci"`
  const sampleJunit = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="auth.spec.ts" tests="2" failures="1" skipped="0" time="2.8">
    <testcase classname="auth.spec.ts" name="Login succeeds TMS-142" time="1.2" />
    <testcase classname="auth.spec.ts" name="Locked user cannot login" time="1.6">
      <properties>
        <property name="screenshot" value="https://ci.example.com/artifacts/login-failure.png" />
        <property name="trace" value="https://ci.example.com/artifacts/login-trace.zip" />
      </properties>
      <failure message="Expected error banner">Assertion stack trace...</failure>
      <system-out>[[ATTACHMENT|Browser log|log|https://ci.example.com/artifacts/browser.log]]</system-out>
    </testcase>
  </testsuite>
</testsuites>`
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
        "caseId": "TMS-142",
        "attachments": [
          {
            "name": "Trace",
            "type": "trace",
            "url": "https://ci.example.com/artifacts/trace.zip",
            "contentType": "application/zip",
            "sizeBytes": 184320
          },
          {
            "name": "Browser console",
            "type": "log",
            "url": "https://ci.example.com/artifacts/console.log"
          }
        ]
      }
    ]
  }'`

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="primary">
                  {activeTokenCount} active token{activeTokenCount === 1 ? '' : 's'}
                </Badge>
                <a className={cx(buttonVariants({ variant: 'default' }), 'no-underline')} href={runsHref}>
                  Open runs
                </a>
              </div>
            }
          />

          {errorMessage ? (
            <Alert variant="danger" title="Automation token error">
              {errorMessage}
            </Alert>
          ) : null}

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="1. Project API token"
              description="Generate a token for CI jobs. Store it as a secret in GitHub Actions, Jenkins, GitLab, or any runner. The full token is shown only once."
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
              title="2. Upload endpoints"
              description="Use JUnit XML for standard framework output. Use JSON when you have a custom runner or want direct control over normalized results."
              className="mb-4"
            />

            <div className="grid gap-4 xl:grid-cols-2">
              <EndpointCard
                label="JUnit XML import"
                value={junitEndpoint}
                onCopy={copyText}
              />
              <EndpointCard
                label="JSON run import"
                value={jsonEndpoint}
                onCopy={copyText}
              />
            </div>
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
              title="3. CI upload examples"
              description="Copy the closest example, replace the token with your CI secret, and upload reports after the test command finishes."
              className="mb-4"
            />

            <div className="mb-5 grid gap-4 lg:grid-cols-3">
              <IntegrationStep
                step="A"
                title="Generate JUnit XML"
                description="Most frameworks can emit JUnit XML without changing tests."
              />
              <IntegrationStep
                step="B"
                title="Upload after test run"
                description="Send the XML file with environment, branch, commit, build URL, and artifact links."
              />
              <IntegrationStep
                step="C"
                title="Review failures in TMS"
                description="Open Automation Runs to inspect failures and link results to manual cases."
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <CodeBlock
                label="JUnit curl"
                value={curlExample}
                onCopy={copyText}
                description="Universal command for local smoke checks or any CI shell step."
              />
              <CodeBlock
                label="GitHub Actions"
                value={githubExample}
                onCopy={copyText}
                description="Store the token as TMS_PROJECT_TOKEN in repository secrets."
              />
              <CodeBlock
                label="Jenkins"
                value={jenkinsExample}
                onCopy={copyText}
                description="Use a secret text credential named tms-project-token."
              />
              <CodeBlock
                label="Playwright"
                value={playwrightExample}
                onCopy={copyText}
                description="Emit JUnit from Playwright and keep screenshots, traces, and videos for failed tests."
              />
              <CodeBlock
                label="Cypress"
                value={cypressExample}
                onCopy={copyText}
                description="Export Cypress results as JUnit XML and keep videos/screenshots in CI artifacts."
              />
              <CodeBlock
                label="pytest"
                value={pytestExample}
                onCopy={copyText}
                description="Use pytest's built-in --junitxml output."
              />
              <CodeBlock
                label="Jest"
                value={jestExample}
                onCopy={copyText}
                description="Use jest-junit to export a compatible report."
              />
              <CodeBlock
                label="JSON API"
                value={jsonExample}
                onCopy={copyText}
                description="Use the JSON endpoint when a custom runner can send normalized results and artifacts directly."
              />
              <CodeBlock
                label="Sample JUnit XML"
                value={sampleJunit}
                onCopy={copyText}
                description="Includes property-based artifacts and stdout attachment markers."
              />
              <div className="rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-4">
                <h3 className="m-0 text-sm font-semibold text-[var(--tms-text)]">
                  Linking automation to manual cases
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--tms-text-muted)]">
                  Add a case key like TMS-142 to the test name or JUnit
                  properties. Results without a key still import as
                  automation-only tests and can be linked manually later.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>JUnit XML</Badge>
                  <Badge>JSON API</Badge>
                  <Badge>Playwright</Badge>
                  <Badge>Cypress</Badge>
                  <Badge>pytest</Badge>
                  <Badge>Jenkins</Badge>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  )
}
