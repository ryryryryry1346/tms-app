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
  getAutomationRuns,
  type AutomationRunListItem,
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
    }
  },
  component: AutomationRunsPage,
})

const RUN_TABLE_COLUMNS =
  'minmax(260px,1.8fr) minmax(160px,1fr) 90px 80px 80px 80px 120px'

function formatDate(value: string | null): string {
  if (!value) {
    return 'Not set'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 16)
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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
  const { project, runs } = Route.useLoaderData()
  const projectSlug = project.slug ?? project.id.toString()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [environmentFilter, setEnvironmentFilter] = useState('All')
  const [branchFilter, setBranchFilter] = useState('All')

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

  const filteredRuns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return runs.filter((run) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        run.name.toLowerCase().includes(normalizedQuery) ||
        (run.commitSha ?? '').toLowerCase().includes(normalizedQuery)
      const matchesStatus =
        statusFilter === 'All' || run.status === statusFilter
      const matchesEnvironment =
        environmentFilter === 'All' || run.environment === environmentFilter
      const matchesBranch = branchFilter === 'All' || run.branch === branchFilter

      return matchesQuery && matchesStatus && matchesEnvironment && matchesBranch
    })
  }, [branchFilter, environmentFilter, query, runs, statusFilter])

  const latestRun = runs[0] ?? null
  const totalRuns = runs.length
  const totalResults = runs.reduce((sum, run) => sum + run.totalCount, 0)
  const totalPassed = runs.reduce((sum, run) => sum + run.passedCount, 0)
  const totalFailed = runs.reduce((sum, run) => sum + run.failedCount, 0)
  const passRate =
    totalResults === 0 ? '0%' : `${Math.round((totalPassed / totalResults) * 100)}%`
  const averageDuration =
    totalRuns === 0
      ? '0s'
      : formatDuration(
          Math.round(runs.reduce((sum, run) => sum + run.durationMs, 0) / totalRuns),
        )

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            description="Automation Runs Hub for CI/CD imports, framework results, and failure analysis."
            actions={
              <div className="flex flex-wrap gap-2">
                <LinkButton
                  to="/project/$projectSlug/automation"
                  params={{ projectSlug }}
                >
                  CI Integration
                </LinkButton>
              </div>
            }
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              density="compact"
              label="Runs"
              value={totalRuns}
              helper="Last 100 imports"
            />
            <MetricCard
              density="compact"
              label="Latest"
              value={latestRun ? humanizeStatus(latestRun.status) : 'None'}
              tone={latestRun?.status === 'failed' ? 'danger' : 'primary'}
              helper={latestRun ? formatDate(latestRun.startedAt) : 'No runs yet'}
            />
            <MetricCard
              density="compact"
              label="Pass rate"
              value={passRate}
              tone="success"
              helper={`${totalPassed}/${totalResults} passed`}
            />
            <MetricCard
              density="compact"
              label="Failed"
              value={totalFailed}
              tone={totalFailed > 0 ? 'danger' : 'muted'}
              helper="Across listed runs"
            />
            <MetricCard
              density="compact"
              label="Avg duration"
              value={averageDuration}
              helper="Per run"
            />
          </div>

          <Panel>
            <div className="border-b border-[var(--tms-border-subtle)] px-4 py-4">
              <WorkspaceSectionHeader
                title="Automation runs"
                description="Track CI/API imports, execution health, and failed automated checks."
                action={<Badge>{filteredRuns.length} shown</Badge>}
              />
              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_160px_160px_160px]">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by run name or commit..."
                />
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
              </div>
            </div>

            {filteredRuns.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="No automation runs"
                  description="Upload JUnit XML or JSON results from CI/CD to populate this hub."
                />
              </div>
            ) : (
              <div className="p-4">
                <TableShell surface="panel">
                  <TableHead
                    columns={RUN_TABLE_COLUMNS}
                    minWidth="1050px"
                    padding="sm"
                  >
                    <span>Run</span>
                    <span>Progress</span>
                    <span>Passed</span>
                    <span>Failed</span>
                    <span>Skipped</span>
                    <span>Duration</span>
                    <span>Actions</span>
                  </TableHead>
                  {filteredRuns.map((run) => (
                    <TableRow
                      key={run.id}
                      columns={RUN_TABLE_COLUMNS}
                      minWidth="1050px"
                      padding="sm"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate font-semibold text-[var(--tms-text)]">
                            {run.name}
                          </span>
                          <Badge variant={getStatusBadgeVariant(run.status)}>
                            {humanizeStatus(run.status)}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--tms-text-muted)]">
                          <span>#{run.id}</span>
                          <span>{run.environment ?? 'No env'}</span>
                          <span>{run.branch ?? 'No branch'}</span>
                          <span>{formatDate(run.startedAt)}</span>
                        </div>
                      </div>
                      <ResultBar run={run} />
                      <span className="font-semibold text-[var(--tms-success)]">
                        {run.passedCount}
                      </span>
                      <span className="font-semibold text-[var(--tms-danger)]">
                        {run.failedCount}
                      </span>
                      <span className="text-[var(--tms-text-muted)]">
                        {run.skippedCount}
                      </span>
                      <span className="text-[var(--tms-text-muted)]">
                        {formatDuration(run.durationMs)}
                      </span>
                      <LinkButton
                        size="sm"
                        variant="primary"
                        to="/project/$projectSlug/automation/runs/$runId"
                        params={{ projectSlug, runId: String(run.id) }}
                      >
                        Open
                      </LinkButton>
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
