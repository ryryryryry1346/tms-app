import {
  Link,
  createFileRoute,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { createProject } from '../features/projects/server'
import { createRun, getRunsForProject } from '../features/runs/server'
import { getDashboardState, updateTestStatus } from '../features/tests/server'

type DashboardSearch = {
  project?: number
}

function validateSearch(search: Record<string, unknown>): DashboardSearch {
  const rawProject = search.project

  if (typeof rawProject !== 'string' || rawProject.trim() === '') {
    return {}
  }

  const parsedProject = Number(rawProject)

  if (!Number.isInteger(parsedProject) || parsedProject <= 0) {
    return {}
  }

  return {
    project: parsedProject,
  }
}

export const Route = createFileRoute('/')({
  validateSearch,
  loaderDeps: ({ search }) => ({
    projectId: search.project,
  }),
  loader: async ({ deps }) => {
    const [dashboard, runsState] = await Promise.all([
      getDashboardState({
        data: {
          projectId: deps.projectId,
        },
      }),
      getRunsForProject({
        data: {
          projectId: deps.projectId,
        },
      }),
    ])

    return {
      dashboard,
      runs: runsState.runs,
    }
  },
  component: App,
})

function App() {
  const loaderData = Route.useLoaderData()
  const dashboard = loaderData.dashboard
  const runs = loaderData.runs
  const search = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate({ from: '/' })

  const [name, setName] = useState('')
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [projectErrorMessage, setProjectErrorMessage] = useState<string | null>(
    null,
  )
  const [runName, setRunName] = useState('')
  const [runErrorMessage, setRunErrorMessage] = useState<string | null>(null)
  const [isSubmittingRun, setIsSubmittingRun] = useState(false)
  const [pendingStatusByTestId, setPendingStatusByTestId] = useState<
    Record<number, boolean>
  >({})

  async function handleProjectSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setProjectErrorMessage(null)
    setIsSubmittingProject(true)

    try {
      await createProject({
        data: {
          name,
        },
      })

      setName('')
      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create project.'
      setProjectErrorMessage(message)
    } finally {
      setIsSubmittingProject(false)
    }
  }

  async function handleCreateRun(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    if (!search.project) {
      setRunErrorMessage('Select a project before creating a run.')
      return
    }

    setRunErrorMessage(null)
    setIsSubmittingRun(true)

    try {
      await createRun({
        data: {
          projectId: search.project,
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

  async function handleProjectSelection(
    event: React.ChangeEvent<HTMLSelectElement>,
  ): Promise<void> {
    const nextValue = event.target.value

    if (nextValue === '') {
      await navigate({
        search: {},
      })
      return
    }

    await navigate({
      search: {
        project: Number(nextValue),
      },
    })
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
    <main className="page-wrap px-4 pb-10 pt-14">
      <section className="island-shell rise-in relative overflow-hidden rounded-[2rem] px-6 py-10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.32),transparent_66%)]" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.18),transparent_66%)]" />
        <p className="island-kicker mb-3">Steps 1-5 migrated</p>
        <h1 className="display-title mb-5 max-w-3xl text-4xl leading-[1.02] font-bold tracking-tight text-[var(--sea-ink)] sm:text-6xl">
          Projects, tests, and runs on the new stack.
        </h1>
        <p className="mb-8 max-w-2xl text-base text-[var(--sea-ink-soft)] sm:text-lg">
          This dashboard now preserves the verified Flask behavior for project
          selection, section-based test browsing, create run, opening a run
          page, and the simple run execution result contract.
        </p>
        <div className="flex flex-wrap gap-3 text-sm text-[var(--sea-ink-soft)]">
          <span className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 font-semibold text-[var(--lagoon-deep)]">
            Preserved: create_run
          </span>
          <span className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 font-semibold text-[var(--lagoon-deep)]">
            Preserved: run detail read
          </span>
            <span className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 font-semibold text-[var(--lagoon-deep)]">
              Preserved: run_test execution
            </span>
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
        <article className="island-shell rounded-[1.5rem] p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="island-kicker mb-2">Projects</p>
              <h2 className="m-0 text-2xl font-semibold text-[var(--sea-ink)]">
                Dashboard state
              </h2>
            </div>
            <div className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-sm text-[var(--sea-ink-soft)]">
              {dashboard.projects.length} project
              {dashboard.projects.length === 1 ? '' : 's'}
            </div>
          </div>

          {!dashboard.databaseConfigured ? (
            <div className="rounded-2xl border border-amber-300/60 bg-amber-100/70 p-4 text-sm text-amber-950">
              <strong>Database is not configured yet.</strong> Set
              <code> MYSQL_DATABASE_URL </code>
              and run the Drizzle migration before using the migrated dashboard
              against MySQL.
            </div>
          ) : (
            <div className="grid gap-5">
              <form className="grid gap-2">
                <label className="text-sm font-semibold text-[var(--sea-ink)]">
                  Select project
                </label>
                <select
                  value={search.project?.toString() ?? ''}
                  onChange={handleProjectSelection}
                  className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
                >
                  <option value="">Select project</option>
                  {dashboard.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </form>

              {!search.project ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 p-6 text-sm text-[var(--sea-ink-soft)]">
                  This matches the legacy Flask dashboard behavior: until a
                  project is selected, sections and tests are not shown.
                </div>
              ) : dashboard.sections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 p-6 text-sm text-[var(--sea-ink-soft)]">
                  The selected project has no sections in MySQL yet, so there
                  are no tests to display in this migrated slice.
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
                          <h3 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
                            {section.name}
                          </h3>
                        </div>

                        {sectionTests.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-4 text-sm text-[var(--sea-ink-soft)]">
                            No tests in this section yet.
                          </div>
                        ) : (
                          sectionTests.map((test) => {
                            const isPending = Boolean(
                              pendingStatusByTestId[test.id],
                            )
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
                                      Test ID: {test.id}
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
                                      Expected
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
            </div>
          )}
        </article>

        <aside className="grid gap-6">
          <section className="island-shell rounded-[1.5rem] p-6">
            <p className="island-kicker mb-2">Create Project</p>
            <h2 className="m-0 text-2xl font-semibold text-[var(--sea-ink)]">
              Preserved write flow
            </h2>
            <p className="mb-5 mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
              This still maps only to verified Flask
              <code> GET/POST /create_project</code> behavior.
            </p>

            <form className="grid gap-3" onSubmit={handleProjectSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
                Project name
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none ring-0 transition focus:border-[var(--lagoon-deep)]"
                  placeholder="Warehouse smoke tests"
                />
              </label>

              {projectErrorMessage ? (
                <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {projectErrorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingProject || !dashboard.databaseConfigured}
                className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmittingProject ? 'Creating...' : 'Create project'}
              </button>
            </form>
          </section>

          <section className="island-shell rounded-[1.5rem] p-6">
            <p className="island-kicker mb-2">Runs</p>
            <h2 className="m-0 text-2xl font-semibold text-[var(--sea-ink)]">
              Preserve backend run flow
            </h2>
            <p className="mb-5 mt-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
              Flask exposed backend routes for creating and opening runs but no
              visible template entrypoint was found. This panel is an additive UI
              around the verified backend behavior only.
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
                disabled={
                  isSubmittingRun ||
                  !dashboard.databaseConfigured ||
                  !search.project
                }
                className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmittingRun ? 'Creating...' : 'Create run'}
              </button>
            </form>

            <div className="mt-5 grid gap-3">
              {!search.project ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-4 text-sm text-[var(--sea-ink-soft)]">
                  Select a project to create or inspect its runs.
                </div>
              ) : runs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/50 p-4 text-sm text-[var(--sea-ink-soft)]">
                  No runs exist yet for this project in MySQL.
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
            <p className="island-kicker mb-2">Migration scope</p>
            <div className="grid gap-3 text-sm text-[var(--sea-ink-soft)]">
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Replaced now
                </strong>
                Flask <code>GET /?project=&lt;id&gt;</code> section/test read,
                Flask <code>POST /set_status</code>, Flask
                <code> POST /create_run</code>, and Flask
                <code> GET /run/&lt;id&gt;</code>, plus the historical
                <code> POST /run_test</code> payload.
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Still deferred
                </strong>
                Deployment hardening and data migration remain separate
                migration streams.
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}
