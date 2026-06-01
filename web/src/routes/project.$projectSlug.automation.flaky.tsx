import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { MetricCard } from '../components/ui/MetricCard'
import { Panel } from '../components/ui/Panel'
import { Select } from '../components/ui/Select'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import {
  getAutomationFlakyTests,
  type AutomationFlakyTestItem,
} from '../features/automation/server'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute('/project/$projectSlug/automation/flaky')({
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
          to: '/project/$projectSlug/automation/flaky',
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

    const flakyState = await getAutomationFlakyTests({
      data: {
        projectId: selectedProjectId,
      },
    })

    return {
      project,
      tests: flakyState.tests,
    }
  },
  component: AutomationFlakyTestsPage,
})

const FLAKY_TABLE_COLUMNS =
  'minmax(280px,1.8fr) 130px 120px 130px minmax(220px,1.2fr) 120px 120px'

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
    return 'Not recorded'
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

function humanizeStatus(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())
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

function getRecommendationVariant(
  recommendation: AutomationFlakyTestItem['recommendation'],
): 'danger' | 'warning' | 'success' {
  if (recommendation === 'quarantine') {
    return 'danger'
  }

  if (recommendation === 'review') {
    return 'warning'
  }

  return 'success'
}

function getRecommendationText(
  recommendation: AutomationFlakyTestItem['recommendation'],
): string {
  if (recommendation === 'quarantine') {
    return 'Quarantine'
  }

  if (recommendation === 'review') {
    return 'Review'
  }

  return 'Stable watch'
}

