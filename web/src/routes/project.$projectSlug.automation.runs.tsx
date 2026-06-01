import {
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import { Select } from '../components/ui/Select'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import {
  getAutomationRuns,
  type AutomationRunListItem,
  type AutomationRunResultSummary,
} from '../features/automation/server'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute('/project/$projectSlug/automation/runs')({
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
          to: '/project/$projectSlug/automation/runs',
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

    const automationState = await getAutomationRuns({
      data: {
        projectId: selectedProjectId,
      },
    })

    return {
      project,
      runs: automationState.runs,
      recentResults: automationState.recentResults,
    }
  },
  component: AutomationRunsPage,
})

const RUN_TABLE_COLUMNS =
  'minmax(360px,1fr) 140px 180px 120px'

type QuickFilter = 'all' | 'failed' | 'latest-ci' | 'latest'

type FlakyTestSummary = {
  key: string
  name: string
  suite: string
  total: number
  passed: number
  failed: number
  lastStatus: string
  flakyRate: number
  averageDurationMs: number
}

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

function isFailedRun(run: AutomationRunListItem): boolean {
  return (
    run.status === 'failed' ||
    run.status === 'needs_review' ||
    run.failedCount > 0 ||
    run.blockedCount > 0
  )
}

function isCiRun(run: AutomationRunListItem): boolean {
  return run.triggerSource === 'ci' || Boolean(run.ciBuildUrl)
}

function isFailedResult(status: string): boolean {
  return status === 'failed' || status === 'blocked'
}

function getFlakyTests(
  results: AutomationRunResultSummary[],
): FlakyTestSummary[] {
  const grouped = new Map<string, FlakyTestSummary>()

  for (const result of results) {
    const suite = result.suite ?? 'No suite'
    const key = `${suite}::${result.name}`
    const existing =
      grouped.get(key) ??
      ({
        key,
        name: result.name,
        suite,
        total: 0,
        passed: 0,
        failed: 0,
        lastStatus: result.status,
        flakyRate: 0,
        averageDurationMs: 0,
      } satisfies FlakyTestSummary)

    existing.total += 1
    existing.averageDurationMs += result.durationMs

    if (result.status === 'passed') {
      existing.passed += 1
    }

    if (isFailedResult(result.status)) {
      existing.failed += 1
    }

    grouped.set(key, existing)
  }

  return Array.from(grouped.values())
    .map((item) => ({
      ...item,
      flakyRate: item.total === 0 ? 0 : Math.round((item.failed / item.total) * 100),
      averageDurationMs:
        item.total === 0 ? 0 : Math.round(item.averageDurationMs / item.total),
    }))
    .filter((item) => item.passed > 0 && item.failed > 0)
    .sort((first, second) => {
      if (second.failed !== first.failed) {
        return second.failed - first.failed
      }

      return second.flakyRate - first.flakyRate
    })
    .slice(0, 5)
}

function ResultBar({ run }: { run: AutomationRunListItem }) {
  const total = Math.max(run.totalCount, 1)
  const passedWidth = (run.passedCount / total) * 100
  const failedWidth = (run.failedCount / total) * 100
  const blockedWidth = (run.blockedCount / total) * 100
  const skippedWidth = (run.skippedCount / total) * 100

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--tms-text)]">
        <span>
          {run.totalCount === 0
            ? '0%'
            : `${Math.round(((run.passedCount + run.failedCount + run.blockedCount) / run.totalCount) * 100)}%`}
        </span>
        <span className="text-[var(--tms-text-muted)]">
          {run.passedCount + run.failedCount + run.blockedCount}/{run.totalCount}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-[var(--tms-surface-soft)]">
        <span
          className="bg-[var(--tms-success)]"
          style={{ width: `${passedWidth}%` }}
        />
        <span
          className="bg-[var(--tms-danger)]"
          style={{ width: `${failedWidth}%` }}
        />
        <span
          className="bg-[var(--tms-warning)]"
          style={{ width: `${blockedWidth}%` }}
        />
        <span
          className="bg-[var(--tms-text-soft)]"
          style={{ width: `${skippedWidth}%` }}
        />
      </div>
    </div>
  )
}

