import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { createSuite } from '../features/projects/server'
import { createRun, getRunsForProject } from '../features/runs/server'
import { getDashboardState, updateTestStatus } from '../features/tests/server'

export const Route = createFileRoute('/project/$projectId')({
  loader: async ({ params }) => {
    const projectId = Number(params.projectId)

    if (!Number.isInteger(projectId) || projectId <= 0) {
      throw notFound()
    }

    const [dashboard, runsState] = await Promise.all([
      getDashboardState({
        data: {
          projectId,
        },
      }),
      getRunsForProject({
        data: {
          projectId,
        },
      }),
    ])

    const project =
      dashboard.projects.find((item) => item.id === projectId) ?? null

    if (!project) {
      throw notFound()
    }

    return {
      project,
      dashboard,
      runs: runsState.runs,
    }
  },
  component: ProjectPage,
})

function ProjectPage() {
  const loaderData = Route.useLoaderData()
  const { project, dashboard, runs } = loaderData
  const router = useRouter()
  const [suiteName, setSuiteName] = useState('')
  const [suiteErrorMessage, setSuiteErrorMessage] = useState<string | null>(null)
  const [isSubmittingSuite, setIsSubmittingSuite] = useState(false)
  const [runName, setRunName] = useState('')
  const [runErrorMessage, setRunErrorMessage] = useState<string | null>(null)
  const [isSubmittingRun, setIsSubmittingRun] = useState(false)
  const [pendingStatusByTestId, setPendingStatusByTestId] = useState<
    Record<number, boolean>
  >({})

  const totalCases = dashboard.tests.length
  const totalSuites = dashboard.sections.length
  const passedCases = dashboard.tests.filter(
    (test) => test.status === 'Passed',
  ).length

  async function handleCreateSuite(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setSuiteErrorMessage(null)
    setIsSubmittingSuite(true)

    try {
      await createSuite({
        data: {
          projectId: project.id,
          name: suiteName,
        },
      })

      setSuiteName('')
      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create suite.'
      setSuiteErrorMessage(message)
    } finally {
      setIsSubmittingSuite(false)
    }
  }

  async function handleCreateRun(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setRunErrorMessage(null)
    setIsSubmittingRun(true)

    try {
      await createRun({
        data: {
          projectId: project.id,
          name: runName,
        },
      })

      setRunName('')
      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create run.'
      setRunErrorMessage(message)
    } finally {
      setIsSubmittingRun(false)
    }
  }

  async function handleStatusUpdate(
    testId: number,
    status: 'Passed' | 'Failed',
  ): Promise<void> {
    setPendingStatusByTestId((current) => ({
      ...current,
      [testId]: true,
    }))

    try {
      await updateTestStatus({
        data: {
          id: testId,
          status,
        },
      })

      await router.invalidate()
    } finally {
      setPendingStatusByTestId((current) => {
        const nextState = { ...current }
        delete nextState[testId]
        return nextState
      })
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="island-kicker mb-2">Workspace / Project</p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
            Work with suites, cases, and execution runs for this project.
          </p>
        </div>
        <div className="compact-metrics">
          <div className="metric-pill">
            <span className="metric-label">Suites</span>
            <strong>{totalSuites}</strong>
          </div>
          <div className="metric-pill">
            <span className="metric-label">Cases</span>
            <strong>{totalCases}</strong>
          </div>
          <div className="metric-pill">
            <span className="metric-label">Passed</span>
            <strong>{passedCases}</strong>
          </div>
          <div className="metric-pill">
            <span className="metric-label">Runs</span>
            <strong>{runs.length}</strong>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
        <article className="island-shell rounded-[1.5rem] p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="island-kicker mb-2">Project workspace</p>
              <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
                Suites and cases
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/create-test"
                className="rounded-full border border-[rgba(50,143,151,0.28)] bg-[rgba(79,184,178,0.14)] px-3 py-1 text-sm font-semibold no-underline text-[var(--lagoon-deep)]"
              >
                Create test case
              </Link>
              <Link
                to="/"
                className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-sm no-underline text-[var(--sea-ink-soft)]"
              >
                Back to workspace
              </Link>
            </div>
          </div>

          {dashboard.sections.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 p-6 text-sm text-[var(--sea-ink-soft)]">
              This project does not have test suites yet.
            </div>
          ) : (
            <div className="grid gap-6">
              {dashboard.sections.map((section) => {
                const sectionTests = dashboard.tests.filter(
                  (test) => test.sectionId === section.id,
                )

                return (
                  <section key={section.id} className="grid gap-3">
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
                        Test suite
                      </p>
                      <h3 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
                        {section.name}
                      </h3>
                      <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                        {sectionTests.length} case
                        {sectionTests.length === 1 ? '' : 's'}
                      </div>
                    </div>

                    {sectionTests.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-4 text-sm text-[var(--sea-ink-soft)]">
                        No test cases in this suite yet.
                      </div>
                    ) : (
                      sectionTests.map((test) => {
                        const isPending = Boolean(pendingStatusByTestId[test.id])
                        const statusClassName =
                          test.status === 'Passed'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-rose-100 text-rose-900'

                        return (
                          <article
                            key={test.id}
                            className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[0_12px_28px_rgba(23,58,64,0.06)]"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
                                  Test case
                                </div>
                                <h4 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">
                                  <Link
                                    to="/test/$testId"
                                    params={{ testId: test.id.toString() }}
                                    className="no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
                                  >
                                    {test.title}
                                  </Link>
                                </h4>
                                <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                                  Case ID: {test.id}
                                </div>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${statusClassName}`}
                              >
                                {test.status ?? 'Failed'}
                              </span>
                            </div>

                            <div className="mt-4 grid gap-4 text-sm leading-6 text-[var(--sea-ink-soft)]">
                              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.6)] p-4">
                                <strong className="block text-[var(--sea-ink)]">
                                  Steps
                                </strong>
                                <div
                                  className="mt-2 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{
                                    __html: test.steps ?? '',
                                  }}
                                />
                              </div>

                              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.6)] p-4">
                                <strong className="block text-[var(--sea-ink)]">
                                  Expected result
                                </strong>
                                <div
                                  className="mt-2 prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{
                                    __html: test.expected ?? '',
                                  }}
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-3">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleStatusUpdate(test.id, 'Passed')
                                }
                                className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isPending ? 'Saving...' : 'Passed'}
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  handleStatusUpdate(test.id, 'Failed')
                                }
                                className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-900 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isPending ? 'Saving...' : 'Failed'}
                              </button>
                            </div>
                          </article>
                        )
                      })
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </article>

        <aside className="grid gap-5">
          <section className="island-shell rounded-[1.5rem] p-6">
            <p className="island-kicker mb-2">Suites</p>
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
              Create suite
            </h2>
            <p className="mb-5 mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
              Add a test suite before creating test cases inside it.
            </p>

            <form className="grid gap-3" onSubmit={handleCreateSuite}>
              <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
                Suite name
                <input
                  value={suiteName}
                  onChange={(event) => setSuiteName(event.target.value)}
                  className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
                  placeholder="Checkout smoke"
                />
              </label>

              {suiteErrorMessage ? (
                <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {suiteErrorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingSuite || !dashboard.databaseConfigured}
                className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmittingSuite ? 'Creating...' : 'Create suite'}
              </button>
            </form>
          </section>

          <section className="island-shell rounded-[1.5rem] p-6">
            <p className="island-kicker mb-2">Runs</p>
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
              Test runs
            </h2>
            <p className="mb-5 mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
              Create runs and record pass/fail results per case.
            </p>

            <form className="grid gap-3" onSubmit={handleCreateRun}>
              <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
                Run name
                <input
                  value={runName}
                  onChange={(event) => setRunName(event.target.value)}
                  className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
                  placeholder="Regression 2026-04-22"
                />
              </label>

              {runErrorMessage ? (
                <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {runErrorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingRun || !dashboard.databaseConfigured}
                className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmittingRun ? 'Creating...' : 'Create run'}
              </button>
            </form>

            <div className="mt-5 grid gap-3">
              {runs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-4 text-sm text-[var(--sea-ink-soft)]">
                  No runs exist yet for this project. Create the first run to
                  start tracking execution results.
                </div>
              ) : (
                runs.map((run) => (
                  <Link
                    key={run.id}
                    to="/run/$runId"
                    params={{ runId: run.id.toString() }}
                    className="rounded-2xl border border-[var(--line)] bg-white/65 px-4 py-4 no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
                  >
                    <div className="text-base font-semibold">{run.name}</div>
                    <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                      Run ID: {run.id}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="island-shell rounded-[1.5rem] p-6">
            <p className="island-kicker mb-2">Structure</p>
            <div className="grid gap-3 text-sm text-[var(--sea-ink-soft)]">
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Test suites
                </strong>
                Suites help split a project into meaningful testing areas.
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Test cases
                </strong>
                Each case keeps steps, expected result, and current status.
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}