function AutomationFlakyTestsPage() {
  const { project, tests } = Route.useLoaderData()
  const projectSlug = project.slug ?? project.id.toString()
  const [query, setQuery] = useState('')
  const [recommendationFilter, setRecommendationFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const filteredTests = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return tests.filter((test) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        test.name.toLowerCase().includes(normalizedQuery) ||
        (test.suite ?? '').toLowerCase().includes(normalizedQuery) ||
        (test.lastFailureMessage ?? '').toLowerCase().includes(normalizedQuery)
      const matchesRecommendation =
        recommendationFilter === 'All' ||
        test.recommendation === recommendationFilter
      const matchesStatus =
        statusFilter === 'All' || test.lastStatus === statusFilter

      return matchesQuery && matchesRecommendation && matchesStatus
    })
  }, [query, recommendationFilter, statusFilter, tests])

  const quarantineCount = tests.filter(
    (test) => test.recommendation === 'quarantine',
  ).length
  const reviewCount = tests.filter(
    (test) => test.recommendation === 'review',
  ).length
  const linkedCount = tests.filter((test) => test.linkedManualTestId).length
  const highestRate =
    tests.length === 0
      ? 0
      : Math.max(...tests.map((test) => test.flakyRate))

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName="Flaky tests"
            eyebrow={project.name}
            description="Detect automated tests that alternate between passing and failing across recent CI/API imports."
            actions={
              <div className="flex flex-wrap gap-2">
                <LinkButton
                  to="/project/$projectSlug/automation/runs"
                  params={{ projectSlug }}
                >
                  Automation runs
                </LinkButton>
                <LinkButton
                  variant="primary"
                  to="/project/$projectSlug/automation"
                  params={{ projectSlug }}
                >
                  CI Integration
                </LinkButton>
              </div>
            }
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              density="compact"
              label="Flaky tests"
              value={tests.length}
              helper="Recent automation history"
            />
            <MetricCard
              density="compact"
              label="Quarantine"
              value={quarantineCount}
              tone={quarantineCount > 0 ? 'danger' : 'muted'}
              helper="High instability"
            />
            <MetricCard
              density="compact"
              label="Review"
              value={reviewCount}
              tone={reviewCount > 0 ? 'warning' : 'muted'}
              helper="Needs owner attention"
            />
            <MetricCard
              density="compact"
              label="Linked"
              value={linkedCount}
              tone="primary"
              helper={`Peak flaky rate ${highestRate}%`}
            />
          </div>

          <Panel>
            <div className="border-b border-[var(--tms-border-subtle)] px-4 py-4">
              <WorkspaceSectionHeader
                title="Flaky test analysis"
                description="Prioritize unstable automated checks before they pollute release confidence."
                actions={<Badge variant="warning">{filteredTests.length} shown</Badge>}
              />
              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_180px]">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by test, suite, or failure..."
                />
                <Select
                  value={recommendationFilter}
                  onChange={(event) => setRecommendationFilter(event.target.value)}
                >
                  <option value="All">All recommendations</option>
                  <option value="quarantine">Quarantine</option>
                  <option value="review">Review</option>
                  <option value="stable">Stable watch</option>
                </Select>
                <Select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All latest statuses</option>
                  <option value="failed">Failed</option>
                  <option value="blocked">Blocked</option>
                  <option value="passed">Passed</option>
                  <option value="skipped">Skipped</option>
                  <option value="unknown">Unknown</option>
                </Select>
              </div>
            </div>

            {filteredTests.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No flaky tests found"
                  description="A test becomes flaky when recent history contains both a passing result and a failed or blocked result."
                />
              </div>
            ) : (
              <div className="p-4">
                <TableShell surface="panel">
                  <TableHead
                    columns={FLAKY_TABLE_COLUMNS}
                    minWidth="1160px"
                    padding="sm"
                  >
                    <span>Test</span>
                    <span>Recommendation</span>
                    <span>Flaky rate</span>
                    <span>History</span>
                    <span>Last failure</span>
                    <span>Avg duration</span>
                    <span>Actions</span>
                  </TableHead>
                  {filteredTests.map((test) => (
                    <TableRow
                      key={test.key}
                      columns={FLAKY_TABLE_COLUMNS}
                      minWidth="1160px"
                      padding="sm"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-[var(--tms-text)]">
                            {test.name}
                          </span>
                          <Badge variant={getStatusBadgeVariant(test.lastStatus)}>
                            {humanizeStatus(test.lastStatus)}
                          </Badge>
                        </div>
                        <div className="mt-1 truncate text-xs text-[var(--tms-text-muted)]">
                          {test.suite ?? 'No suite'}
                          {test.linkedManualTestId ? ` · linked to #${test.linkedManualTestId}` : ''}
                        </div>
                      </div>
                      <Badge variant={getRecommendationVariant(test.recommendation)}>
                        {getRecommendationText(test.recommendation)}
                      </Badge>
                      <div>
                        <div className="font-semibold text-[var(--tms-text)]">
                          {test.flakyRate}%
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--tms-surface-soft)]">
                          <div
                            className="h-full rounded-full bg-[var(--tms-warning)]"
                            style={{ width: `${Math.max(test.flakyRate, 4)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-[var(--tms-text-muted)]">
                        <div>{test.failedCount + test.blockedCount} unstable</div>
                        <div>{test.passedCount} passed</div>
                        <div>{test.totalCount} total</div>
                      </div>
                      <div className="min-w-0 text-xs text-[var(--tms-text-muted)]">
                        <div className="font-semibold text-[var(--tms-text)]">
                          {formatDate(test.lastFailureAt)}
                        </div>
                        <div className="truncate">
                          {test.lastFailureRunName ?? 'No failure run'}
                        </div>
                        {test.lastFailureMessage ? (
                          <div className="mt-1 line-clamp-2">
                            {test.lastFailureMessage}
                          </div>
                        ) : null}
                      </div>
                      <span className="text-[var(--tms-text-muted)]">
                        {formatDuration(test.averageDurationMs)}
                      </span>
                      {test.lastFailureRunId ? (
                        <LinkButton
                          size="sm"
                          variant="secondary"
                          to="/project/$projectSlug/automation/runs/$runId"
                          params={{
                            projectSlug,
                            runId: String(test.lastFailureRunId),
                          }}
                        >
                          Open run
                        </LinkButton>
                      ) : (
                        <span className="text-xs text-[var(--tms-text-muted)]">
                          No run
                        </span>
                      )}
                    </TableRow>
                  ))}
                </TableShell>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
