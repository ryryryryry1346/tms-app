import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import {
  archiveProject,
  createProject,
  deleteProject,
  restoreProject,
} from '../features/projects/server'
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
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null)
  const [archivingProjectId, setArchivingProjectId] = useState<number | null>(null)
  const [restoringProjectId, setRestoringProjectId] = useState<number | null>(null)
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<number | null>(
    null,
  )
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  const [projectFilter, setProjectFilter] = useState<'Active' | 'Archived'>(
    'Active',
  )
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

  async function handleProjectDelete(projectId: number): Promise<void> {
    setProjectErrorMessage(null)
    setDeletingProjectId(projectId)

    try {
      await deleteProject({
        data: {
          projectId,
        },
      })

      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete project.'
      setProjectErrorMessage(message)
    } finally {
      setDeleteConfirmProjectId((current) =>
        current === projectId ? null : current,
      )
      setDeleteConfirmName('')
      setDeletingProjectId(null)
    }
  }

  async function handleProjectArchive(projectId: number): Promise<void> {
    setProjectErrorMessage(null)
    setArchivingProjectId(projectId)

    try {
      await archiveProject({
        data: {
          projectId,
        },
      })

      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to archive project.'
      setProjectErrorMessage(message)
    } finally {
      setArchivingProjectId(null)
    }
  }

  async function handleProjectRestore(projectId: number): Promise<void> {
    setProjectErrorMessage(null)
    setRestoringProjectId(projectId)

    try {
      await restoreProject({
        data: {
          projectId,
        },
      })

      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to restore project.'
      setProjectErrorMessage(message)
    } finally {
      setRestoringProjectId(null)
    }
  }

  const visibleProjects = dashboard.projects.filter((project) => {
    const normalizedStatus = project.status === 'Archived' ? 'Archived' : 'Active'
    return normalizedStatus === projectFilter
  })

  return (
    <main className="page-wrap px-4 pb-8 pt-8">
      <section className="mb-5">
        <p className="island-kicker mb-2">Workspace</p>
        <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
          Projects
        </h1>
      </section>

      <section>
        <article className="island-shell rounded-[1.5rem] p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="island-kicker mb-2">Projects</p>
              <h2 className="m-0 text-xl font-semibold text-[var(--sea-ink)]">
                Workspace projects
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-sm text-[var(--sea-ink-soft)]">
                {visibleProjects.length} project
                {visibleProjects.length === 1 ? '' : 's'}
              </div>
              <div className="flex rounded-full border border-[var(--line)] bg-white/75 p-1">
                {(['Active', 'Archived'] as const).map((filterValue) => (
                  <button
                    key={filterValue}
                    type="button"
                    onClick={() => setProjectFilter(filterValue)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                      projectFilter === filterValue
                        ? 'bg-[var(--chip-bg-strong)] text-[var(--lagoon-deep)]'
                        : 'text-[var(--sea-ink-soft)]'
                    }`}
                  >
                    {filterValue}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            className="mb-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={handleProjectSubmit}
          >
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none ring-0 transition focus:border-[var(--lagoon-deep)]"
              placeholder="New project"
            />
            <button
              type="submit"
              disabled={isSubmittingProject || !dashboard.databaseConfigured}
              className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55 sm:min-w-[148px]"
            >
              {isSubmittingProject ? 'Creating...' : 'Create project'}
            </button>
          </form>

          {projectErrorMessage ? (
            <div className="mb-5 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {projectErrorMessage}
            </div>
          ) : null}

          {!dashboard.databaseConfigured ? (
            <div className="rounded-2xl border border-amber-300/60 bg-amber-100/70 p-4 text-sm text-amber-950">
              <strong>Database is not configured yet.</strong> Set
              <code> MYSQL_DATABASE_URL </code>
              and run the Drizzle migration before using the workspace against
              MySQL.
            </div>
          ) : visibleProjects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--line)] bg-white/40 p-6 text-sm text-[var(--sea-ink-soft)]">
              {projectFilter === 'Archived'
                ? 'No archived projects yet.'
                : 'No active projects yet. Create the first one to start structuring suites, cases, and runs.'}
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-[var(--line)] bg-white/70 p-5 shadow-[0_12px_28px_rgba(23,58,64,0.06)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
                      Project
                    </div>
                    {project.status === 'Archived' ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleProjectRestore(project.id)}
                          disabled={restoringProjectId === project.id}
                          className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {restoringProjectId === project.id
                            ? 'Restoring...'
                            : 'Restore'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmProjectId((current) =>
                              current === project.id ? null : project.id,
                            )
                            setDeleteConfirmName('')
                          }}
                          disabled={deletingProjectId === project.id}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          {deletingProjectId === project.id ? 'Deleting...' : 'Delete permanently'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleProjectArchive(project.id)}
                        disabled={archivingProjectId === project.id}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {archivingProjectId === project.id
                          ? 'Archiving...'
                          : 'Archive'}
                      </button>
                    )}
                  </div>
                  <h3 className="mt-2 text-xl font-semibold text-[var(--sea-ink)]">
                    {project.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        project.status === 'Archived'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {project.status === 'Archived' ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  <Link
                    to="/project/$projectSlug"
                    params={{
                      projectSlug:
                        project.slug && project.slug.trim().length > 0
                          ? project.slug
                          : project.id.toString(),
                    }}
                    className="mt-3 inline-flex text-sm font-semibold text-[var(--lagoon-deep)] no-underline"
                  >
                    Open project workspace
                  </Link>
                  {deleteConfirmProjectId === project.id ? (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-950">
                      <div className="space-y-3">
                        <p className="m-0">
                          Delete project <strong>{project.name}</strong> permanently?
                          This also removes its suites, test cases, and runs.
                        </p>
                        <label className="block">
                          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-rose-800">
                            Type the project name to confirm
                          </span>
                          <input
                            value={deleteConfirmName}
                            onChange={(event) =>
                              setDeleteConfirmName(event.target.value)
                            }
                            placeholder={project.name}
                            className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-[var(--sea-ink)] outline-none transition focus:border-rose-400"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleProjectDelete(project.id)}
                            disabled={
                              deletingProjectId === project.id ||
                              deleteConfirmName.trim() !== project.name
                            }
                            className="rounded-xl border border-rose-300 bg-rose-100 px-4 py-2 font-semibold text-rose-900 disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {deletingProjectId === project.id
                              ? 'Deleting...'
                              : 'Confirm delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmProjectId(null)
                              setDeleteConfirmName('')
                            }}
                            disabled={deletingProjectId === project.id}
                            className="rounded-xl border border-[var(--line)] bg-white px-4 py-2 font-semibold text-[var(--sea-ink)] disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  )
}
