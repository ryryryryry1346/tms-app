import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  executeRunTest,
  getRunDetail,
  saveRunItemComment,
} from '../features/runs/server'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Panel } from '../components/ui/Panel'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'

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

const RUN_FILTERS: RunFilter[] = ['All', 'Not run', 'Failed', 'Blocked', 'Passed']
const STATUS_ACTIONS: Array<Exclude<RunItemStatus, null>> = [
  'Passed',
  'Failed',
  'Blocked',
]

function RunDetailPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
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

  const passedCount = data.tests.filter((test) => test.status === 'Passed').length
  const failedCount = data.tests.filter((test) => test.status === 'Failed').length
  const blockedCount = data.tests.filter((test) => test.status === 'Blocked').length
  const notRunCount = data.tests.filter((test) => test.status === null).length
  const executedCount = passedCount + failedCount + blockedCount
  const progress =
    data.tests.length === 0
      ? 0
      : Math.round((executedCount / data.tests.length) * 100)

  const filteredTests = useMemo(() => {
    if (runFilter === 'All') {
      return data.tests
    }

    if (runFilter === 'Not run') {
      return data.tests.filter((test) => test.status === null)
    }

    return data.tests.filter((test) => test.status === runFilter)
  }, [data.tests, runFilter])

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
    const nextTest = data.tests.find((test) => test.status === null)
    return nextTest?.id ?? null
  }, [data.tests])

  useEffect(() => {
    setCommentByTestId(
      Object.fromEntries(
        data.tests.map((test) => [test.id, test.comment ?? '']),
      ) as Record<number, string>,
    )
    setSelectedTestIds((current) =>
      current.filter((id) => data.tests.some((test) => test.id === id)),
    )
  }, [data.tests])

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
    setErrorMessage(null)
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

      await router.invalidate()

      if (status !== null) {
        const nextTest = data.tests.find(
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
    if (selectedTestIds.length === 0) {
      return
    }

    setErrorMessage(null)
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
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update selected run items.',
      )
    } finally {
      setIsBulkUpdating(false)
    }
  }

  async function handleSaveComment(testId: number): Promise<void> {
    setErrorMessage(null)
    setPendingCommentByTestId((current) => ({
      ...current,
      [testId]: true,
    }))

    try {
      await saveRunItemComment({
        data: {
          runId: data.run.id,
          testId,
          comment: commentByTestId[testId] ?? '',
        },
      })

      await router.invalidate()
    } catch (error) {
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

  return (
    <main className="tms-page">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--tms-text-muted)]">
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
            <h1 className="m-0 text-4xl font-bold tracking-tight text-[var(--tms-text)]">
              {data.run.name}
            </h1>
          </div>

          {data.run.projectSlug ? (
            <Link
              to="/project/$projectSlug/runs"
              params={{ projectSlug: data.run.projectSlug }}
              className="tms-button no-underline hover:text-[var(--tms-primary)]"
            >
              Back to runs
            </Link>
          ) : null}
        </section>

        <Panel className="sticky top-3 z-20 mb-5 bg-[var(--tms-surface)]/95 p-4 backdrop-blur">
          <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="tms-kicker">
                    Progress
                  </div>
                  <div className="mt-1 text-3xl font-bold text-[var(--tms-text)]">
                    {progress}%
                  </div>
                </div>
                <div className="text-sm font-semibold text-[var(--tms-text-muted)]">
                  {executedCount}/{data.tests.length}
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--tms-surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--tms-primary)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Passed', value: passedCount, className: 'text-[var(--tms-success)]' },
                { label: 'Failed', value: failedCount, className: 'text-[var(--tms-danger)]' },
                { label: 'Blocked', value: blockedCount, className: 'text-[var(--tms-warning)]' },
                { label: 'Not run', value: notRunCount, className: 'text-[var(--tms-draft)]' },
              ].map((item) => (
                <Panel
                  key={item.label}
                  className="rounded-[var(--tms-radius-overlay)] border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-3 shadow-none"
                >
                  <div className="tms-kicker">
                    {item.label}
                  </div>
                  <div className={`mt-1 text-2xl font-bold ${item.className}`}>
                    {item.value}
                  </div>
                </Panel>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tms-border-subtle)] pt-4">
            <div className="flex flex-wrap gap-2">
              {RUN_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  onClick={() => setRunFilter(filter)}
                  variant={runFilter === filter ? 'primary' : 'default'}
                  className={
                    runFilter === filter
                      ? filter === 'Passed'
                        ? 'tms-chip-success'
                        : filter === 'Failed'
                          ? 'tms-chip-danger'
                          : filter === 'Blocked'
                            ? 'tms-chip-warning'
                            : 'tms-chip-draft'
                      : ''
                  }
                >
                  {filter}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[var(--tms-text-muted)]">
                {selectedTestIds.length} selected
              </span>
              {STATUS_ACTIONS.map((status) => (
                <Button
                  key={status}
                  onClick={() => {
                    void handleBulkStatus(status)
                  }}
                  disabled={selectedTestIds.length === 0 || isBulkUpdating}
                  variant={
                    status === 'Passed'
                      ? 'success'
                      : status === 'Failed'
                        ? 'danger'
                        : 'warning'
                  }
                  className={`${
                    status === 'Passed'
                      ? 'border-[var(--tms-success)] bg-[var(--tms-success-soft)] text-[var(--tms-success)]'
                      : status === 'Failed'
                        ? 'border-[var(--tms-danger)] bg-[var(--tms-danger-soft)] text-[var(--tms-danger)]'
                        : 'border-[var(--tms-warning)] bg-[var(--tms-warning-soft)] text-[var(--tms-warning)]'
                  }`}
                >
                  {status}
                </Button>
              ))}
              <Button
                onClick={() => {
                  void handleBulkStatus(null)
                }}
                disabled={selectedTestIds.length === 0 || isBulkUpdating}
              >
                Clear
              </Button>
              {nextNotRunTestId ? (
                <Button
                  onClick={() =>
                    testRowRefs.current[nextNotRunTestId]?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    })
                  }
                  variant="primary"
                >
                  Next not run
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>

        {errorMessage ? (
          <div className="mb-5 rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3 text-sm text-[var(--tms-danger)]">
            {errorMessage}
          </div>
        ) : null}

        {data.tests.length === 0 ? (
          <div className="rounded-[var(--tms-radius-overlay)] border border-dashed border-[var(--tms-border)] bg-[var(--tms-surface)] p-5 text-sm text-[var(--tms-text-muted)]">
            This test run currently has no linked test cases.
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="rounded-[var(--tms-radius-overlay)] border border-dashed border-[var(--tms-border)] bg-[var(--tms-surface)] p-5 text-sm text-[var(--tms-text-muted)]">
            {runFilter === 'All'
              ? 'No test cases found in this run.'
              : `No test cases match the "${runFilter}" filter.`}
          </div>
        ) : (
          <TableShell className="shadow-[var(--tms-shadow-panel)]">
            <TableHead
              columns="44px 80px minmax(260px,1fr) 120px 250px 260px 92px"
              minWidth="1180px"
            >
              <div>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleSelection}
                  className="h-4 w-4 rounded border-[var(--tms-border)] text-[var(--tms-primary)] focus:ring-[var(--tms-primary)]"
                  aria-label="Select visible tests"
                />
              </div>
              <div>ID</div>
              <div>Title</div>
              <div>Status</div>
              <div>Quick result</div>
              <div>Comment</div>
              <div className="text-right">Open</div>
            </TableHead>

            {filteredTests.map((test) => {
              const isStatusPending = Boolean(pendingStatusByTestId[test.id])
              const isCommentPending = Boolean(pendingCommentByTestId[test.id])

              return (
                <TableRow
                  key={test.id}
                  ref={(node) => {
                    testRowRefs.current[test.id] = node
                  }}
                  columns="44px 80px minmax(260px,1fr) 120px 250px 260px 92px"
                  minWidth="1180px"
                >
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedTestIdSet.has(test.id)}
                      onChange={() => toggleTestSelection(test.id)}
                      className="h-4 w-4 rounded border-[var(--tms-border)] text-[var(--tms-primary)] focus:ring-[var(--tms-primary)]"
                      aria-label={`Select test ${test.id}`}
                    />
                  </div>
                  <Link
                    to="/test/$testId"
                    params={{ testId: test.id.toString() }}
                    className="text-sm font-semibold no-underline text-[var(--tms-primary)]"
                  >
                    #{test.id}
                  </Link>
                  <div className="min-w-0 pr-4">
                    <div className="truncate text-sm font-semibold text-[var(--tms-text)]">
                      {test.title}
                    </div>
                  </div>
                  <div>
                    <Badge
                      variant={
                        test.status === 'Passed'
                          ? 'success'
                          : test.status === 'Failed'
                            ? 'danger'
                            : test.status === 'Blocked'
                              ? 'warning'
                              : 'draft'
                      }
                    >
                      {test.status ?? 'Not run'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_ACTIONS.map((status) => (
                      <Button
                        key={status}
                        disabled={isStatusPending}
                        onClick={() => {
                          void handleRunTest(test.id, status)
                        }}
                        size="sm"
                        variant={
                          status === 'Passed'
                            ? 'success'
                            : status === 'Failed'
                              ? 'danger'
                              : 'warning'
                        }
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${
                          status === 'Passed'
                            ? 'border-[var(--tms-success)] bg-[var(--tms-success-soft)] text-[var(--tms-success)]'
                            : status === 'Failed'
                              ? 'border-[var(--tms-danger)] bg-[var(--tms-danger-soft)] text-[var(--tms-danger)]'
                              : 'border-[var(--tms-warning)] bg-[var(--tms-warning-soft)] text-[var(--tms-warning)]'
                        }`}
                      >
                        {status}
                      </Button>
                    ))}
                    <Button
                      disabled={isStatusPending}
                      onClick={() => {
                        void handleRunTest(test.id, null)
                      }}
                      size="sm"
                      className="rounded-lg border border-[var(--tms-border)] bg-[var(--tms-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--tms-text-muted)]"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <textarea
                      value={commentByTestId[test.id] ?? ''}
                      onChange={(event) =>
                        setCommentByTestId((current) => ({
                          ...current,
                          [test.id]: event.target.value,
                        }))
                      }
                      rows={2}
                      placeholder="Execution note"
                      className="tms-input min-h-10 w-full resize-y rounded-xl px-3 py-2 text-sm"
                    />
                    <Button
                      disabled={isCommentPending}
                      onClick={() => {
                        void handleSaveComment(test.id)
                      }}
                      size="sm"
                      className="rounded-lg border border-[var(--tms-border)] bg-[var(--tms-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--tms-text-muted)]"
                    >
                      {isCommentPending ? '...' : 'Save'}
                    </Button>
                  </div>
                  <div className="text-right">
                    <Link
                      to="/test/$testId"
                      params={{ testId: test.id.toString() }}
                      className="text-sm font-semibold no-underline text-[var(--tms-primary)]"
                    >
                      Open
                    </Link>
                  </div>
                </TableRow>
              )
            })}
          </TableShell>
        )}
      </div>
    </main>
  )
}
