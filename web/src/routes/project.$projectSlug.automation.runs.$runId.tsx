import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import {
  getAutomationRunDetail,
  linkAutomationResultToManualCase,
  searchManualTestCasesForAutomation,
  unlinkAutomationResultFromManualCase,
  type AutomationManualCaseOption,
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

const RESULT_FILTERS = [
  'All',
  'Failures',
  'failed',
  'passed',
  'skipped',
  'blocked',
  'unknown',
] as const
const RESULT_LINK_FILTERS = ['All', 'linked', 'unlinked'] as const
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

function isFailureResult(result: AutomationRunResultItem): boolean {
  return result.status === 'failed' || result.status === 'blocked'
}

function getResultDiagnosticText(result: AutomationRunResultItem): string {
  return (
    result.errorMessage ??
    result.stackTrace ??
    result.stderr ??
    result.stdout ??
    'No diagnostic output captured for this result.'
  )
}

function getFailureDiagnostics(result: AutomationRunResultItem): string {
  return [
    `Test: ${result.name}`,
    `Suite: ${result.suite ?? 'No suite'}`,
    `Status: ${humanizeStatus(result.status)}`,
    `Duration: ${formatDuration(result.durationMs)}`,
    result.attachments.length > 0
      ? `\nArtifacts:\n${result.attachments
          .map((attachment) => `- ${attachment.name}: ${attachment.url}`)
          .join('\n')}`
      : null,
    result.errorMessage ? `\nError message:\n${result.errorMessage}` : null,
    result.stackTrace ? `\nStack trace:\n${result.stackTrace}` : null,
    result.stderr ? `\nstderr:\n${result.stderr}` : null,
    result.stdout ? `\nstdout:\n${result.stdout}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

function hasManualCaseOverride(
  overrides: Record<number, AutomationManualCaseOption | null>,
  resultId: number,
): boolean {
  return Object.prototype.hasOwnProperty.call(overrides, resultId)
}

function DiagnosticBlock({
  title,
  value,
}: {
  title: string
  value: string | null
}) {
  if (!value) {
    return null
  }

  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
        {title}
      </div>
      <pre className="max-h-72 overflow-auto rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3 text-xs leading-6 text-[var(--tms-text)]">
        <code>{value}</code>
      </pre>
    </div>
  )
}

function formatArtifactSize(sizeBytes: number | null): string | null {
  if (!sizeBytes || sizeBytes <= 0) {
    return null
  }

  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  const kilobytes = sizeBytes / 1024

  if (kilobytes < 1024) {
    return `${Math.round(kilobytes)} KB`
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`
}

function isExternalArtifactUrl(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function AutomationArtifactsBlock({
  attachments,
}: {
  attachments: AutomationRunResultItem['attachments']
}) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
          Artifacts
        </div>
        <Badge>{attachments.length}</Badge>
      </div>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const size = formatArtifactSize(attachment.sizeBytes)
          const meta = [attachment.type, attachment.contentType, size]
            .filter(Boolean)
            .join(' / ')

          return (
            <div
              key={attachment.id ?? `${attachment.name}-${attachment.url}`}
              className="rounded-lg border border-[var(--tms-border-subtle)] bg-[var(--tms-surface)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[var(--tms-text)]">
                    {attachment.name}
                  </div>
                  {meta ? (
                    <div className="mt-1 text-xs text-[var(--tms-text-muted)]">
                      {meta}
                    </div>
                  ) : null}
                </div>
                {isExternalArtifactUrl(attachment.url) ? (
                  <a
                    href={attachment.url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs font-semibold text-[var(--tms-primary)] hover:underline"
                  >
                    Open
                  </a>
                ) : null}
              </div>
              {!isExternalArtifactUrl(attachment.url) ? (
                <code className="mt-2 block truncate rounded-md bg-[var(--tms-surface-soft)] px-2 py-1 text-xs text-[var(--tms-text-muted)]">
                  {attachment.url}
                </code>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AutomationRunDetailPage() {
  const { project, run } = Route.useLoaderData()
  const projectSlug = project.slug ?? project.id.toString()
  const [activeFilter, setActiveFilter] = useState('All')
  const [linkFilter, setLinkFilter] =
    useState<(typeof RESULT_LINK_FILTERS)[number]>('All')
  const failedResults = useMemo(
    () => run.results.filter((result) => isFailureResult(result)),
    [run.results],
  )
  const [selectedResultId, setSelectedResultId] = useState<number | null>(
    failedResults[0]?.id ?? run.results[0]?.id ?? null,
  )
  const [manualCaseOverrides, setManualCaseOverrides] = useState<
    Record<number, AutomationManualCaseOption | null>
  >({})
  const [caseSearch, setCaseSearch] = useState('')
  const [caseOptions, setCaseOptions] = useState<AutomationManualCaseOption[]>(
    [],
  )
  const [caseLinkStatus, setCaseLinkStatus] = useState<string | null>(null)
  const [caseLinkError, setCaseLinkError] = useState<string | null>(null)
  const [diagnosticCopyStatus, setDiagnosticCopyStatus] = useState<
    string | null
  >(null)
  const linkedCount = useMemo(
    () => run.results.filter((result) => getLinkedManualCase(result)).length,
    [manualCaseOverrides, run.results],
  )
  const suggestedCount = useMemo(
    () =>
      run.results.filter(
        (result) => !getLinkedManualCase(result) && result.suggestedManualCase,
      ).length,
    [manualCaseOverrides, run.results],
  )
  const failedSuiteCount = useMemo(() => {
    return new Set(
      failedResults.map((result) => result.suite ?? 'No suite'),
    ).size
  }, [failedResults])
  const unlinkedFailureCount = useMemo(
    () =>
      failedResults.filter((result) => !getLinkedManualCase(result)).length,
    [failedResults, manualCaseOverrides],
  )

  const filteredResults = useMemo(() => {
    let nextResults = run.results

    if (activeFilter === 'Failures') {
      nextResults = nextResults.filter((result) => isFailureResult(result))
    } else if (activeFilter !== 'All') {
      nextResults = nextResults.filter((result) => result.status === activeFilter)
    }

    if (linkFilter === 'linked') {
      nextResults = nextResults.filter((result) => getLinkedManualCase(result))
    } else if (linkFilter === 'unlinked') {
      nextResults = nextResults.filter((result) => !getLinkedManualCase(result))
    }

    return nextResults
  }, [activeFilter, linkFilter, manualCaseOverrides, run.results])

  const selectedResult = useMemo(() => {
    return (
      run.results.find((result) => result.id === selectedResultId) ??
      failedResults[0] ??
      run.results[0] ??
      null
    )
  }, [failedResults, run.results, selectedResultId])

  function getLinkedManualCase(
    result: AutomationRunResultItem,
  ): AutomationManualCaseOption | null {
    if (hasManualCaseOverride(manualCaseOverrides, result.id)) {
      return manualCaseOverrides[result.id]
    }

    if (!result.manualTestId) {
      return null
    }

    return {
      id: result.manualTestId,
      title: `Manual case #${result.manualTestId}`,
      suiteName: null,
      status: null,
    }
  }

  const selectedManualCase = selectedResult
    ? getLinkedManualCase(selectedResult)
    : null

  useEffect(() => {
    setDiagnosticCopyStatus(null)
  }, [selectedResultId])

  async function handleSearchManualCases() {
    const query = caseSearch.trim()

    setCaseLinkError(null)
    setCaseLinkStatus('Searching manual cases...')

    try {
      const result = await searchManualTestCasesForAutomation({
        data: {
          projectId: project.id,
          query,
        },
      })
      setCaseOptions(result.cases)
      setCaseLinkStatus(
        result.cases.length > 0 ? null : 'No matching manual cases found.',
      )
    } catch (error) {
      setCaseLinkStatus(null)
      setCaseLinkError(
        error instanceof Error
          ? error.message
          : 'Could not search manual cases.',
      )
    }
  }

  async function handleLinkManualCase(
    manualCaseId: number,
    targetResult: AutomationRunResultItem | null = selectedResult,
  ) {
    if (!targetResult) {
      return
    }

    setCaseLinkError(null)
    setCaseLinkStatus('Linking manual case...')

    try {
      const result = await linkAutomationResultToManualCase({
        data: {
          projectId: project.id,
          runId: run.id,
          resultId: targetResult.id,
          manualTestId: manualCaseId,
        },
      })

      setManualCaseOverrides((current) => ({
        ...current,
        [targetResult.id]: result.manualCase,
      }))
      setCaseOptions([])
      setCaseSearch('')
      setCaseLinkStatus('Manual case linked.')
    } catch (error) {
      setCaseLinkStatus(null)
      setCaseLinkError(
        error instanceof Error ? error.message : 'Could not link manual case.',
      )
    }
  }

  async function handleUnlinkManualCase() {
    if (!selectedResult) {
      return
    }

    setCaseLinkError(null)
    setCaseLinkStatus('Unlinking manual case...')

    try {
      await unlinkAutomationResultFromManualCase({
        data: {
          projectId: project.id,
          runId: run.id,
          resultId: selectedResult.id,
        },
      })

      setManualCaseOverrides((current) => ({
        ...current,
        [selectedResult.id]: null,
      }))
      setCaseLinkStatus('Manual case unlinked.')
    } catch (error) {
      setCaseLinkStatus(null)
      setCaseLinkError(
        error instanceof Error
          ? error.message
          : 'Could not unlink manual case.',
      )
    }
  }

  async function handleCopySelectedDiagnostics() {
    if (!selectedResult) {
      return
    }

    const text = getFailureDiagnostics(selectedResult)
    setDiagnosticCopyStatus(null)

    try {
      await navigator.clipboard.writeText(text)
      setDiagnosticCopyStatus('Copied diagnostics.')
    } catch {
      setDiagnosticCopyStatus('Copy failed. Select the diagnostic text manually.')
    }
  }

  const metadataItems = [
    ['Environment', run.environment ?? 'Not set'],
    ['Branch', run.branch ?? 'Not set'],
    ['Commit', run.commitSha ?? 'Not set'],
    ['Trigger', run.triggerSource],
    ['Started', formatDate(run.startedAt)],
    ['Duration', formatDuration(run.durationMs)],
  ] as const

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

          <Panel className="px-4 py-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.2fr)_minmax(260px,0.8fr)]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(run.status)}>
                    {humanizeStatus(run.status)}
                  </Badge>
                  <span className="text-sm font-semibold text-[var(--tms-text-muted)]">
                    {run.totalCount} results
                  </span>
                </div>
                <div className="mt-3">
                  <SegmentedRunProgress run={run} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {[
                  ['Passed', run.passedCount, 'text-[var(--run-passed-text)]'],
                  ['Failed', run.failedCount, 'text-[var(--run-failed-text)]'],
                  ['Skipped', run.skippedCount, 'text-[var(--run-skipped-text)]'],
                  ['Blocked', run.blockedCount, 'text-[var(--run-blocked-text)]'],
                ].map(([label, value, tone]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-3 py-2"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      {label}
                    </div>
                    <div className={`mt-1 text-xl font-semibold ${tone}`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {metadataItems.map(([label, value]) => (
                  <div key={label} className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      {label}
                    </dt>
                    <dd
                      className={
                        label === 'Commit'
                          ? 'mt-1 truncate font-mono text-xs text-[var(--tms-text)]'
                          : 'mt-1 truncate font-semibold text-[var(--tms-text)]'
                      }
                    >
                      {value}
                    </dd>
                  </div>
                ))}
                {run.ciBuildUrl ? (
                  <div className="col-span-2">
                    <a
                      href={run.ciBuildUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-[var(--tms-primary)] hover:underline"
                    >
                      Open CI build
                    </a>
                  </div>
                ) : null}
              </dl>
            </div>
          </Panel>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_430px]">
            <div className="space-y-4">
              <Panel className="px-4 py-4">
                <WorkspaceSectionHeader
                  title="Failure triage"
                  description="Review broken tests first, then inspect diagnostics and manual case links."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="runFailed">{failedResults.length} failing</Badge>
                      <Badge>{failedSuiteCount} suites</Badge>
                      <Badge>{unlinkedFailureCount} unlinked</Badge>
                    </div>
                  }
                  className="mb-3"
                />
                {failedResults.length === 0 ? (
                  <EmptyState
                    title="No failures"
                    description="This automation run has no failed or blocked results."
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={activeFilter === 'Failures' ? 'primary' : 'secondary'}
                        onClick={() => setActiveFilter('Failures')}
                      >
                        Show failures
                      </Button>
                      <Button
                        size="sm"
                        variant={linkFilter === 'unlinked' ? 'primary' : 'secondary'}
                        onClick={() => {
                          setActiveFilter('Failures')
                          setLinkFilter('unlinked')
                        }}
                      >
                        Unlinked failures
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setActiveFilter('All')
                          setLinkFilter('All')
                        }}
                      >
                        Reset filters
                      </Button>
                    </div>
                    <div className="grid gap-2 lg:grid-cols-2">
                      {failedResults.slice(0, 6).map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => {
                            setSelectedResultId(result.id)
                            setActiveFilter('Failures')
                          }}
                          className={`rounded-lg border px-3 py-2 text-left transition ${
                            result.id === selectedResult?.id
                              ? 'border-[var(--tms-border-focus)] bg-[var(--state-selected)]'
                              : 'border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] hover:bg-[var(--tms-hover)]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="min-w-0 truncate text-sm font-semibold text-[var(--tms-text)]">
                              {result.name}
                            </span>
                            <Badge variant={getStatusBadgeVariant(result.status)}>
                              {humanizeStatus(result.status)}
                            </Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--tms-text-muted)]">
                            <span>{result.suite ?? 'No suite'}</span>
                            <span>{formatDuration(result.durationMs)}</span>
                            <span>
                              {getLinkedManualCase(result) ? 'linked' : 'unlinked'}
                            </span>
                            {result.retryCount > 0 ? (
                              <span>{result.retryCount} retries</span>
                            ) : null}
                          </div>
                          <div className="mt-1 line-clamp-1 text-xs text-[var(--tms-text-muted)]">
                            {getResultDiagnosticText(result)}
                          </div>
                        </button>
                      ))}
                    </div>
                    {failedResults.length > 6 ? (
                      <div className="text-xs font-semibold text-[var(--tms-text-muted)]">
                        Showing first 6 failures. Use the table filter for the full failure list.
                      </div>
                    ) : null}
                  </div>
                )}
              </Panel>

              <Panel>
              <div className="border-b border-[var(--tms-border-subtle)] px-4 py-4">
                <WorkspaceSectionHeader
                  title="Results"
                  description="Inspect automated tests, linked manual cases, suggestions, and failure output."
                  action={
                    <div className="flex flex-wrap gap-2">
                      <Badge>
                        {linkedCount}/{run.results.length} linked
                      </Badge>
                      {suggestedCount > 0 ? (
                        <Badge variant="primary">{suggestedCount} suggested</Badge>
                      ) : null}
                      <Badge>{filteredResults.length} shown</Badge>
                    </div>
                  }
                />
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    {RESULT_FILTERS.map((filter) => (
                      <Button
                        key={filter}
                        size="sm"
                        variant={filter === activeFilter ? 'primary' : 'secondary'}
                        onClick={() => setActiveFilter(filter)}
                      >
                        {filter === 'All' || filter === 'Failures'
                          ? filter
                          : humanizeStatus(filter)}
                      </Button>
                    ))}
                  </div>
                  <div className="h-6 w-px bg-[var(--tms-border-subtle)]" />
                  <div className="flex flex-wrap gap-2">
                    {RESULT_LINK_FILTERS.map((filter) => (
                      <Button
                        key={filter}
                        size="sm"
                        variant={filter === linkFilter ? 'primary' : 'secondary'}
                        onClick={() => setLinkFilter(filter)}
                      >
                        {filter === 'All'
                          ? 'All links'
                          : filter === 'linked'
                            ? 'Linked'
                            : 'Unlinked'}
                      </Button>
                    ))}
                  </div>
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
                    {filteredResults.map((result) => {
                      const linkedManualCase = getLinkedManualCase(result)
                      const suggestedManualCase = result.suggestedManualCase

                      return (
                        <TableRow
                          key={result.id}
                          columns={RESULT_TABLE_COLUMNS}
                          minWidth="1080px"
                          padding="sm"
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedResultId(result.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setSelectedResultId(result.id)
                            }
                          }}
                          className={
                            result.id === selectedResult?.id
                              ? 'cursor-pointer bg-[var(--state-selected)]'
                              : 'cursor-pointer'
                          }
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
                          {linkedManualCase ? (
                            <LinkButton
                              size="sm"
                              to="/test/$testId"
                              params={{ testId: String(linkedManualCase.id) }}
                            >
                              #{linkedManualCase.id}
                            </LinkButton>
                          ) : suggestedManualCase ? (
                            <button
                              type="button"
                              className="text-left text-sm font-semibold text-[var(--tms-primary)] hover:underline"
                              onClick={(event) => {
                                event.stopPropagation()
                                setSelectedResultId(result.id)
                                void handleLinkManualCase(
                                  suggestedManualCase.id,
                                  result,
                                )
                              }}
                            >
                              Suggested #{suggestedManualCase.id}
                            </button>
                          ) : (
                            <span className="text-[var(--tms-text-muted)]">
                              {result.caseKey ?? 'Unlinked'}
                            </span>
                          )}
                          <ResultErrorPreview result={result} />
                        </TableRow>
                      )
                    })}
                  </TableShell>
                </div>
              )}
            </Panel>
            </div>

            <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
              <Panel className="px-5 py-5">
                <WorkspaceSectionHeader
                  title={selectedResult ? 'Result diagnostics' : 'Select a result'}
                  description="Failure output, logs, and manual case context."
                  className="mb-4"
                />
                {selectedResult ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(selectedResult.status)}>
                          {humanizeStatus(selectedResult.status)}
                        </Badge>
                        <span className="text-sm font-semibold text-[var(--tms-text-muted)]">
                          {formatDuration(selectedResult.durationMs)}
                        </span>
                        {selectedResult.retryCount > 0 ? (
                          <Badge>{selectedResult.retryCount} retries</Badge>
                        ) : null}
                      </div>
                      <h2 className="mt-3 break-words text-lg font-semibold text-[var(--tms-text)]">
                        {selectedResult.name}
                      </h2>
                      <div className="mt-1 text-sm text-[var(--tms-text-muted)]">
                        {selectedResult.suite ?? 'No suite'}
                        {selectedResult.filePath
                          ? ` / ${selectedResult.filePath}`
                          : ''}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleCopySelectedDiagnostics()}
                        >
                          Copy diagnostics
                        </Button>
                        {selectedManualCase ? (
                          <LinkButton
                            size="sm"
                            to="/test/$testId"
                            params={{ testId: String(selectedManualCase.id) }}
                          >
                            Open manual case
                          </LinkButton>
                        ) : null}
                      </div>
                      {diagnosticCopyStatus ? (
                        <div className="mt-2 text-xs font-semibold text-[var(--tms-text-muted)]">
                          {diagnosticCopyStatus}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3 text-sm">
                      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                        Manual case
                      </div>
                      <div className="mt-2 space-y-3">
                        {selectedManualCase ? (
                          <div className="space-y-3">
                            <div className="rounded-lg border border-[var(--tms-border-subtle)] bg-[var(--tms-surface)] p-3">
                              <div className="font-semibold text-[var(--tms-text)]">
                                #{selectedManualCase.id} {selectedManualCase.title}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--tms-text-muted)]">
                                {selectedManualCase.suiteName ? (
                                  <span>{selectedManualCase.suiteName}</span>
                                ) : null}
                                {selectedManualCase.status ? (
                                  <span>{selectedManualCase.status}</span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <LinkButton
                                size="sm"
                                to="/test/$testId"
                                params={{ testId: String(selectedManualCase.id) }}
                              >
                                Open case
                              </LinkButton>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleUnlinkManualCase}
                              >
                                Unlink
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <span className="block text-[var(--tms-text-muted)]">
                              {selectedResult.caseKey
                                ? `Detected key ${selectedResult.caseKey}, not linked yet.`
                                : 'Automation-only result. Search and link a manual test case if this automated test covers one.'}
                            </span>
                            {selectedResult.suggestedManualCase ? (
                              <div className="rounded-lg border border-[var(--tms-border-focus)] bg-[var(--state-selected)] p-3">
                                <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                                  Suggested match
                                </div>
                                <div className="mt-1 font-semibold text-[var(--tms-text)]">
                                  #{selectedResult.suggestedManualCase.id}{' '}
                                  {selectedResult.suggestedManualCase.title}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--tms-text-muted)]">
                                  {selectedResult.suggestedManualCase.suiteName ? (
                                    <span>
                                      {selectedResult.suggestedManualCase.suiteName}
                                    </span>
                                  ) : null}
                                  {selectedResult.suggestedManualCase.status ? (
                                    <span>
                                      {selectedResult.suggestedManualCase.status}
                                    </span>
                                  ) : null}
                                </div>
                                <Button
                                  size="sm"
                                  className="mt-3"
                                  onClick={() =>
                                    void handleLinkManualCase(
                                      selectedResult.suggestedManualCase!.id,
                                    )
                                  }
                                >
                                  Link suggested case
                                </Button>
                              </div>
                            ) : null}
                            <div className="flex gap-2">
                              <Input
                                size="sm"
                                value={caseSearch}
                                placeholder="Search title, #123, TMS-123"
                                onChange={(event) =>
                                  setCaseSearch(event.currentTarget.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void handleSearchManualCases()
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void handleSearchManualCases()}
                              >
                                Search
                              </Button>
                            </div>
                            {caseOptions.length > 0 ? (
                              <div className="space-y-2">
                                {caseOptions.map((manualCase) => (
                                  <button
                                    key={manualCase.id}
                                    type="button"
                                    className="w-full rounded-lg border border-[var(--tms-border-subtle)] bg-[var(--tms-surface)] p-3 text-left transition hover:bg-[var(--tms-hover)]"
                                    onClick={() =>
                                      void handleLinkManualCase(manualCase.id)
                                    }
                                  >
                                    <div className="font-semibold text-[var(--tms-text)]">
                                      #{manualCase.id} {manualCase.title}
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--tms-text-muted)]">
                                      {manualCase.suiteName ? (
                                        <span>{manualCase.suiteName}</span>
                                      ) : null}
                                      {manualCase.status ? (
                                        <span>{manualCase.status}</span>
                                      ) : null}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                        {caseLinkStatus ? (
                          <div className="text-xs font-semibold text-[var(--tms-text-muted)]">
                            {caseLinkStatus}
                          </div>
                        ) : null}
                        {caseLinkError ? (
                          <div className="rounded-lg border border-[var(--tms-danger-border)] bg-[var(--tms-danger-soft)] px-3 py-2 text-xs font-semibold text-[var(--tms-danger)]">
                            {caseLinkError}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <AutomationArtifactsBlock
                      attachments={selectedResult.attachments}
                    />

                    <DiagnosticBlock
                      title="Error message"
                      value={selectedResult.errorMessage}
                    />
                    <DiagnosticBlock
                      title="Stack trace"
                      value={selectedResult.stackTrace}
                    />
                    <DiagnosticBlock title="stderr" value={selectedResult.stderr} />
                    <DiagnosticBlock title="stdout" value={selectedResult.stdout} />
                    {!selectedResult.errorMessage &&
                    !selectedResult.stackTrace &&
                    !selectedResult.stderr &&
                    !selectedResult.stdout &&
                    selectedResult.attachments.length === 0 ? (
                      <EmptyState
                        title="No diagnostics"
                        description="The importer did not receive artifacts, error output, stdout, or stderr for this result."
                      />
                    ) : null}
                  </div>
                ) : (
                  <EmptyState
                    title="No result selected"
                    description="Select a result from the table to inspect details."
                  />
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
