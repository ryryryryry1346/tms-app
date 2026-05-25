import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'
import { MetricCard } from '../components/ui/MetricCard'
import { Panel } from '../components/ui/Panel'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import {
  getAutomationRunDetail,
  type AutomationRunDetail,
  type AutomationRunResultItem,
} from '../features/automation/server'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute(
  '/project/$projectSlug/automation/runs/$runId',
)({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()
    const runId = Number(params.runId)

    if (!projectSlug || !Number.isInteger(runId) || runId <= 0) {
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
          to: '/project/$projectSlug/automation/runs/$runId',
          params: {
            projectSlug: legacyProject.slug,
            runId: params.runId,
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

    const detailState = await getAutomationRunDetail({
      data: {
        projectId: selectedProjectId,
        runId,
      },
    })

    return {
      project,
      run: detailState.run,
    }
  },
  component: AutomationRunDetailPage,
})

const RESULT_FILTERS = ['All', 'failed', 'passed', 'skipped', 'blocked', 'unknown']
const RESULT_TABLE_COLUMNS =
  'minmax(280px,2fr) minmax(180px,1fr) 110px 100px minmax(180px,1fr) minmax(220px,1.2fr)'

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
    return 'Not set'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16)
  }

  const hours = String(date.getUTCHours()).padStart(2, '0')
  const minutes = String(date.getUTCMinutes()).padStart(2, '0')

  return `${MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}, ${hours}:${minutes}`
}

function formatDuration(durationMs: number): string {
  if (durationMs <= 0) {
    return '0s'
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  const seconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

function getStatusBadgeVariant(
  status: string,
): 'runPassed' | 'runFailed' | 'runBlocked' | 'runNotRun' | 'primary' {
  if (status === 'passed') {
    return 'runPassed'
  }

  if (status === 'failed' || status === 'needs_review') {
    return 'runFailed'
  }

  if (status === 'blocked') {
    return 'runBlocked'
  }

  if (status === 'skipped' || status === 'unknown') {
    return 'runNotRun'
  }

  return 'primary'
}

function humanizeStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function getRunProgress(run: AutomationRunDetail): number {
  if (run.totalCount === 0) {
    return 0
  }

  return Math.round(
    ((run.passedCount + run.failedCount + run.blockedCount) / run.totalCount) *
      100,
  )
}

function SegmentedRunProgress({ run }: { run: AutomationRunDetail }) {
  const total = Math.max(run.totalCount, 1)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>{getRunProgress(run)}%</span>
        <span className="text-[var(--tms-text-muted)]">
          {run.passedCount + run.failedCount + run.blockedCount}/{run.totalCount}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--tms-surface-soft)]">
        <span
          className="bg-[var(--tms-success)]"
          style={{ width: `${(run.passedCount / total) * 100}%` }}
        />
        <span
          className="bg-[var(--tms-danger)]"
          style={{ width: `${(run.failedCount / total) * 100}%` }}
        />
        <span
          className="bg-[var(--tms-warning)]"
          style={{ width: `${(run.blockedCount / total) * 100}%` }}
        />
        <span
          className="bg-[var(--tms-text-soft)]"
          style={{ width: `${(run.skippedCount / total) * 100}%` }}
        />
      </div>
    </div>
  )
}

function ResultErrorPreview({ result }: { result: AutomationRunResultItem }) {
  const text = result.errorMessage ?? result.stackTrace ?? result.stderr ?? ''

  if (!text) {
    return <span className="text-[var(--tms-text-muted)]">No error output</span>
  }

  return (
    <span className="line-clamp-2 text-[var(--tms-text-muted)]">
      {text}
    </span>
  )
}