function AutomationRunsPage() {
  const { project, runs, recentResults } = Route.useLoaderData()
  const { projectSlug: routeProjectSlug } = Route.useParams()
  const location = useLocation()
  const automationRunsPath = `/project/${routeProjectSlug}/automation/runs`
  const currentPath = location.pathname.replace(/\/+$/, '')

  if (currentPath !== automationRunsPath) {
    return <Outlet />
  }

  return (
    <AutomationRunsIndex
      project={project}
      runs={runs}
      recentResults={recentResults}
    />
  )
}

function AutomationRunsIndex({
  project,
  runs,
  recentResults,
}: {
  project: {
    id: number
    name: string
    slug: string | null
  }
  runs: AutomationRunListItem[]
  recentResults: AutomationRunResultSummary[]
}) {
  const projectSlug = project.slug ?? project.id.toString()
  const [query, setQuery] = useState('')
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [statusFilter, setStatusFilter] = useState('All')
  const [environmentFilter, setEnvironmentFilter] = useState('All')
  const [branchFilter, setBranchFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const environments = useMemo(
    () =>
      Array.from(
        new Set(
          runs.map((run) => run.environment).filter((value): value is string => Boolean(value)),
        ),
      ),
    [runs],
  )
  const branches = useMemo(
    () =>
      Array.from(
        new Set(runs.map((run) => run.branch).filter((value): value is string => Boolean(value))),
      ),
    [runs],
  )
  const sources = useMemo(
    () =>
      Array.from(
        new Set(runs.map((run) => run.triggerSource).filter((value): value is string => Boolean(value))),
      ),
    [runs],
  )

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const quickFilteredRuns = runs.filter((run, index) => {
      if (quickFilter === 'failed') {
        return isFailedRun(run)
      }

      if (quickFilter === 'latest-ci') {
        return isCiRun(run) && index < 10
      }

      if (quickFilter === 'latest') {
        return index < 10
      }

      return true
    })

    return quickFilteredRuns.filter((run) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        run.name.toLowerCase().includes(normalizedQuery) ||
        (run.commitSha ?? '').toLowerCase().includes(normalizedQuery)
      const matchesStatus =
        statusFilter === 'All' || run.status === statusFilter
      const matchesEnvironment =
        environmentFilter === 'All' || run.environment === environmentFilter
      const matchesBranch = branchFilter === 'All' || run.branch === branchFilter
      const matchesSource = sourceFilter === 'All' || run.triggerSource === sourceFilter

      return (
        matchesQuery &&
        matchesStatus &&
        matchesEnvironment &&
        matchesBranch &&
        matchesSource
      )
    })
  }, [branchFilter, environmentFilter, query, quickFilter, runs, sourceFilter, statusFilter])

  const flakyTests = useMemo(() => getFlakyTests(recentResults), [recentResults])
  const failedResults = useMemo(
    () => recentResults.filter((result) => isFailedResult(result.status)).slice(0, 4),
    [recentResults],
  )
  const failedRuns = useMemo(() => runs.filter(isFailedRun), [runs])
  const latestCiRuns = useMemo(() => runs.filter(isCiRun).slice(0, 10), [runs])
  const quickFilters: Array<{
    id: QuickFilter
    label: string
    count: number
  }> = [
    { id: 'all', label: 'All runs', count: runs.length },
    { id: 'failed', label: 'Failed', count: failedRuns.length },
    { id: 'latest-ci', label: 'Latest CI', count: latestCiRuns.length },
    { id: 'latest', label: 'Latest 10', count: Math.min(runs.length, 10) },
  ]

  const latestRun = runs[0] ?? null
  const totalRuns = runs.length
  const totalResults = runs.reduce((sum, run) => sum + run.totalCount, 0)
  const totalPassed = runs.reduce((sum, run) => sum + run.passedCount, 0)
  const totalFailed = runs.reduce((sum, run) => sum + run.failedCount, 0)
  const totalSkipped = runs.reduce((sum, run) => sum + run.skippedCount, 0)
  const passRate =
    totalResults === 0 ? '0%' : `${Math.round((totalPassed / totalResults) * 100)}%`
  const averageDuration =
    totalRuns === 0
      ? '0s'
      : formatDuration(
          Math.round(runs.reduce((sum, run) => sum + run.durationMs, 0) / totalRuns),
        )

  function openAutomationRun(runId: number): void {
    window.location.href = `/project/${projectSlug}/automation/runs/${runId}`
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <Panel className="automation-runs-cockpit p-4">
            <div className="automation-runs-header">
              <div className="min-w-0">
                <div className="automation-runs-eyebrow">Automation</div>
                <div className="automation-runs-title-row">
                  <h1>Automation runs</h1>
                  <Badge>{filteredRuns.length} shown</Badge>
                </div>
                <p>
                  {project.name} CI/API imports, execution health, and failure focus.
                </p>
              </div>
              <div className="automation-runs-actions">
                <LinkButton
                  size="sm"
                  to="/project/$projectSlug/automation"
                  params={{ projectSlug }}
                >
                  CI Integration
                </LinkButton>
                <LinkButton
                  size="sm"
                  to="/project/$projectSlug/automation/flaky"
                  params={{ projectSlug }}
                >
                  Flaky tests
                </LinkButton>
              </div>
            </div>

            <div className="automation-runs-summary">
              {[
                {
                  label: 'Latest',
                  value: latestRun ? humanizeStatus(latestRun.status) : 'None',
                  helper: latestRun ? formatDate(latestRun.startedAt) : 'No runs yet',
                  tone: latestRun && isFailedRun(latestRun) ? 'is-danger' : '',
                },
                {
                  label: 'Pass rate',
                  value: passRate,
                  helper: `${totalPassed}/${totalResults} passed`,
                  tone: totalPassed > 0 ? 'is-success' : '',
                },
                {
                  label: 'Failed',
                  value: totalFailed,
                  helper: `${totalSkipped} skipped`,
                  tone: totalFailed > 0 ? 'is-danger' : '',
                },
                {
                  label: 'Avg duration',
                  value: averageDuration,
                  helper: `${totalRuns} runs imported`,
                  tone: '',
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className={`automation-runs-summary-item ${metric.tone}`}
                >
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                  <small>{metric.helper}</small>
                </div>
              ))}
            </div>

            <div className="automation-runs-toolbar">
              <div
                className="automation-runs-quick-filters"
                role="group"
                aria-label="Filter automation runs"
              >
                {quickFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    className={`automation-runs-filter-button${
                      quickFilter === filter.id ? ' is-active' : ''
                    }`}
                    onClick={() => setQuickFilter(filter.id)}
                  >
                    <span>{filter.label}</span>
                    <strong>{filter.count}</strong>
                  </button>
                ))}
              </div>
              <div className="automation-runs-search-row">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search runs or commits"
                  size="sm"
                />
                <Button
                  size="sm"
                  variant={showAdvancedFilters ? 'primary' : 'secondary'}
                  onClick={() => setShowAdvancedFilters((value) => !value)}
                >
                  Filters
                </Button>
              </div>
            </div>

            {showAdvancedFilters ? (
              <div className="automation-runs-advanced-filters">
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All statuses</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="skipped">Skipped</option>
                  <option value="blocked">Blocked</option>
                  <option value="unknown">Unknown</option>
                </Select>
                <Select
                  value={environmentFilter}
                  onChange={(event) => setEnvironmentFilter(event.target.value)}
                >
                  <option value="All">All environments</option>
                  {environments.map((environment) => (
                    <option key={environment} value={environment}>
                      {environment}
                    </option>
                  ))}
                </Select>
                <Select
                  value={branchFilter}
                  onChange={(event) => setBranchFilter(event.target.value)}
                >
                  <option value="All">All branches</option>
                  {branches.map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
                    </option>
                  ))}
                </Select>
                <Select
                  value={sourceFilter}
                  onChange={(event) => setSourceFilter(event.target.value)}
                >
                  <option value="All">All sources</option>
                  {sources.map((source) => (
                    <option key={source} value={source}>
                      {humanizeStatus(source)}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {filteredRuns.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No automation runs"
                  description="Upload JUnit XML or JSON results from CI/CD to populate this hub."
                />
              </div>
            ) : (
              <div className="automation-runs-workspace">
                <div className="automation-runs-table-area">
                  <TableShell surface="panel">
                    <TableHead
                      columns={RUN_TABLE_COLUMNS}
                      minWidth="760px"
                      padding="sm"
                    >
                      <span>Run</span>
                      <span>Outcome</span>
                      <span>Progress</span>
                      <span>Started</span>
                    </TableHead>
                    {filteredRuns.map((run) => (
                      <TableRow
                        key={run.id}
                        columns={RUN_TABLE_COLUMNS}
                        minWidth="760px"
                        padding="sm"
                        className="automation-runs-row"
                        role="link"
                        tabIndex={0}
                        onClick={() => openAutomationRun(run.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            openAutomationRun(run.id)
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <div className="automation-runs-run-title">{run.name}</div>
                          <div className="automation-runs-meta">
                            <span>#{run.id}</span>
                            <span>{run.environment ?? 'No env'}</span>
                            <span>{humanizeStatus(run.triggerSource)}</span>
                            <span>{run.branch ?? 'No branch'}</span>
                            <span>
                              {run.commitSha
                                ? run.commitSha.slice(0, 7)
                                : 'No commit'}
                            </span>
                          </div>
                        </div>
                        <div className="automation-runs-outcome">
                          <Badge variant={getStatusBadgeVariant(run.status)}>
                            {humanizeStatus(run.status)}
                          </Badge>
                          <div className="automation-runs-result-line">
                            {run.passedCount} passed / {run.failedCount} failed /{' '}
                            {run.skippedCount} skipped
                          </div>
                        </div>
                        <ResultBar run={run} />
                        <div className="automation-runs-started">
                          <span>{formatDate(run.startedAt)}</span>
                          <small>{formatDuration(run.durationMs)}</small>
                        </div>
                      </TableRow>
                    ))}
                  </TableShell>
                </div>
                <aside className="automation-runs-focus">
                  <div className="automation-runs-focus-head">
                    <h2>Failure focus</h2>
                    <Badge variant={failedResults.length > 0 ? 'danger' : 'success'}>
                      {failedResults.length} recent
                    </Badge>
                  </div>
                  {failedResults.length === 0 ? (
                    <EmptyState
                      title="No recent failures"
                      description="Failed and blocked results will appear here after CI imports."
                    />
                  ) : (
                    <div className="automation-runs-focus-list">
                      {failedResults.map((result) => (
                        <div
                          key={result.id}
                          className="automation-runs-focus-card"
                        >
                          <div className="automation-runs-focus-card__top">
                            <div className="min-w-0">
                              <strong>{result.name}</strong>
                              <span>
                                {result.suite ?? 'No suite'}
                              </span>
                            </div>
                            <Badge variant={getStatusBadgeVariant(result.status)}>
                              {humanizeStatus(result.status)}
                            </Badge>
                          </div>
                          <div className="automation-runs-focus-card__bottom">
                            <span>{formatDuration(result.durationMs)}</span>
                            <LinkButton
                              size="sm"
                              to="/project/$projectSlug/automation/runs/$runId"
                              params={{
                                projectSlug,
                                runId: String(result.runId),
                              }}
                            >
                              Open
                            </LinkButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="automation-runs-flaky-card">
                    <span>Flaky watch</span>
                    <strong>{flakyTests.length} flaky tests</strong>
                    <LinkButton
                      className="automation-runs-flaky-link"
                      size="sm"
                      to="/project/$projectSlug/automation/flaky"
                      params={{ projectSlug }}
                    >
                      Review flaky tests
                    </LinkButton>
                  </div>
                </aside>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
