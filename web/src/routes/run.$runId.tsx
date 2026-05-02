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

function getStatusClass(status: RunItemStatus): string {
  if (status === 'Passed') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'Failed') {
    return 'bg-rose-50 text-rose-700'
  }

  if (status === 'Blocked') {
    return 'bg-amber-50 text-amber-800'
  }

  return 'bg-slate-100 text-slate-700'
}

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
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f9fe]">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#60718f]">
              <Link to="/" className="no-underline text-[#2f6fe4]">
                Workspace
              </Link>
              <span>/</span>
              {data.run.projectSlug ? (
                <Link
                  to="/project/$projectSlug/runs"
                  params={{ projectSlug: data.run.projectSlug }}
                  className="no-underline text-[#2f6fe4]"
                >
                  {data.run.projectName ?? 'Project'}
                </Link>
              ) : (
                <span>{data.run.projectName ?? 'Project'}</span>
              )}
              <span>/</span>
              <span>Run #{data.run.id}</span>
            </div>
            <h1 className="m-0 text-4xl font-bold tracking-tight text-[#1b2f5b]">
              {data.run.name}
            </h1>
          </div>

          {data.run.projectSlug ? (
            <Link
              to="/project/$projectSlug/runs"
              params={{ projectSlug: data.run.projectSlug }}
              className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#60718f] hover:text-[#2f6fe4]"
            >
              Back to runs
            </Link>
          ) : null}
        </section>

        <section className="sticky top-3 z-20 mb-5 rounded-3xl border border-[#dfe6f4] bg-white/95 p-4 shadow-[0_10px_25px_rgba(31,57,102,0.08)] backdrop-blur">
          <div className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)]">
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                    Progress
                  </div>
                  <div className="mt-1 text-3xl font-bold text-[#1b2f5b]">
                    {progress}%
                  </div>
                </div>
                <div className="text-sm font-semibold text-[#60718f]">
                  {executedCount}/{data.tests.length}
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#edf2fa]">
                <div
                  className="h-full rounded-full bg-[#2f6fe4]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { label: 'Passed', value: passedCount, className: 'text-emerald-700' },
                { label: 'Failed', value: failedCount, className: 'text-rose-700' },
                { label: 'Blocked', value: blockedCount, className: 'text-amber-700' },
                { label: 'Not run', value: notRunCount, className: 'text-slate-700' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#e9eef8] bg-[#fbfcff] px-4 py-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                    {item.label}
                  </div>
                  <div className={`mt-1 text-2xl font-bold ${item.className}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e9eef8] pt-4">
            <div className="flex flex-wrap gap-2">
              {RUN_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setRunFilter(filter)}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    runFilter === filter
                      ? filter === 'Passed'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : filter === 'Failed'
                          ? 'border-rose-300 bg-rose-50 text-rose-900'
                          : filter === 'Blocked'
                            ? 'border-amber-300 bg-amber-50 text-amber-900'
                            : 'border-slate-300 bg-slate-100 text-slate-900'
                      : 'border-[#dbe4f4] bg-white text-[#60718f]'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#60718f]">
                {selectedTestIds.length} selected
              </span>
              {STATUS_ACTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => {
                    void handleBulkStatus(status)
                  }}
                  disabled={selectedTestIds.length === 0 || isBulkUpdating}
                  className={`rounded-xl border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${
                    status === 'Passed'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : status === 'Failed'
                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
                >
                  {status}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  void handleBulkStatus(null)
                }}
                disabled={selectedTestIds.length === 0 || isBulkUpdating}
                className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
              >
                Clear
              </button>
              {nextNotRunTestId ? (
                <button
                  type="button"
                  onClick={() =>
                    testRowRefs.current[nextNotRunTestId]?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                    })
                  }
                  className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#2f6fe4]"
                >
                  Next not run
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <div className="mb-5 rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {errorMessage}
          </div>
        ) : null}

        {data.tests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-white p-5 text-sm text-[#60718f]">
            This test run currently has no linked test cases.
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-white p-5 text-sm text-[#60718f]">
            {runFilter === 'All'
              ? 'No test cases found in this run.'
              : `No test cases match the "${runFilter}" filter.`}
          </div>
        ) : (
          <section className="overflow-x-auto rounded-3xl border border-[#dfe6f4] bg-white shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
            <div className="grid min-w-[1180px] grid-cols-[44px_80px_minmax(260px,1fr)_120px_250px_260px_92px] items-center bg-[#fbfcff] px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
              <div>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleVisibleSelection}
                  className="h-4 w-4 rounded border-[#c7d5ee] text-[#2f6fe4] focus:ring-[#2f6fe4]"
                  aria-label="Select visible tests"
                />
              </div>
              <div>ID</div>
              <div>Title</div>
              <div>Status</div>
              <div>Quick result</div>
              <div>Comment</div>
              <div className="text-right">Open</div>
            </div>

            {filteredTests.map((test) => {
              const isStatusPending = Boolean(pendingStatusByTestId[test.id])
              const isCommentPending = Boolean(pendingCommentByTestId[test.id])

              return (
                <div
                  key={test.id}
                  ref={(node) => {
                    testRowRefs.current[test.id] = node
                  }}
                  className="grid min-w-[1180px] grid-cols-[44px_80px_minmax(260px,1fr)_120px_250px_260px_92px] items-center border-t border-[#e9eef8] px-5 py-3 hover:bg-[#f8fbff]"
                >
                  <div>
                    <input
                      type="checkbox"
                      checked={selectedTestIdSet.has(test.id)}
                      onChange={() => toggleTestSelection(test.id)}
                      className="h-4 w-4 rounded border-[#c7d5ee] text-[#2f6fe4] focus:ring-[#2f6fe4]"
                      aria-label={`Select test ${test.id}`}
                    />
                  </div>
                  <Link
                    to="/test/$testId"
                    params={{ testId: test.id.toString() }}
                    className="text-sm font-semibold no-underline text-[#2f6fe4]"
                  >
                    #{test.id}
                  </Link>
                  <div className="min-w-0 pr-4">
                    <div className="truncate text-sm font-semibold text-[#1b2f5b]">
                      {test.title}
                    </div>
                  </div>
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                        test.status,
                      )}`}
                    >
                      {test.status ?? 'Not run'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_ACTIONS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={isStatusPending}
                        onClick={() => {
                          void handleRunTest(test.id, status)
                        }}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-55 ${
                          status === 'Passed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : status === 'Failed'
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={isStatusPending}
                      onClick={() => {
                        void handleRunTest(test.id, null)
                      }}
                      className="rounded-lg border border-[#dbe4f4] bg-white px-2.5 py-1 text-xs font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Clear
                    </button>
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
                      className="min-h-10 w-full resize-y rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#1b2f5b] outline-none focus:border-[#2f6fe4]"
                    />
                    <button
                      type="button"
                      disabled={isCommentPending}
                      onClick={() => {
                        void handleSaveComment(test.id)
                      }}
                      className="rounded-lg border border-[#dbe4f4] bg-white px-2.5 py-2 text-xs font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {isCommentPending ? '...' : 'Save'}
                    </button>
                  </div>
                  <div className="text-right">
                    <Link
                      to="/test/$testId"
                      params={{ testId: test.id.toString() }}
                      className="text-sm font-semibold no-underline text-[#2f6fe4]"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}
