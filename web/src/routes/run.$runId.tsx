import {
  Link,
  createFileRoute,
  notFound,
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import {
  executeRunTest,
  getCaseExecutionHistory,
  getRunDetail,
  saveRunItemComment,
  updateRunStatus,
} from '../features/runs/server'
import type { CaseExecutionHistoryEntry } from '../features/runs/server'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { Panel } from '../components/ui/Panel'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import { Textarea } from '../components/ui/Textarea'

export const Route = createFileRoute('/run/$runId')({
  loader: async ({ params }) => {
    const runId = Number(params.runId)

    if (!Number.isInteger(runId) || runId <= 0) {
      throw notFound()
    }

    return getRunDetail({
      data: {
        runId,
      },
    })
  },
  component: RunDetailPage,
})

type RunFilter = 'All' | 'Not run' | 'Failed' | 'Blocked' | 'Passed'
type RunItemStatus = 'Passed' | 'Failed' | 'Blocked' | null
type RunStatus = 'In progress' | 'Completed' | 'Closed'
type RunResultSelectValue = Exclude<RunItemStatus, null> | 'Not run'

const RUN_FILTERS: RunFilter[] = ['All', 'Not run', 'Failed', 'Blocked', 'Passed']
const STATUS_ACTIONS: Array<Exclude<RunItemStatus, null>> = [
  'Passed',
  'Failed',
  'Blocked',
]
const RUN_RESULT_OPTIONS: RunResultSelectValue[] = [
  'Not run',
  'Passed',
  'Failed',
  'Blocked',
]

function getRunResultChipClass(status: RunFilter | RunItemStatus): string {
  if (status === 'Passed') {
    return 'tms-chip-run-passed'
  }

  if (status === 'Failed') {
    return 'tms-chip-run-failed'
  }

  if (status === 'Blocked') {
    return 'tms-chip-run-blocked'
  }

  if (status === 'Not run' || status === null) {
    return 'tms-chip-run-not-run'
  }

  return 'tms-chip-primary'
}

function getRunResultFromValue(value: RunResultSelectValue): RunItemStatus {
  return value === 'Not run' ? null : value
}

function formatRunPreviewMeta(
  value: string | null | undefined,
  fallback = 'Not set',
): string {
  return value?.trim() || fallback
}

function formatExecutedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function RunExecutionRichContent({
  html,
  emptyLabel,
}: {
  html: string | null | undefined
  emptyLabel: string
}) {
  if (!html || html.trim().length === 0) {
    return <p className="run-execution-preview-panel__empty">{emptyLabel}</p>
  }

  return (
    <div
      className="run-execution-preview-panel__rich rich-output"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function RunDetailPage() {
  const data = Route.useLoaderData()
  const [tests, setTests] = useState(data.tests)
  const [runStatus, setRunStatus] = useState<RunStatus>(data.run.status)
  const [isRunStatusPending, setIsRunStatusPending] = useState(false)
  const testRowRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [pendingStatusByTestId, setPendingStatusByTestId] = useState<
    Record<number, boolean>
  >({})
  const [pendingCommentByTestId, setPendingCommentByTestId] = useState<
    Record<number, boolean>
  >({})
  const [commentByTestId, setCommentByTestId] = useState<Record<number, string>>({})
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([])
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [runFilter, setRunFilter] = useState<RunFilter>('All')
  const [previewTestId, setPreviewTestId] = useState<number | null>(null)
  const [focusedTestId, setFocusedTestId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [suiteFilter, setSuiteFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [caseHistory, setCaseHistory] = useState<
    CaseExecutionHistoryEntry[] | null
  >(null)
  const [caseHistoryLoading, setCaseHistoryLoading] = useState(false)
  const [caseHistoryError, setCaseHistoryError] = useState(false)
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0)

  const passedCount = tests.filter((test) => test.status === 'Passed').length
  const failedCount = tests.filter((test) => test.status === 'Failed').length
  const blockedCount = tests.filter((test) => test.status === 'Blocked').length
  const notRunCount = tests.filter((test) => test.status === null).length
  const executedCount = passedCount + failedCount + blockedCount
  const progress =
    tests.length === 0
      ? 0
      : Math.round((executedCount / tests.length) * 100)
  const passedProgress =
    tests.length === 0 ? 0 : (passedCount / tests.length) * 100
  const failedProgress =
    tests.length === 0 ? 0 : (failedCount / tests.length) * 100
  const blockedProgress =
    tests.length === 0 ? 0 : (blockedCount / tests.length) * 100

  const filteredTests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return tests.filter((test) => {
      if (runFilter === 'Not run') {
        if (test.status !== null) {
          return false
        }
      } else if (runFilter !== 'All') {
        if (test.status !== runFilter) {
          return false
        }
      }

      if (suiteFilter !== 'All' && test.suiteName !== suiteFilter) {
        return false
      }

      if (priorityFilter !== 'All' && test.priority !== priorityFilter) {
        return false
      }

      if (query && !test.title.toLowerCase().includes(query)) {
        return false
      }

      return true
    })
  }, [tests, runFilter, suiteFilter, priorityFilter, searchQuery])

  const suiteOptions = useMemo(
    () =>
      Array.from(
        new Set(
          tests
            .map((test) => test.suiteName)
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [tests],
  )

  const priorityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          tests
            .map((test) => test.priority)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [tests],
  )

  const hasSecondaryFilters =
    searchQuery.trim() !== '' ||
    suiteFilter !== 'All' ||
    priorityFilter !== 'All'

  const isRunLocked = runStatus !== 'In progress'

  const previewTest = useMemo(
    () =>
      previewTestId === null
        ? null
        : tests.find((test) => test.id === previewTestId) ?? null,
    [tests, previewTestId],
  )

  const visibleTestIds = filteredTests.map((test) => test.id)
  const selectedTestIdSet = useMemo(
    () => new Set(selectedTestIds),
    [selectedTestIds],
  )
  const selectedVisibleCount = visibleTestIds.filter((id) =>
    selectedTestIdSet.has(id),
  ).length
  const allVisibleSelected =
    visibleTestIds.length > 0 && selectedVisibleCount === visibleTestIds.length
  const nextNotRunTestId = useMemo(() => {
    const nextTest = tests.find((test) => test.status === null)
    return nextTest?.id ?? null
  }, [tests])

  useEffect(() => {
    setTests(data.tests)
    setCommentByTestId(
      Object.fromEntries(
        data.tests.map((test) => [test.id, test.comment ?? '']),
      ) as Record<number, string>,
    )
    setSelectedTestIds((current) =>
      current.filter((id) => data.tests.some((test) => test.id === id)),
    )
    setPreviewTestId((current) =>
      current !== null && data.tests.some((test) => test.id === current)
        ? current
        : null,
    )
  }, [data.tests])

  useEffect(() => {
    setRunStatus(data.run.status)
  }, [data.run.status])

  useEffect(() => {
    if (previewTestId === null) {
      setCaseHistory(null)
      setCaseHistoryError(false)
      setCaseHistoryLoading(false)
      return
    }

    let cancelled = false
    setCaseHistoryLoading(true)
    setCaseHistoryError(false)

    getCaseExecutionHistory({ data: { testId: previewTestId } })
      .then((result) => {
        if (!cancelled) {
          setCaseHistory(result.entries)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCaseHistory(null)
          setCaseHistoryError(true)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setCaseHistoryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [previewTestId, historyRefreshKey])

  useEffect(() => {
    setFocusedTestId((current) =>
      current !== null && filteredTests.some((test) => test.id === current)
        ? current
        : filteredTests[0]?.id ?? null,
    )
  }, [filteredTests])

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      const tag = target.tagName

      return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      )
    }

    function focusRow(testId: number | null): void {
      if (testId === null) {
        return
      }

      setFocusedTestId(testId)
      window.setTimeout(() => {
        testRowRefs.current[testId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        })
      }, 0)
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        if (selectedTestIds.length > 0) {
          event.preventDefault()
          setSelectedTestIds([])
          return
        }

        if (previewTestId !== null) {
          event.preventDefault()
          setPreviewTestId(null)
        }

        return
      }

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTypingTarget(event.target)
      ) {
        return
      }

      if (filteredTests.length === 0) {
        return
      }

      const currentIndex = filteredTests.findIndex(
        (test) => test.id === focusedTestId,
      )
      const key = event.key.toLowerCase()

      if (key === 'j' || event.key === 'ArrowDown') {
        event.preventDefault()
        const nextIndex =
          currentIndex < 0
            ? 0
            : Math.min(currentIndex + 1, filteredTests.length - 1)
        focusRow(filteredTests[nextIndex]?.id ?? null)
        return
      }

      if (key === 'k' || event.key === 'ArrowUp') {
        event.preventDefault()
        const prevIndex = currentIndex <= 0 ? 0 : currentIndex - 1
        focusRow(filteredTests[prevIndex]?.id ?? null)
        return
      }

      if (focusedTestId === null) {
        return
      }

      if (isRunLocked) {
        return
      }

      if (key === 'p' || key === 'f' || key === 'b') {
        event.preventDefault()
        const nextStatus =
          key === 'p' ? 'Passed' : key === 'f' ? 'Failed' : 'Blocked'
        void handleRunTest(focusedTestId, nextStatus)
        return
      }

      if (key === 'n' || event.key === 'Backspace') {
        event.preventDefault()
        void handleRunTest(focusedTestId, null)
        return
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        setPreviewTestId(focusedTestId)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    filteredTests,
    focusedTestId,
    handleRunTest,
    selectedTestIds,
    previewTestId,
    isRunLocked,
  ])

  function toggleTestSelection(testId: number): void {
    setSelectedTestIds((current) =>
      current.includes(testId)
        ? current.filter((id) => id !== testId)
        : [...current, testId],
    )
  }

  function toggleVisibleSelection(): void {
    if (visibleTestIds.length === 0) {
      return
    }

    setSelectedTestIds((current) => {
      const visibleIdSet = new Set(visibleTestIds)

      if (allVisibleSelected) {
        return current.filter((id) => !visibleIdSet.has(id))
      }

      return Array.from(new Set([...current, ...visibleTestIds]))
    })
  }

  async function handleRunTest(
    testId: number,
    status: RunItemStatus,
  ): Promise<void> {
    if (isRunLocked) {
      return
    }

    setErrorMessage(null)

    const previousTests = tests
    const executedBy = status ? data.currentUser.name : null
    const executedAt = status ? new Date().toISOString() : null
    setTests((current) =>
      current.map((test) =>
        test.id === testId
          ? { ...test, status, executedBy, executedAt }
          : test,
      ),
    )
    setPendingStatusByTestId((current) => ({
      ...current,
      [testId]: true,
    }))

    try {
      await executeRunTest({
        data: {
          runId: data.run.id,
          testId,
          status,
          comment: commentByTestId[testId] ?? '',
        },
      })

      setHistoryRefreshKey((key) => key + 1)

      if (status !== null) {
        const nextTest = previousTests.find(
          (test) => test.id !== testId && test.status === null,
        )

        if (nextTest?.id) {
          window.setTimeout(() => {
            testRowRefs.current[nextTest.id]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            })
          }, 120)
        }
      }
    } catch (error) {
      setTests(previousTests)
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save run result.',
      )
    } finally {
      setPendingStatusByTestId((current) => {
        const nextState = { ...current }
        delete nextState[testId]
        return nextState
      })
    }
  }

  async function handleBulkStatus(status: RunItemStatus): Promise<void> {
    if (selectedTestIds.length === 0 || isRunLocked) {
      return
    }

    setErrorMessage(null)

    const previousTests = tests
    const targetIds = new Set(selectedTestIds)
    const executedBy = status ? data.currentUser.name : null
    const executedAt = status ? new Date().toISOString() : null
    setTests((current) =>
      current.map((test) =>
        targetIds.has(test.id)
          ? { ...test, status, executedBy, executedAt }
          : test,
      ),
    )
    setIsBulkUpdating(true)

    try {
      await Promise.all(
        selectedTestIds.map((testId) =>
          executeRunTest({
            data: {
              runId: data.run.id,
              testId,
              status,
              comment: commentByTestId[testId] ?? '',
            },
          }),
        ),
      )

      setSelectedTestIds([])
      setHistoryRefreshKey((key) => key + 1)
    } catch (error) {
      setTests(previousTests)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update selected run items.',
      )
    } finally {
      setIsBulkUpdating(false)
    }
  }

  async function handleSaveComment(
    testId: number,
    nextComment?: string,
  ): Promise<void> {
    const currentTest = tests.find((test) => test.id === testId)
    const savedComment = currentTest?.comment ?? ''
    const comment = nextComment ?? commentByTestId[testId] ?? ''

    if (pendingCommentByTestId[testId] || comment === savedComment || isRunLocked) {
      return
    }

    setErrorMessage(null)

    const previousTests = tests
    setTests((current) =>
      current.map((test) =>
        test.id === testId ? { ...test, comment } : test,
      ),
    )
    setPendingCommentByTestId((current) => ({
      ...current,
      [testId]: true,
    }))

    try {
      await saveRunItemComment({
        data: {
          runId: data.run.id,
          testId,
          comment,
        },
      })
    } catch (error) {
      setTests(previousTests)
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save run comment.',
      )
    } finally {
      setPendingCommentByTestId((current) => {
        const nextState = { ...current }
        delete nextState[testId]
        return nextState
      })
    }
  }

  async function handleRunStatusChange(nextStatus: RunStatus): Promise<void> {
    if (nextStatus === runStatus) {
      return
    }

    setErrorMessage(null)
    const previousStatus = runStatus
    setRunStatus(nextStatus)
    setIsRunStatusPending(true)

    try {
      await updateRunStatus({
        data: {
          runId: data.run.id,
          status: nextStatus,
        },
      })
    } catch (error) {
      setRunStatus(previousStatus)
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update run status.',
      )
    } finally {
      setIsRunStatusPending(false)
    }
  }

  return (
    <main className="tms-page">
      <div className="mx-auto max-w-[1680px] px-4 py-5 sm:px-6 lg:px-10">
        <section className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--tms-text-muted)]">
              <Link to="/" className="no-underline text-[var(--tms-primary)]">
                Workspace
              </Link>
              <span>/</span>
              {data.run.projectSlug ? (
                <Link
                  to="/project/$projectSlug/runs"
                  params={{ projectSlug: data.run.projectSlug }}
                  className="no-underline text-[var(--tms-primary)]"
                >
                  {data.run.projectName ?? 'Project'}
                </Link>
              ) : (
                <span>{data.run.projectName ?? 'Project'}</span>
              )}
              <span>/</span>
              <span>Run #{data.run.id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="m-0 text-3xl font-semibold tracking-tight text-[var(--tms-text)]">
                {data.run.name}
              </h1>
              <span
                className={`run-status-badge run-status-badge--${runStatus
                  .toLowerCase()
                  .replace(/\s+/g, '-')}`}
              >
                {runStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {runStatus === 'In progress' ? (
              <Button
                variant="primary"
                size="sm"
                disabled={isRunStatusPending}
                onClick={() => void handleRunStatusChange('Completed')}
              >
                Complete run
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isRunStatusPending}
                  onClick={() => void handleRunStatusChange('In progress')}
                >
                  Reopen
                </Button>
                {runStatus === 'Completed' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isRunStatusPending}
                    onClick={() => void handleRunStatusChange('Closed')}
                  >
                    Close run
                  </Button>
                ) : null}
              </>
            )}
            {data.run.projectSlug ? (
              <Link
                to="/project/$projectSlug/runs"
                params={{ projectSlug: data.run.projectSlug }}
                className="tms-button no-underline hover:text-[var(--tms-primary)]"
              >
                Back to runs
              </Link>
            ) : null}
          </div>
        </section>

        <Panel className="run-detail-summary sticky top-3 z-20 mb-4 bg-[var(--tms-surface)]/95 p-3 backdrop-blur">
          <div className="grid gap-3 xl:grid-cols-[220px_minmax(0,1fr)]">
            <div className="run-detail-progress">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="tms-kicker">
                    Progress
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-[var(--tms-text)]">
                    {progress}%
                  </div>
                </div>
                <div className="text-xs font-semibold text-[var(--tms-text-muted)]">
                  {executedCount}/{tests.length}
                </div>
              </div>
              <div
                className="tms-run-progress-track mt-2 flex h-1.5 overflow-hidden rounded-full"
                aria-label={`${passedCount} passed, ${failedCount} failed, ${blockedCount} blocked, ${notRunCount} not run`}
              >
                <div
                  className="tms-run-progress-segment tms-run-progress-segment--passed"
                  style={{ width: `${passedProgress}%` }}
                />
                <div
                  className="tms-run-progress-segment tms-run-progress-segment--failed"
                  style={{ width: `${failedProgress}%` }}
                />
                <div
                  className="tms-run-progress-segment tms-run-progress-segment--blocked"
                  style={{ width: `${blockedProgress}%` }}
                />
              </div>
              <div className="mt-1.5 text-[0.7rem] font-semibold text-[var(--tms-text-muted)]">
                {tests.length === 0
                  ? 'No test cases in this run'
                  : notRunCount > 0
                    ? `${notRunCount} not run remaining`
                    : 'All cases executed'}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Passed', value: passedCount, className: 'text-[var(--run-passed-text)]' },
                { label: 'Failed', value: failedCount, className: 'text-[var(--run-failed-text)]' },
                { label: 'Blocked', value: blockedCount, className: 'text-[var(--run-blocked-text)]' },
                { label: 'Not run', value: notRunCount, className: 'text-[var(--run-not-run-text)]' },
              ].map((item) => (
                <Panel
                  key={item.label}
                  className="run-detail-metric rounded-[var(--tms-radius-overlay)] border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-3 py-2 shadow-none"
                >
                  <div className="tms-kicker text-[0.64rem]">
                    {item.label}
                  </div>
                  <div className={`text-lg font-semibold ${item.className}`}>
                    {item.value}
                  </div>
                </Panel>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--tms-border-subtle)] pt-3">
            <div className="flex flex-wrap gap-2">
              {RUN_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  onClick={() => setRunFilter(filter)}
                  variant={runFilter === filter ? 'primary' : 'default'}
                  size="sm"
                  className={
                    runFilter === filter
                      ? getRunResultChipClass(filter)
                      : ''
                  }
                >
                  {filter}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {nextNotRunTestId ? (
                <Button
                  onClick={() =>
                    testRowRefs.current[nextNotRunTestId]?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    })
                  }
                  variant="primary"
                  size="sm"
                >
                  Next not run
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>

        {errorMessage ? (
          <Alert variant="danger" className="mb-5">
            {errorMessage}
          </Alert>
        ) : null}

        {isRunLocked ? (
          <Alert variant="info" className="mb-4">
            This run is {runStatus.toLowerCase()}. Reopen it to record results.
          </Alert>
        ) : null}

        {tests.length === 0 ? (
          <EmptyState
            title="No linked test cases"
            description="This test run currently has no linked test cases."
          />
        ) : (
          <>
            <div className="workspace-dense-table-header">
              <WorkspaceSectionHeader
                dense
                title="Execution table"
                description="Use J/K to move between cases and P/F/B to set the result."
                meta={`${filteredTests.length} visible`}
              />
            </div>

            <div className="run-execution-toolbar">
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by title…"
                size="sm"
                className="run-execution-toolbar__search"
                aria-label="Search cases by title"
              />
              <Select
                value={suiteFilter}
                onChange={(event) => setSuiteFilter(event.target.value)}
                size="sm"
                aria-label="Filter by suite"
              >
                <option value="All">All suites</option>
                {suiteOptions.map((suite) => (
                  <option key={suite} value={suite}>
                    {suite}
                  </option>
                ))}
              </Select>
              <Select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value)}
                size="sm"
                aria-label="Filter by priority"
              >
                <option value="All">All priorities</option>
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </Select>
              {hasSecondaryFilters ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setSuiteFilter('All')
                    setPriorityFilter('All')
                  }}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>

            {filteredTests.length === 0 ? (
              <EmptyState
                title="No matching test cases"
                description="No test cases match the current search and filters."
              />
            ) : (
            <div className="run-execution-workspace">
              <div className="run-execution-table-area">
                <TableShell className="run-execution-table shadow-[var(--tms-shadow-panel)]">
                  <TableHead
                    columns="36px 64px minmax(280px,1fr) 132px 88px"
                    minWidth="760px"
                    padding="sm"
                  >
                    <div>
                      <Checkbox
                        checked={allVisibleSelected}
                        onChange={toggleVisibleSelection}
                        aria-label="Select visible tests"
                      />
                    </div>
                    <div>ID</div>
                    <div>Title</div>
                    <div>Result</div>
                    <div className="text-center">Comment</div>
                  </TableHead>

                  {filteredTests.map((test) => {
                    const isStatusPending = Boolean(pendingStatusByTestId[test.id])
                    const hasComment = Boolean((test.comment ?? '').trim())

                    return (
                      <TableRow
                        key={test.id}
                        ref={(node) => {
                          testRowRefs.current[test.id] = node
                        }}
                        columns="36px 64px minmax(280px,1fr) 132px 88px"
                        minWidth="760px"
                        padding="sm"
                        className={`run-execution-row${
                          previewTestId === test.id
                            ? ' run-execution-row--active'
                            : ''
                        }${
                          focusedTestId === test.id
                            ? ' run-execution-row--focused'
                            : ''
                        }`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setFocusedTestId(test.id)
                          setPreviewTestId(test.id)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setFocusedTestId(test.id)
                            setPreviewTestId(test.id)
                          }
                        }}
                      >
                        <div onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={selectedTestIdSet.has(test.id)}
                            onChange={() => toggleTestSelection(test.id)}
                            aria-label={`Select test ${test.id}`}
                          />
                        </div>
                        <Link
                          to="/test/$testId"
                          params={{ testId: test.id.toString() }}
                          className="text-sm font-semibold no-underline text-[var(--tms-primary)]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          #{test.id}
                        </Link>
                        <div className="min-w-0 pr-3">
                          <div className="truncate text-sm font-semibold text-[var(--tms-text)]">
                            {test.title}
                          </div>
                          {test.executedBy ? (
                            <div className="truncate text-[0.7rem] text-[var(--tms-text-muted)]">
                              by {test.executedBy}
                            </div>
                          ) : null}
                        </div>
                        <div
                          className="run-result-segmented"
                          role="group"
                          aria-label={`Set execution result for test ${test.id}`}
                          onClick={(event) => event.stopPropagation()}
                        >
                          {STATUS_ACTIONS.map((status) => {
                            const isActive = test.status === status

                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={isStatusPending || isRunLocked}
                                title={status}
                                aria-label={status}
                                aria-pressed={isActive}
                                className={`run-result-segment run-result-segment--${status.toLowerCase()}${
                                  isActive ? ' run-result-segment--active' : ''
                                }`}
                                onClick={() =>
                                  void handleRunTest(
                                    test.id,
                                    isActive ? null : status,
                                  )
                                }
                              >
                                {status.charAt(0)}
                              </button>
                            )
                          })}
                        </div>
                        <div className="run-comment-indicator-cell">
                          {hasComment ? (
                            <span
                              className="run-comment-indicator"
                              title={test.comment ?? ''}
                            >
                              <MessageSquare
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              <span className="sr-only">Has comment</span>
                            </span>
                          ) : (
                            <span
                              className="run-comment-indicator run-comment-indicator--empty"
                              aria-hidden="true"
                            >
                              —
                            </span>
                          )}
                        </div>
                      </TableRow>
                    )
                  })}
                </TableShell>
              </div>
            </div>
            )}

            {previewTest ? (
              <>
                <div
                  className="run-execution-preview-backdrop"
                  aria-hidden="true"
                  onClick={() => setPreviewTestId(null)}
                />
                <aside
                  className="run-execution-preview-panel"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Case execution preview"
                >
                  <div className="run-execution-preview-panel__header">
                    <div className="run-execution-preview-panel__copy">
                      <div className="run-execution-preview-panel__kicker">
                        Execution preview
                      </div>
                      <h2 className="run-execution-preview-panel__title">
                        #{previewTest.id} {previewTest.title}
                      </h2>
                      <p className="run-execution-preview-panel__subtitle">
                        {formatRunPreviewMeta(previewTest.suiteName, 'No suite')}{' '}
                        / {formatRunPreviewMeta(previewTest.priority)} /{' '}
                        {formatRunPreviewMeta(previewTest.caseType)}
                      </p>
                      {previewTest.executedBy ? (
                        <p className="run-execution-preview-panel__executor">
                          Executed by {previewTest.executedBy}
                          {formatExecutedAt(previewTest.executedAt)
                            ? ` · ${formatExecutedAt(previewTest.executedAt)}`
                            : ''}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPreviewTestId(null)}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="run-execution-preview-panel__quick">
                    <div className="run-execution-preview-panel__section-header">
                      <h3>Quick result</h3>
                      <span className="run-execution-preview-panel__current-status">
                        {previewTest.status ?? 'Not run'}
                      </span>
                    </div>
                    <div className="run-execution-preview-panel__result-actions">
                      {RUN_RESULT_OPTIONS.map((status) => {
                        const nextStatus = getRunResultFromValue(status)
                        const isActive = (previewTest.status ?? 'Not run') === status

                        return (
                          <Button
                            key={status}
                            variant={isActive ? 'primary' : 'secondary'}
                            size="sm"
                            disabled={
                              Boolean(pendingStatusByTestId[previewTest.id]) ||
                              isRunLocked
                            }
                            className={`${getRunResultChipClass(nextStatus)}${
                              isActive
                                ? ' run-execution-preview-panel__status-button--active'
                                : ''
                            }`}
                            onClick={() =>
                              void handleRunTest(previewTest.id, nextStatus)
                            }
                          >
                            {status}
                          </Button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="run-execution-preview-panel__body">
                    <section className="run-execution-preview-panel__content-block">
                      <h3>Steps</h3>
                      <RunExecutionRichContent
                        html={previewTest.steps}
                        emptyLabel="No steps were added for this case."
                      />
                    </section>
                    <section className="run-execution-preview-panel__content-block">
                      <h3>Expected result</h3>
                      <RunExecutionRichContent
                        html={previewTest.expected}
                        emptyLabel="No expected result was added for this case."
                      />
                    </section>
                    <section className="run-execution-preview-panel__content-block">
                      <h3>Execution history</h3>
                      {caseHistoryLoading ? (
                        <p className="run-execution-preview-panel__empty">
                          Loading history…
                        </p>
                      ) : caseHistoryError ? (
                        <p className="run-execution-preview-panel__empty">
                          Could not load history.
                        </p>
                      ) : !caseHistory || caseHistory.length === 0 ? (
                        <p className="run-execution-preview-panel__empty">
                          No execution history yet.
                        </p>
                      ) : (
                        <ul className="run-history">
                          {caseHistory.map((entry, index) => (
                            <li
                              key={`${entry.runId}-${index}`}
                              className="run-history__item"
                            >
                              <span
                                className={`run-history__status ${getRunResultChipClass(
                                  entry.status,
                                )}`}
                              >
                                {entry.status}
                              </span>
                              <div className="run-history__meta">
                                <span className="run-history__run">
                                  {entry.runName}
                                </span>
                                <span className="run-history__sub">
                                  {entry.executedBy ?? 'Unknown'}
                                  {formatExecutedAt(entry.executedAt)
                                    ? ` · ${formatExecutedAt(entry.executedAt)}`
                                    : ''}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                    <section className="run-execution-preview-panel__content-block run-execution-preview-panel__content-block--note">
                      <div className="run-execution-preview-panel__section-header">
                        <h3>Comment</h3>
                        <span
                          className={`run-comment-state${
                            (commentByTestId[previewTest.id] ?? '') !==
                            (previewTest.comment ?? '')
                              ? ' run-comment-state--dirty'
                              : ''
                          }`}
                        >
                          {pendingCommentByTestId[previewTest.id]
                            ? 'Saving'
                            : (commentByTestId[previewTest.id] ?? '') !==
                                (previewTest.comment ?? '')
                              ? 'Unsaved'
                              : 'Saved'}
                        </span>
                      </div>
                      <Textarea
                        className="run-execution-preview-panel__textarea"
                        value={commentByTestId[previewTest.id] ?? ''}
                        placeholder="Add a comment…"
                        disabled={
                          Boolean(pendingCommentByTestId[previewTest.id]) ||
                          isRunLocked
                        }
                        rows={5}
                        onChange={(event) => {
                          const nextValue = event.currentTarget.value
                          setCommentByTestId((current) => ({
                            ...current,
                            [previewTest.id]: nextValue,
                          }))
                        }}
                        onBlur={(event) => {
                          void handleSaveComment(
                            previewTest.id,
                            event.currentTarget.value,
                          )
                        }}
                      />
                    </section>
                  </div>

                  <div className="run-execution-preview-panel__footer">
                    <div className="run-execution-preview-panel__actions">
                      <Link
                        to="/test/$testId"
                        params={{ testId: previewTest.id.toString() }}
                        className="run-execution-preview-panel__link-button no-underline"
                      >
                        Open full case
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={
                          pendingCommentByTestId[previewTest.id] ||
                          isRunLocked ||
                          (commentByTestId[previewTest.id] ?? '') ===
                            (previewTest.comment ?? '')
                        }
                        onClick={() =>
                          void handleSaveComment(
                            previewTest.id,
                            commentByTestId[previewTest.id] ?? '',
                          )
                        }
                      >
                        Save comment
                      </Button>
                    </div>
                  </div>
                </aside>
              </>
            ) : null}
          </>
        )}

        {selectedTestIds.length > 0 ? (
          <div
            className="run-bulk-bar"
            role="region"
            aria-label="Bulk actions for selected cases"
          >
            <span className="run-bulk-bar__count">
              {selectedTestIds.length} selected
            </span>
            <div className="run-bulk-bar__actions">
              {STATUS_ACTIONS.map((status) => (
                <Button
                  key={status}
                  onClick={() => {
                    void handleBulkStatus(status)
                  }}
                  disabled={isBulkUpdating || isRunLocked}
                  variant="secondary"
                  size="sm"
                  className={getRunResultChipClass(status)}
                >
                  {status}
                </Button>
              ))}
              <Button
                onClick={() => {
                  void handleBulkStatus(null)
                }}
                disabled={isBulkUpdating || isRunLocked}
                variant="secondary"
                size="sm"
              >
                Reset to Not run
              </Button>
            </div>
            <button
              type="button"
              className="run-bulk-bar__deselect"
              onClick={() => setSelectedTestIds([])}
            >
              Deselect
            </button>
          </div>
        ) : null}
      </div>
    </main>
  )
}
