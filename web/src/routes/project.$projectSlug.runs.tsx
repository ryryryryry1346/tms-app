import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
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

function ProjectSubnav({
  projectSlug,
  active,
}: {
  projectSlug: string
  active: 'overview' | 'repository' | 'runs' | 'reports'
}) {
  const tabClass = (isActive: boolean): string =>
    `rounded-full px-4 py-2 text-sm font-semibold no-underline ${
      isActive
        ? 'bg-[var(--tms-primary-soft)] text-[var(--tms-primary)]'
        : 'text-[var(--tms-text-muted)] hover:bg-[var(--tms-surface-muted)]'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/project/$projectSlug"
        params={{ projectSlug }}
        className={tabClass(active === 'overview')}
      >
        Overview
      </Link>
      <Link
        to="/project/$projectSlug/repository"
        params={{ projectSlug }}
        className={tabClass(active === 'repository')}
      >
        Repository
      </Link>
      <Link
        to="/project/$projectSlug/runs"
        params={{ projectSlug }}
        className={tabClass(active === 'runs')}
      >
        Runs
      </Link>
      <Link
        to="/project/$projectSlug/reports"
        params={{ projectSlug }}
        className={tabClass(active === 'reports')}
      >
        Reports
      </Link>
    </div>
  )
}

function ProjectRunsPage() {
  const { project, dashboard, runs } = Route.useLoaderData()
  const router = useRouter()
  const [showCreateRunForm, setShowCreateRunForm] = useState(false)
  const [runName, setRunName] = useState('')
  const [runScope, setRunScope] = useState<'all' | 'suites' | 'cases'>('all')
  const [selectedRunSuiteIds, setSelectedRunSuiteIds] = useState<number[]>([])
  const [selectedRunCaseIds, setSelectedRunCaseIds] = useState<number[]>([])
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
  const selectedRunTestIds = useMemo(() => {
    if (runScope === 'all') {
      return activeTests.map((test) => test.id)
    }

    if (runScope === 'suites') {
      const suiteIds = new Set(selectedRunSuiteIds)
      return activeTests
        .filter((test) => test.sectionId !== null && suiteIds.has(test.sectionId))
        .map((test) => test.id)
    }

    const caseIds = new Set(selectedRunCaseIds)
    return activeTests.filter((test) => caseIds.has(test.id)).map((test) => test.id)
  }, [activeTests, runScope, selectedRunCaseIds, selectedRunSuiteIds])
  const selectedRunTestIdSet = useMemo(
    () => new Set(selectedRunTestIds),
    [selectedRunTestIds],
  )

  function resetCreateRunForm(): void {
    setRunName('')
    setRunScope('all')
    setSelectedRunSuiteIds([])
    setSelectedRunCaseIds([])
    setCreateRunErrorMessage(null)
  }

  function toggleRunSuiteSelection(suiteId: number): void {
    setCreateRunErrorMessage(null)
    setSelectedRunSuiteIds((current) =>
      current.includes(suiteId)
        ? current.filter((id) => id !== suiteId)
        : [...current, suiteId],
    )
  }

  function toggleRunCaseSelection(testId: number): void {
    setCreateRunErrorMessage(null)
    setSelectedRunCaseIds((current) =>
      current.includes(testId)
        ? current.filter((id) => id !== testId)
        : [...current, testId],
    )
  }

  async function handleCreateRun(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setCreateRunErrorMessage(null)

    if (selectedRunTestIds.length === 0) {
      setCreateRunErrorMessage('Choose at least one active test case for this run.')
      return
    }

    setIsCreatingRun(true)

    try {
      const result = await createRun({
        data: {
          projectId: project.id,
          name: runName,
          testIds: selectedRunTestIds,
        },
      })

      resetCreateRunForm()
      setShowCreateRunForm(false)
      window.location.href = `/run/${result.id}`
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
    <main className="tms-page">
      <div className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        <section className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-3 text-sm text-[var(--tms-text-muted)]">
              <Link to="/" className="no-underline text-[var(--tms-primary)]">
                Workspace
              </Link>
              <span>/</span>
              <Link
                to="/project/$projectSlug"
                params={{ projectSlug: project.slug ?? project.id.toString() }}
                className="no-underline text-[var(--tms-primary)]"
              >
                Project
              </Link>
              <span>/</span>
              <span>Runs</span>
            </div>
            <h1 className="m-0 text-5xl font-bold tracking-tight text-[var(--tms-text)]">
              {project.name}
            </h1>
            <p className="mt-3 text-lg text-[var(--tms-text-muted)]">
              Manage execution runs for this project.
            </p>
            <div className="mt-4">
              <ProjectSubnav
                projectSlug={project.slug ?? project.id.toString()}
                active="runs"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowCreateRunForm((current) => !current)}
              className="tms-button tms-button-primary px-6 py-3 text-base"
            >
              + Run
            </button>
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
              className="tms-panel px-7 py-6"
            >
              <div className="tms-kicker">
                {item.label}
              </div>
              <div className="mt-3 text-4xl font-semibold text-[var(--tms-text)]">
                {item.value}
              </div>
            </div>
          ))}
        </section>

        <section className="tms-panel px-6 py-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
            <h2 className="m-0 text-2xl font-semibold text-[var(--tms-text)]">Runs</h2>
              <p className="mt-2 text-sm text-[var(--tms-text-muted)]">
                Create, rename, and track execution progress for this project.
              </p>
            </div>
            <div className="tms-chip">
              {runs.length} run{runs.length === 1 ? '' : 's'}
            </div>
          </div>

          {showCreateRunForm ? (
            <form
              className="mb-6 rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border)] bg-[var(--tms-surface-muted)] p-4"
              onSubmit={handleCreateRun}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-2 text-sm font-semibold text-[var(--tms-text)]">
                  Run name
                  <input
                    value={runName}
                    onChange={(event) => setRunName(event.target.value)}
                    placeholder="Week 13. Regression"
                    className="tms-input min-w-0 px-4 py-3 text-base"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={isCreatingRun || selectedRunTestIds.length === 0}
                    className="tms-button tms-button-primary whitespace-nowrap px-5 py-3 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isCreatingRun ? 'Creating...' : 'Create run'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateRunForm(false)
                      resetCreateRunForm()
                    }}
                    className="tms-button whitespace-nowrap px-5 py-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All active cases' },
                    { value: 'suites', label: 'Suites' },
                    { value: 'cases', label: 'Cases' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setRunScope(option.value as 'all' | 'suites' | 'cases')
                        setCreateRunErrorMessage(null)
                      }}
                      className={`tms-button ${
                        runScope === option.value
                          ? 'tms-chip-primary'
                          : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="tms-chip">
                  {selectedRunTestIds.length} case
                  {selectedRunTestIds.length === 1 ? '' : 's'} in run
                </div>
              </div>

              {runScope === 'suites' ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {dashboard.sections.map((section) => {
                    const sectionCaseCount = activeTests.filter(
                      (test) => test.sectionId === section.id,
                    ).length
                    const isSelected = selectedRunSuiteIds.includes(section.id)

                    return (
                      <label
                        key={section.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm font-semibold ${
                          isSelected
                            ? 'border-[var(--tms-primary-border)] bg-[var(--tms-primary-soft)] text-[var(--tms-text)]'
                            : 'border-[var(--tms-border)] bg-[var(--tms-surface)] text-[var(--tms-text-muted)]'
                        }`}
                      >
                        <span className="min-w-0 truncate">{section.name}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          <span className="text-xs text-[var(--tms-text-soft)]">
                            {sectionCaseCount}
                          </span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRunSuiteSelection(section.id)}
                            className="h-4 w-4 rounded border-[var(--tms-border)] text-[var(--tms-primary)] focus:ring-[var(--tms-primary)]"
                          />
                        </span>
                      </label>
                    )
                  })}
                </div>
              ) : null}

              {runScope === 'cases' ? (
                <div className="mt-4 max-h-[260px] overflow-y-auto rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border-subtle)] bg-[var(--tms-surface)]">
                  {activeTests.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[var(--tms-text-muted)]">
                      No active cases are available for this run.
                    </div>
                  ) : (
                    activeTests.map((test) => {
                      const section = dashboard.sections.find(
                        (item) => item.id === test.sectionId,
                      )

                      return (
                        <label
                          key={test.id}
                          className="flex items-center justify-between gap-4 border-t border-[var(--tms-border-subtle)] px-4 py-2.5 first:border-t-0"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[var(--tms-text)]">
                              #{test.id} {test.title}
                            </span>
                            <span className="text-xs font-semibold text-[var(--tms-text-soft)]">
                              {section?.name ?? 'No suite'} ·{' '}
                              {test.priority ?? 'Medium'} ·{' '}
                              {test.caseType ?? 'Functional'}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={selectedRunTestIdSet.has(test.id)}
                            onChange={() => toggleRunCaseSelection(test.id)}
                            className="h-4 w-4 shrink-0 rounded border-[var(--tms-border)] text-[var(--tms-primary)] focus:ring-[var(--tms-primary)]"
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              ) : null}
            </form>
          ) : null}

          {createRunErrorMessage ? (
            <div className="mb-5 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3 text-sm text-[var(--tms-danger)]">
              {createRunErrorMessage}
            </div>
          ) : null}

          {runActionErrorMessage ? (
            <div className="mb-5 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3 text-sm text-[var(--tms-danger)]">
              {runActionErrorMessage}
            </div>
          ) : null}

          {runs.length === 0 ? (
            <div className="rounded-[var(--tms-radius-overlay)] border border-dashed border-[var(--tms-border)] bg-[var(--tms-surface-muted)] p-6 text-sm text-[var(--tms-text-muted)]">
              No runs yet. Create the first run when you are ready to execute test cases.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border-subtle)]">
              <div className="tms-table-head grid min-w-[1180px] grid-cols-[minmax(300px,1fr)_190px_96px_96px_96px_110px_190px] px-5 py-3">
                <div>Run</div>
                <div>Progress</div>
                <div>Passed</div>
                <div>Failed</div>
                <div>Blocked</div>
                <div>Not run</div>
                <div className="text-right">Actions</div>
              </div>
              {runs.map((run) => {
                const isEditing = editingRunId === run.id
                const isPending = pendingRunId === run.id
                const executed = run.passed + run.failed + run.blocked
                const progress =
                  run.total === 0 ? 0 : Math.round((executed / run.total) * 100)
                const stateLabel =
                  run.total === 0
                    ? 'Empty'
                    : run.notRun === 0
                      ? 'Complete'
                      : run.failed > 0
                        ? 'Needs review'
                        : 'In progress'

                return (
                  <section
                    key={run.id}
                    className="tms-table-row grid min-w-[1180px] grid-cols-[minmax(300px,1fr)_190px_96px_96px_96px_110px_190px] px-5 py-4"
                  >
                    <div className="min-w-0 pr-4">
                      {isEditing ? (
                          <form
                            className="grid gap-2 xl:grid-cols-[minmax(240px,1fr)_auto_auto]"
                            onSubmit={(event) => handleRenameRun(event, run.id)}
                          >
                            <input
                              value={editingRunName}
                              onChange={(event) =>
                                setEditingRunName(event.target.value)
                              }
                              className="tms-input min-w-0 text-base"
                            />
                            <button
                              type="submit"
                              disabled={isPending}
                              className="tms-button tms-button-primary disabled:cursor-not-allowed disabled:opacity-55"
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
                              className="tms-button"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="truncate text-base font-semibold text-[var(--tms-text)]">
                              {run.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--tms-text-muted)]">
                              <span>#{run.id}</span>
                              <span
                                className={`rounded-full px-2 py-0.5 ${
                                  stateLabel === 'Complete'
                                    ? 'tms-chip-success'
                                    : stateLabel === 'Needs review'
                                      ? 'tms-chip-danger'
                                      : stateLabel === 'Empty'
                                        ? 'tms-chip-draft'
                                        : 'tms-chip-primary'
                                }`}
                              >
                                {stateLabel}
                              </span>
                            </div>
                          </>
                        )}
                    </div>
                    <div className="pr-6">
                      <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--tms-text)]">
                        <span>{progress}%</span>
                        <span className="text-xs text-[var(--tms-text-soft)]">
                          {executed}/{run.total}
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--tms-surface-muted)]">
                        <div
                          className="h-full rounded-full bg-[var(--tms-primary)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--tms-success)]">
                      {run.passed}
                    </div>
                    <div className="text-sm font-semibold text-[var(--tms-danger)]">
                      {run.failed}
                    </div>
                    <div className="text-sm font-semibold text-[var(--tms-warning)]">
                      {run.blocked}
                    </div>
                    <div className="text-sm font-semibold text-[var(--tms-draft)]">
                      {run.notRun}
                    </div>
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      {!isEditing ? (
                        <>
                          <button
                            type="button"
                            onClick={() => startRenameRun(run.id, run.name)}
                            className="tms-button"
                          >
                            Rename
                          </button>
                          <Link
                            to="/run/$runId"
                            params={{ runId: run.id.toString() }}
                            className="tms-button tms-button-primary no-underline"
                          >
                            Open run
                          </Link>
                        </>
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
