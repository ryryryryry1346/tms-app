import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { createSuite } from '../features/projects/server'
import { createRun, getRunsForProject } from '../features/runs/server'
import { getDashboardState } from '../features/tests/server'

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

  const totalCases = dashboard.tests.length
  const totalSuites = dashboard.sections.length
  const readyCases = dashboard.tests.filter(
    (test) => test.status === 'Ready',
  ).length
  const [activeComposer, setActiveComposer] = useState<'suite' | 'run' | null>(
    null,
  )

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
      setActiveComposer(null)
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
      setActiveComposer(null)
      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create run.'
      setRunErrorMessage(message)
    } finally {
      setIsSubmittingRun(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[var(--bg-base)]">
      <div className="mx-auto grid min-h-[calc(100vh-65px)] max-w-[1480px] lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-[var(--line)] bg-white/72 px-4 py-6 backdrop-blur-xl lg:min-h-full lg:border-b-0 lg:border-r">
          <div className="rounded-2xl border border-[var(--line)] bg-white/78 px-4 py-4 shadow-[0_18px_36px_rgba(23,58,64,0.06)]">
            <div className="text-lg font-semibold text-[var(--sea-ink)]">
              Project
            </div>
            <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
              {project.name}
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
              Workspace
            </div>
            <nav className="grid gap-2">
              <Link
                to="/"
                className="rounded-2xl bg-[rgba(42,164,255,0.12)] px-4 py-3 text-sm font-semibold no-underline text-[var(--brand-strong)]"
              >
                Projects
              </Link>
              <a
                href="#project-suites"
                className="rounded-2xl px-4 py-3 text-sm font-medium no-underline text-[var(--sea-ink-soft)] hover:bg-white/80 hover:text-[var(--brand-strong)]"
              >
                Test cases
              </a>
              <a
                href="#project-suites"
                className="rounded-2xl px-4 py-3 text-sm font-medium no-underline text-[var(--sea-ink-soft)] hover:bg-white/80 hover:text-[var(--brand-strong)]"
              >
                Suites
              </a>
              <a
                href="#project-runs"
                className="rounded-2xl px-4 py-3 text-sm font-medium no-underline text-[var(--sea-ink-soft)] hover:bg-white/80 hover:text-[var(--brand-strong)]"
              >
                Runs
              </a>
            </nav>
          </div>

        </aside>

        <div className="px-4 py-8 lg:px-10">
          <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="mb-3 flex items-center gap-3 text-sm text-[var(--sea-ink-soft)]">
                <Link to="/" className="no-underline text-[var(--sea-ink-soft)]">
                  Workspace
                </Link>
                <span>/</span>
                <span>Project</span>
              </div>
              <h1 className="m-0 text-4xl font-bold tracking-tight text-[var(--sea-ink)]">
                {project.name}
              </h1>
              <p className="mt-3 text-base leading-7 text-[var(--sea-ink-soft)]">
                Work with suites, cases, and execution runs for this project.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveComposer((current) =>
                    current === 'suite' ? null : 'suite',
                  )
                }
                className="rounded-xl border border-[#9dbaf7] bg-white px-5 py-3 text-sm font-semibold text-[#3369d6]"
              >
                + Suite
              </button>
              <Link
                to="/create-test"
                className="rounded-xl border border-[#9dbaf7] bg-white px-5 py-3 text-sm font-semibold no-underline text-[#3369d6]"
              >
                + Test case
              </Link>
              <button
                type="button"
                onClick={() =>
                  setActiveComposer((current) =>
                    current === 'run' ? null : 'run',
                  )
                }
                className="rounded-xl border border-[#2f6fe4] bg-[#2f6fe4] px-5 py-3 text-sm font-semibold text-white"
              >
                + Run
              </button>
            </div>
          </section>

          <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Suites', value: totalSuites, tone: 'text-[#3369d6]' },
              { label: 'Cases', value: totalCases, tone: 'text-[#5570c7]' },
              { label: 'Ready', value: readyCases, tone: 'text-[#2ea66b]' },
              { label: 'Runs', value: runs.length, tone: 'text-[#d04b4b]' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-[var(--line)] bg-white px-6 py-5 shadow-[0_12px_30px_rgba(23,58,64,0.05)]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(47,111,228,0.08)] text-xl font-bold ${item.tone}`}
                  >
                    •
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--sea-ink-soft)]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-4xl font-semibold text-[var(--sea-ink)]">
                      {item.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {activeComposer ? (
            <section className="mb-6 rounded-3xl border border-[var(--line)] bg-white px-6 py-5 shadow-[0_16px_34px_rgba(23,58,64,0.05)]">
              {activeComposer === 'suite' ? (
                <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]" onSubmit={handleCreateSuite}>
                  <div className="md:col-span-2">
                    <div className="text-lg font-semibold text-[var(--sea-ink)]">
                      Create suite
                    </div>
                  </div>
                  <input
                    value={suiteName}
                    onChange={(event) => setSuiteName(event.target.value)}
                    className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
                    placeholder="Checkout smoke"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingSuite || !dashboard.databaseConfigured}
                    className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmittingSuite ? 'Creating...' : 'Create suite'}
                  </button>
                  {suiteErrorMessage ? (
                    <div className="md:col-span-2 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      {suiteErrorMessage}
                    </div>
                  ) : null}
                </form>
              ) : (
                <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]" onSubmit={handleCreateRun}>
                  <div className="md:col-span-2">
                    <div className="text-lg font-semibold text-[var(--sea-ink)]">
                      Create run
                    </div>
                  </div>
                  <input
                    value={runName}
                    onChange={(event) => setRunName(event.target.value)}
                    className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
                    placeholder="Regression 2026-04-22"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingRun || !dashboard.databaseConfigured}
                    className="rounded-xl border border-[#2f6fe4] bg-[#2f6fe4] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmittingRun ? 'Creating...' : 'Create run'}
                  </button>
                  {runErrorMessage ? (
                    <div className="md:col-span-2 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      {runErrorMessage}
                    </div>
                  ) : null}
                </form>
              )}
            </section>
          ) : null}

          <section
            id="project-suites"
            className="rounded-3xl border border-[var(--line)] bg-white px-6 py-6 shadow-[0_16px_34px_rgba(23,58,64,0.05)]"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="m-0 text-2xl font-semibold text-[var(--sea-ink)]">
                Test suites and cases
              </h2>
              <div className="rounded-2xl border border-[var(--line)] bg-[rgba(245,247,255,0.9)] px-4 py-3 text-sm text-[var(--sea-ink-soft)]">
                {totalCases} case{totalCases === 1 ? '' : 's'}
              </div>
            </div>

            {dashboard.sections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(245,247,255,0.55)] p-6 text-sm text-[var(--sea-ink-soft)]">
                This project does not have test suites yet.
              </div>
            ) : (
              <div className="grid gap-6">
                {dashboard.sections.map((section) => {
                  const sectionTests = dashboard.tests.filter(
                    (test) => test.sectionId === section.id,
                  )

                  return (
                    <section
                      key={section.id}
                      className="overflow-hidden rounded-3xl border border-[var(--line)]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] bg-[rgba(250,251,255,0.92)] px-5 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-lg text-[var(--sea-ink-soft)]">⌄</span>
                          <div className="h-6 w-6 rounded-lg border border-[var(--line)] bg-white" />
                          <div>
                            <div className="text-xl font-semibold text-[var(--sea-ink)]">
                              {section.name}
                            </div>
                            <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                              {sectionTests.length} case
                              {sectionTests.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-xl px-3 py-2 text-xl leading-none text-[var(--sea-ink-soft)]"
                        >
                          …
                        </button>
                      </div>

                      {sectionTests.length === 0 ? (
                        <div className="bg-white px-5 py-5 text-sm text-[var(--sea-ink-soft)]">
                          No test cases in this suite yet.
                        </div>
                      ) : (
                        sectionTests.map((test) => {
                          const isReady = test.status === 'Ready'

                          return (
                            <article
                              key={test.id}
                              className="grid grid-cols-[4px_minmax(0,1fr)] border-t border-[var(--line)] bg-white"
                            >
                              <div
                                className={isReady ? 'bg-emerald-400' : 'bg-slate-300'}
                              />
                              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-4">
                                    <Link
                                      to="/test/$testId"
                                      params={{ testId: test.id.toString() }}
                                      className="text-2xl font-semibold no-underline text-[#2f6fe4]"
                                    >
                                      #{test.id}
                                    </Link>
                                    <Link
                                      to="/test/$testId"
                                      params={{ testId: test.id.toString() }}
                                      className="block min-w-0 truncate text-xl font-semibold no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
                                    >
                                      {test.title}
                                    </Link>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4">
                                  <span
                                    className={`rounded-xl px-3 py-2 text-sm font-semibold uppercase tracking-[0.08em] ${
                                      isReady
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {test.status ?? 'Draft'}
                                  </span>
                                  <button
                                    type="button"
                                    className="rounded-xl px-2 py-1 text-xl leading-none text-[var(--sea-ink-soft)]"
                                  >
                                    …
                                  </button>
                                </div>
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
          </section>

          <section
            id="project-runs"
            className="mt-6 rounded-3xl border border-[var(--line)] bg-white px-6 py-6 shadow-[0_16px_34px_rgba(23,58,64,0.05)]"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="m-0 text-2xl font-semibold text-[var(--sea-ink)]">
                Runs
              </h2>
              <div className="text-sm text-[var(--sea-ink-soft)]">
                {runs.length} run{runs.length === 1 ? '' : 's'}
              </div>
            </div>

            {runs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--line)] bg-[rgba(245,247,255,0.55)] p-5 text-sm text-[var(--sea-ink-soft)]">
                No runs exist yet for this project.
              </div>
            ) : (
              <div className="grid gap-3">
                {runs.map((run) => (
                  <Link
                    key={run.id}
                    to="/run/$runId"
                    params={{ runId: run.id.toString() }}
                    className="rounded-2xl border border-[var(--line)] bg-[rgba(250,251,255,0.92)] px-5 py-4 no-underline text-[var(--sea-ink)] hover:text-[var(--lagoon-deep)]"
                  >
                    <div className="text-base font-semibold">{run.name}</div>
                    <div className="mt-1 text-sm text-[var(--sea-ink-soft)]">
                      Run ID: {run.id}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