function AutomationRunDetailPage() {
  const { project, run } = Route.useLoaderData()
  const projectSlug = project.slug ?? project.id.toString()
  const [activeFilter, setActiveFilter] = useState('All')

  const filteredResults = useMemo(() => {
    if (activeFilter === 'All') {
      return run.results
    }

    return run.results.filter((result) => result.status === activeFilter)
  }, [activeFilter, run.results])

  const failedResults = run.results.filter((result) => result.status === 'failed')

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={run.name}
            eyebrow="Automation run"
            description={`${project.name} automation execution results.`}
            actions={
              <LinkButton
                to="/project/$projectSlug/automation/runs"
                params={{ projectSlug }}
              >
                Back to runs
              </LinkButton>
            }
          />

          <Panel className="px-5 py-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
              <div>
                <Badge variant={getStatusBadgeVariant(run.status)}>
                  {humanizeStatus(run.status)}
                </Badge>
                <div className="mt-4">
                  <SegmentedRunProgress run={run} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  density="compact"
                  label="Passed"
                  value={run.passedCount}
                  tone="success"
                />
                <MetricCard
                  density="compact"
                  label="Failed"
                  value={run.failedCount}
                  tone={run.failedCount > 0 ? 'danger' : 'muted'}
                />
                <MetricCard
                  density="compact"
                  label="Skipped"
                  value={run.skippedCount}
                  tone="muted"
                />
                <MetricCard
                  density="compact"
                  label="Duration"
                  value={formatDuration(run.durationMs)}
                />
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <Panel>
              <div className="border-b border-[var(--tms-border-subtle)] px-4 py-4">
                <WorkspaceSectionHeader
                  title="Results"
                  description="Inspect automated tests, linked manual cases, and failure output."
                  action={<Badge>{filteredResults.length} shown</Badge>}
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {RESULT_FILTERS.map((filter) => (
                    <Button
                      key={filter}
                      size="sm"
                      variant={filter === activeFilter ? 'primary' : 'secondary'}
                      onClick={() => setActiveFilter(filter)}
                    >
                      {filter === 'All' ? 'All' : humanizeStatus(filter)}
                    </Button>
                  ))}
                </div>
              </div>

              {filteredResults.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="No results"
                    description="No automated tests match the selected status."
                  />
                </div>
              ) : (
                <div className="p-4">
                  <TableShell surface="panel">
                    <TableHead
                      columns={RESULT_TABLE_COLUMNS}
                      minWidth="1080px"
                      padding="sm"
                    >
                      <span>Test</span>
                      <span>Suite</span>
                      <span>Status</span>
                      <span>Duration</span>
                      <span>Manual case</span>
                      <span>Error preview</span>
                    </TableHead>
                    {filteredResults.map((result) => (
                      <TableRow
                        key={result.id}
                        columns={RESULT_TABLE_COLUMNS}
                        minWidth="1080px"
                        padding="sm"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[var(--tms-text)]">
                            {result.name}
                          </div>
                          {result.filePath ? (
                            <div className="mt-1 truncate text-xs text-[var(--tms-text-muted)]">
                              {result.filePath}
                            </div>
                          ) : null}
                        </div>
                        <span className="truncate text-[var(--tms-text-muted)]">
                          {result.suite ?? 'No suite'}
                        </span>
                        <Badge variant={getStatusBadgeVariant(result.status)}>
                          {humanizeStatus(result.status)}
                        </Badge>
                        <span className="text-[var(--tms-text-muted)]">
                          {formatDuration(result.durationMs)}
                        </span>
                        {result.manualTestId ? (
                          <LinkButton
                            size="sm"
                            to="/test/$testId"
                            params={{ testId: String(result.manualTestId) }}
                          >
                            #{result.manualTestId}
                          </LinkButton>
                        ) : (
                          <span className="text-[var(--tms-text-muted)]">
                            {result.caseKey ?? 'Unlinked'}
                          </span>
                        )}
                        <ResultErrorPreview result={result} />
                      </TableRow>
                    ))}
                  </TableShell>
                </div>
              )}
            </Panel>

            <div className="space-y-4">
              <Panel className="px-5 py-5">
                <WorkspaceSectionHeader
                  title="Metadata"
                  description="Source and CI context for this automation run."
                  className="mb-4"
                />
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      Environment
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--tms-text)]">
                      {run.environment ?? 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      Branch
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--tms-text)]">
                      {run.branch ?? 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      Commit
                    </dt>
                    <dd className="mt-1 font-mono text-xs text-[var(--tms-text)]">
                      {run.commitSha ?? 'Not set'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      Trigger
                    </dt>
                    <dd className="mt-1 font-semibold text-[var(--tms-text)]">
                      {run.triggerSource}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      Started
                    </dt>
                    <dd className="mt-1 text-[var(--tms-text)]">
                      {formatDate(run.startedAt)}
                    </dd>
                  </div>
                  {run.ciBuildUrl ? (
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                        CI build
                      </dt>
                      <dd className="mt-1">
                        <a
                          href={run.ciBuildUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-[var(--tms-primary)]"
                        >
                          Open build
                        </a>
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Panel>

              <Panel className="px-5 py-5">
                <WorkspaceSectionHeader
                  title="Failures"
                  description="Fast path to the most important debugging output."
                  className="mb-4"
                />
                {failedResults.length === 0 ? (
                  <EmptyState
                    title="No failures"
                    description="This run has no failed automated tests."
                  />
                ) : (
                  <div className="space-y-3">
                    {failedResults.slice(0, 5).map((result) => (
                      <div
                        key={result.id}
                        className="rounded-xl border border-[var(--tms-border-subtle)] p-3"
                      >
                        <div className="font-semibold text-[var(--tms-text)]">
                          {result.name}
                        </div>
                        <div className="mt-1 line-clamp-3 text-sm text-[var(--tms-text-muted)]">
                          {result.errorMessage ?? result.stackTrace ?? 'No error output'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel className="px-5 py-5">
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-[var(--tms-text)]">
                    Raw report
                  </summary>
                  <pre className="mt-3 max-h-80 overflow-auto rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3 text-xs leading-6 text-[var(--tms-text-muted)]">
                    <code>{run.rawReport ?? `No raw ${run.rawFormat} report stored.`}</code>
                  </pre>
                </details>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
