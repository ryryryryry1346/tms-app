import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { createProject } from '../features/projects/server'
import { getDashboardState } from '../features/tests/server'

export const Route = createFileRoute('/')({
  loader: async () =>
    getDashboardState({
      data: {},
    }),
  component: WorkspacePage,
})

function WorkspacePage() {
  const dashboard = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState('')
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [projectErrorMessage, setProjectErrorMessage] = useState<string | null>(
    null,
  )

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

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="island-kicker mb-2">Workspace</p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
            Projects
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
            Open a project to work with suites, cases, steps, and execution runs.
          </p>
        </div>
        <div className="compact-metrics">
          <div className="metric-pill">
            <span className="metric-label">Projects</span>
            <strong>{dashboard.projects.length}</strong>
          </div>
          <div className="metric-pill">
            <span className="metric-label">Structure</span>
            <strong>Project → Suite → Case</strong>
          </div>
          <div className="metric-pill">
            <span className="metric-label">Execution</span>
            <strong>Runs & results</strong>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.35fr_0.9fr]">
        <article className="island-shell rounded-[1.5rem] p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="island-kicker mb-2">Projects</p>
              <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
                Workspace projects
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
              and run the Drizzle migration before using the workspace against
              MySQL.
            </div>
          ) : dashboard.projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 p-6 text-sm text-[var(--sea-ink-soft)]">
              No projects yet. Create the first one to start structuring suites,
              cases, and runs.
            </div>
          ) : (
            <div className="grid gap-4">
              {dashboard.projects.map((project) => (
                <Link
                  key={project.id}
                  to="/project/$projectId"
                  params={{ projectId: project.id.toString() }}
                  className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 no-underline shadow-[0_12px_28px_rgba(23,58,64,0.06)]"
                >
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
                    Project
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--sea-ink)]">
                    {project.name}
                  </h3>
                  <div className="mt-3 text-sm font-semibold text-[var(--lagoon-deep)]">
                    Open project workspace
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <aside className="grid gap-5">
          <section className="island-shell rounded-[1.5rem] p-6">
            <p className="island-kicker mb-2">Create Project</p>
            <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
              Add project
            </h2>
            <p className="mb-5 mt-2 text-sm leading-6 text-[var(--sea-ink-soft)]">
              Each project becomes its own testing area.
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
            <p className="island-kicker mb-2">Model</p>
            <div className="grid gap-3 text-sm leading-6 text-[var(--sea-ink-soft)]">
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Hierarchy
                </strong>
                Workspace → Project → Test Suite → Test Case → Steps
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Execution
                </strong>
                Test runs are separate from case definitions and store execution
                results.
              </div>
            </div>
          </section>
        </aside>
      </section>
    </main>
  )
}
