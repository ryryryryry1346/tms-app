import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { executeRunTest, getRunDetail } from '../features/runs/server'

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

function RunDetailPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [pendingStatusByTestId, setPendingStatusByTestId] = useState<
    Record<number, boolean>
  >({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const passedCount = data.tests.filter((test) => test.status === 'Passed').length
  const failedCount = data.tests.filter((test) => test.status === 'Failed').length
  const notRunCount = data.tests.filter((test) => test.status === null).length

  async function handleRunTest(
    testId: number,
    status: 'Passed' | 'Failed',
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
        },
      })

      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save run result.'
      setErrorMessage(message)
    } finally {
      setPendingStatusByTestId((current) => {
        const nextState = { ...current }
        delete nextState[testId]
        return nextState
      })
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-[2rem] p-6 sm:p-8">
        <p className="island-kicker mb-2">Workspace / Project / Test Runs</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          {data.run.name}
        </h1>
        <div className="mb-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[var(--sea-ink-soft)]">
            Run ID: {data.run.id}
          </span>
          {data.run.projectName ? (
            <span className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-[var(--sea-ink-soft)]">
              Project: {data.run.projectName}
            </span>
          ) : null}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
            <div className="text-sm text-[var(--sea-ink-soft)]">Passed</div>
            <div className="mt-1 text-2xl font-bold text-emerald-700">{passedCount}</div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
            <div className="text-sm text-[var(--sea-ink-soft)]">Failed</div>
            <div className="mt-1 text-2xl font-bold text-rose-700">{failedCount}</div>
          </div>
          <div className="rounded-2xl border border-[var(--line)] bg-white/60 p-4">
            <div className="text-sm text-[var(--sea-ink-soft)]">Not run</div>
            <div className="mt-1 text-2xl font-bold text-slate-700">{notRunCount}</div>
          </div>
        </div>

        {data.tests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-5 text-sm text-[var(--sea-ink-soft)]">
            This test run currently has no linked test cases.
          </div>
        ) : (
          <div className="grid gap-3">
            {data.tests.map((test) => (
              <div
                key={test.id}
                className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold text-[var(--sea-ink)]">
                      {test.title}
                    </div>
                    <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                      Test ID: {test.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        test.status === 'Passed'
                          ? 'bg-emerald-100 text-emerald-900'
                          : test.status === 'Failed'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {test.status ?? 'Not run'}
                    </span>
                    <Link
                      to="/test/$testId"
                      params={{ testId: test.id.toString() }}
                      className="text-sm font-semibold no-underline text-[var(--lagoon-deep)]"
                    >
                      Open test
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={Boolean(pendingStatusByTestId[test.id])}
                    onClick={() => handleRunTest(test.id, 'Passed')}
                    className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingStatusByTestId[test.id] ? 'Saving...' : 'Passed'}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(pendingStatusByTestId[test.id])}
                    onClick={() => handleRunTest(test.id, 'Failed')}
                    className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {pendingStatusByTestId[test.id] ? 'Saving...' : 'Failed'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {errorMessage ? (
          <div className="mt-6 rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {errorMessage}
          </div>
        ) : null}

        <div className="mt-6">
          {data.run.projectId ? (
            <Link
              to="/project/$projectId"
              params={{ projectId: data.run.projectId.toString() }}
              className="inline-flex rounded-xl border border-[var(--line)] bg-white/75 px-4 py-2 text-sm font-semibold no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
            >
              Back to project
            </Link>
          ) : (
            <Link
              to="/"
              className="inline-flex rounded-xl border border-[var(--line)] bg-white/75 px-4 py-2 text-sm font-semibold no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
            >
              Back to workspace
            </Link>
          )}
        </div>
      </section>
    </main>
  )
}
