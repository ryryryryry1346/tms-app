import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { getDashboardState } from '../features/tests/server'
import {
  createRun,
  getRunsForProject,
  updateRunName,
} from '../features/runs/server'

export const Route = createFileRoute('/project/$projectSlug/runs')({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()

    if (!projectSlug) {
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
          to: '/project/$projectSlug/runs',
          params: {
            projectSlug: legacyProject.slug,
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

    const runsState = await getRunsForProject({
      data: {
        projectId: selectedProjectId,
      },
    })

    return {
      project,
      dashboard,
      runs: runsState.runs,
    }
  },
  component: ProjectRunsPage,
})

function ProjectRunsPage() {
  const { project, dashboard, runs } = Route.useLoaderData()
  const router = useRouter()
  const [showCreateRunForm, setShowCreateRunForm] = useState(false)
  const [runName, setRunName] = useState('')
  const [isCreatingRun, setIsCreatingRun] = useState(false)
  const [createRunErrorMessage, setCreateRunErrorMessage] = useState<string | null>(
    null,
  )
  const [editingRunId, setEditingRunId] = useState<number | null>(null)
  const [editingRunName, setEditingRunName] = useState('')
  const [pendingRunId, setPendingRunId] = useState<number | null>(null)
  const [runActionErrorMessage, setRunActionErrorMessage] = useState<string | null>(
    null,
  )

  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const totalCases = activeTests.length
  const totalSuites = dashboard.sections.length
  const readyCases = activeTests.filter((test) => test.status === 'Ready').length

  async function handleCreateRun(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setCreateRunErrorMessage(null)
    setIsCreatingRun(true)

    try {
      await createRun({
        data: {
          projectId: project.id,
          name: runName,
        },
      })

      setRunName('')
      setShowCreateRunForm(false)
      await router.invalidate()
    } catch (error) {
      setCreateRunErrorMessage(
        error instanceof Error ? error.message : 'Failed to create run.',
      )
    } finally {
      setIsCreatingRun(false)
    }
  }

  function startRenameRun(runId: number, currentName: string): void {
    setRunActionErrorMessage(null)
    setEditingRunId(runId)
    setEditingRunName(currentName)
  }

  async function handleRenameRun(
    event: React.FormEvent<HTMLFormElement>,
    runId: number,
  ): Promise<void> {
    event.preventDefault()
    setRunActionErrorMessage(null)
    setPendingRunId(runId)

    try {
      await updateRunName({
        data: {
          runId,
          name: editingRunName,
        },
      })

      setEditingRunId(null)
      setEditingRunName('')
      await router.invalidate()
    } catch (error) {
      setRunActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to rename run.',
      )
    } finally {
      setPendingRunId(null)
    }
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f9fe]">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        <section className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3 text-sm text-[#6d7d9e]">
              <Link to="/" className="no-underline text-[#6d7d9e]">
                Workspace
              </Link>
              <span>/</span>
              <Link
                to="/project/$projectSlug"
                params={{ projectSlug: project.slug ?? project.id.toString() }}
                className="no-underline text-[#6d7d9e]"
              >
                Project
              </Link>
              <span>/</span>
              <span>Runs</span>
            </div>
            <h1 className="m-0 text-5xl font-bold tracking-tight text-[#1b2f5b]">
              {project.name}
            </h1>
            <p className="mt-3 text-lg text-[#63759a]">
              Manage execution runs for this project.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowCreateRunForm((current) => !current)}
              className="rounded-2xl border border-[#2f6fe4] bg-[#2f6fe4] px-6 py-3 text-base font-semibold text-white"
            >
              + Run
            </button>
            <Link
              to="/project/$projectSlug"
              params={{ projectSlug: project.slug ?? project.id.toString() }}
              className="rounded-2xl border border-[#dbe4f4] bg-white px-6 py-3 text-base font-semibold no-underline text-[#60718f]"
            >
              Back to project
            </Link>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Suites', value: totalSuites },
            { label: 'Cases', value: totalCases },
            { label: 'Ready', value: readyCases },
            { label: 'Runs', value: runs.length },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-[#e6ecf8] bg-white px-7 py-6 shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[#7686a7]">
                {item.label}
              </div>
              <div className="mt-3 text-4xl font-semibold text-[#1b2f5b]">
                {item.value}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[#dfe6f4] bg-white px-6 py-6 shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">Runs</h2>
              <p className="mt-2 text-sm text-[#63759a]">
                Create, rename, and open execution runs for this project.
              </p>
            </div>
            <div className="rounded-full border border-[#dbe4f4] bg-[#fbfcff] px-3 py-1 text-sm text-[#63759a]">
              {runs.length} run{runs.length === 1 ? '' : 's'}
            </div>
          </div>

          {showCreateRunForm ? (
            <form
              className="mb-6 flex flex-col gap-3 sm:flex-row"
              onSubmit={handleCreateRun}
            >
              <input
                value={runName}
                onChange={(event) => setRunName(event.target.value)}
                placeholder="New run name"
                className="min-w-0 flex-1 rounded-2xl border border-[#dbe4f4] bg-white px-4 py-3 text-base text-[#1b2f5b] outline-none transition focus:border-[#2f6fe4]"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isCreatingRun}
                  className="rounded-2xl border border-[#2f6fe4] bg-[#2f6fe4] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isCreatingRun ? 'Creating...' : 'Create run'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateRunForm(false)
                    setRunName('')
                    setCreateRunErrorMessage(null)
                  }}
                  className="rounded-2xl border border-[#dbe4f4] bg-white px-5 py-3 text-sm font-semibold text-[#60718f]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {createRunErrorMessage ? (
            <div className="mb-5 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {createRunErrorMessage}
            </div>
          ) : null}

          {runActionErrorMessage ? (
            <div className="mb-5 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {runActionErrorMessage}
            </div>
          ) : null}

          {runs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-6 text-sm text-[#63759a]">
              No runs yet. Create the first run when you are ready to execute test cases.
            </div>
          ) : (
            <div className="grid gap-4">
              {runs.map((run) => {
                const isEditing = editingRunId === run.id
                const isPending = pendingRunId === run.id

                return (
                  <section
                    key={run.id}
                    className="rounded-2xl border border-[#dfe6f4] bg-[#fbfcff] px-5 py-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#7f8da9]">
                          Run
                        </div>
                        {isEditing ? (
                          <form
                            className="flex flex-wrap items-center gap-2"
                            onSubmit={(event) => handleRenameRun(event, run.id)}
                          >
                            <input
                              value={editingRunName}
                              onChange={(event) =>
                                setEditingRunName(event.target.value)
                              }
                              className="min-w-[260px] rounded-xl border border-[#d9e2f2] bg-white px-3 py-2 text-base font-semibold text-[#1b2f5b] outline-none transition focus:border-[#2f6fe4]"
                            />
                            <button
                              type="submit"
                              disabled={isPending}
                              className="rounded-xl border border-[#2f6fe4] bg-[#2f6fe4] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                            >
                              {isPending ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRunId(null)
                                setEditingRunName('')
                                setRunActionErrorMessage(null)
                              }}
                              className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="text-2xl font-semibold text-[#1b2f5b]">
                              {run.name}
                            </div>
                            <div className="mt-2 text-sm text-[#63759a]">
                              Run ID: {run.id}
                            </div>
                          </>
                        )}
                      </div>

                      {!isEditing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startRenameRun(run.id, run.name)}
                            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                          >
                            Rename
                          </button>
                          <Link
                            to="/run/$runId"
                            params={{ runId: run.id.toString() }}
                            className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#3369d6]"
                          >
                            Open run
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
