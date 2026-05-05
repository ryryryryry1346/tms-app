import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
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

function getRunStateBadgeVariant(
  stateLabel: string,
): 'runPassed' | 'runFailed' | 'runNotRun' | 'primary' {
  if (stateLabel === 'Complete') {
    return 'runPassed'
  }

  if (stateLabel === 'Needs review') {
    return 'runFailed'
  }

  if (stateLabel === 'Empty') {
    return 'runNotRun'
  }

  return 'primary'
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
            <Button
              onClick={() => setShowCreateRunForm((current) => !current)}
              variant="primary"
              size="lg"
            >
              + Run
            </Button>
          </div>
        </section>

        <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Suites', value: totalSuites },
            { label: 'Cases', value: totalCases },
            { label: 'Ready', value: readyCases },
            { label: 'Runs', value: runs.length },
          ].map((item) => (
            <Panel
              key={item.label}
              className="px-7 py-6"
            >
              <div className="tms-kicker">
                {item.label}
              </div>
              <div className="mt-3 text-4xl font-semibold text-[var(--tms-text)]">
                {item.value}
              </div>
            </Panel>
          ))}
        </section>

        <Panel className="px-6 py-6">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
            <h2 className="m-0 text-2xl font-semibold text-[var(--tms-text)]">Runs</h2>
              <p className="mt-2 text-sm text-[var(--tms-text-muted)]">
                Create, rename, and track execution progress for this project.
              </p>
            </div>
            <Badge>
              {runs.length} run{runs.length === 1 ? '' : 's'}
            </Badge>
          </div>

          {showCreateRunForm ? (
            <form
              className="mb-6 rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border)] bg-[var(--tms-surface-muted)] p-4"
              onSubmit={handleCreateRun}
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <label className="grid gap-2 text-sm font-semibold text-[var(--tms-text)]">
                  Run name
                  <Input
                    value={runName}
                    onChange={(event) => setRunName(event.target.value)}
                    placeholder="Week 13. Regression"
                    size="lg"
                    className="min-w-0"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <Button
                    type="submit"
                    disabled={isCreatingRun || selectedRunTestIds.length === 0}
                    variant="primary"
                    className="whitespace-nowrap px-5 py-3"
                  >
                    {isCreatingRun ? 'Creating...' : 'Create run'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateRunForm(false)
                      resetCreateRunForm()
                    }}
                    className="tms-button whitespace-nowrap px-5 py-3"
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'all', label: 'All active cases' },
                    { value: 'suites', label: 'Suites' },
                    { value: 'cases', label: 'Cases' },
                  ].map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => {
                        setRunScope(option.value as 'all' | 'suites' | 'cases')
                        setCreateRunErrorMessage(null)
                      }}
                      variant={runScope === option.value ? 'primary' : 'default'}
                      className={`tms-button ${
                        runScope === option.value
                          ? 'tms-chip-primary'
                          : ''
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                <Badge>
                  {selectedRunTestIds.length} case
                  {selectedRunTestIds.length === 1 ? '' : 's'} in run
                </Badge>
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
                          <Checkbox
                            checked={isSelected}
                            onChange={() => toggleRunSuiteSelection(section.id)}
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
                          <Checkbox
                            checked={selectedRunTestIdSet.has(test.id)}
                            onChange={() => toggleRunCaseSelection(test.id)}
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
            <Alert variant="danger" className="mb-5">
              {createRunErrorMessage}
            </Alert>
          ) : null}

          {runActionErrorMessage ? (
            <Alert variant="danger" className="mb-5">
              {runActionErrorMessage}
            </Alert>
          ) : null}

          {runs.length === 0 ? (
            <EmptyState
              title="No runs yet"
              description="Create the first run when you are ready to execute test cases."
            />
          ) : (
            <TableShell>
              <TableHead
                columns="minmax(300px,1fr) 190px 96px 96px 96px 110px 190px"
                minWidth="1180px"
              >
                <div>Run</div>
                <div>Progress</div>
                <div>Passed</div>
                <div>Failed</div>
                <div>Blocked</div>
                <div>Not run</div>
                <div className="text-right">Actions</div>
              </TableHead>
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
                  <TableRow
                    key={run.id}
                    columns="minmax(300px,1fr) 190px 96px 96px 96px 110px 190px"
                    minWidth="1180px"
                    className="py-4"
                  >
                    <div className="min-w-0 pr-4">
                      {isEditing ? (
                          <form
                            className="grid gap-2 xl:grid-cols-[minmax(240px,1fr)_auto_auto]"
                            onSubmit={(event) => handleRenameRun(event, run.id)}
                          >
                            <Input
                              value={editingRunName}
                              onChange={(event) =>
                                setEditingRunName(event.target.value)
                              }
                              size="lg"
                              className="min-w-0"
                            />
                            <Button
                              type="submit"
                              disabled={isPending}
                              variant="primary"
                            >
                              {isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingRunId(null)
                                setEditingRunName('')
                                setRunActionErrorMessage(null)
                              }}
                            >
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <>
                            <div className="truncate text-base font-semibold text-[var(--tms-text)]">
                              {run.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--tms-text-muted)]">
                              <span>#{run.id}</span>
                              <Badge
                                className="px-2 py-0.5"
                                variant={getRunStateBadgeVariant(stateLabel)}
                              >
                                {stateLabel}
                              </Badge>
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
                      <div className="tms-run-progress-track mt-1 h-2 overflow-hidden rounded-full">
                        <div
                          className="tms-run-progress-fill h-full rounded-full"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[var(--run-passed-text)]">
                      {run.passed}
                    </div>
                    <div className="text-sm font-semibold text-[var(--run-failed-text)]">
                      {run.failed}
                    </div>
                    <div className="text-sm font-semibold text-[var(--run-blocked-text)]">
                      {run.blocked}
                    </div>
                    <div className="text-sm font-semibold text-[var(--run-not-run-text)]">
                      {run.notRun}
                    </div>
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      {!isEditing ? (
                        <>
                          <Button
                            onClick={() => startRenameRun(run.id, run.name)}
                          >
                            Rename
                          </Button>
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
                  </TableRow>
                )
              })}
            </TableShell>
          )}
        </Panel>
      </div>
    </main>
  )
}
