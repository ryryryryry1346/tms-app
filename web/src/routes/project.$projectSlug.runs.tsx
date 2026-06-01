import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuLabel,
} from '../components/ui/PopoverMenu'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import { getDashboardState } from '../features/tests/server'
import {
  createRun,
  getRunsForProject,
  updateRunName,
} from '../features/runs/server'

type RunStateLabel =
  | 'Passed'
  | 'Needs review'
  | 'Blocked'
  | 'In progress'
  | 'Not started'
  | 'Empty'

type RunListFilter = 'all' | 'active' | 'review' | 'finished'

const RUN_FILTERS: Array<{ value: RunListFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'review', label: 'Needs review' },
  { value: 'finished', label: 'Finished' },
]

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

function getRunStateBadgeVariant(
  stateLabel: RunStateLabel,
): 'runPassed' | 'runFailed' | 'runBlocked' | 'runNotRun' | 'primary' {
  if (stateLabel === 'Passed') {
    return 'runPassed'
  }

  if (stateLabel === 'Needs review') {
    return 'runFailed'
  }

  if (stateLabel === 'Blocked') {
    return 'runBlocked'
  }

  if (stateLabel === 'Empty' || stateLabel === 'Not started') {
    return 'runNotRun'
  }

  return 'primary'
}

function getRunStateLabel(run: {
  total: number
  passed: number
  failed: number
  blocked: number
  notRun: number
}): RunStateLabel {
  const executed = run.passed + run.failed + run.blocked

  if (run.total === 0) {
    return 'Empty'
  }

  if (executed === 0) {
    return 'Not started'
  }

  if (run.failed > 0) {
    return 'Needs review'
  }

  if (run.blocked > 0) {
    return 'Blocked'
  }

  if (run.notRun > 0) {
    return 'In progress'
  }

  return 'Passed'
}

function formatProgressLabel(progress: number, executed: number): string {
  if (progress === 0 && executed > 0) {
    return '<1%'
  }

  return `${progress}%`
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
  const [runQuery, setRunQuery] = useState('')
  const [activeRunFilter, setActiveRunFilter] = useState<RunListFilter>('all')
  const [openRunActionsId, setOpenRunActionsId] = useState<number | null>(null)
  const [createRunScopeQuery, setCreateRunScopeQuery] = useState('')

  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
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
  const runViewModels = useMemo(
    () =>
      runs.map((run) => {
        const executed = run.passed + run.failed + run.blocked
        const progress =
          run.total === 0 ? 0 : Math.round((executed / run.total) * 100)
        const passedProgress =
          run.total === 0 ? 0 : (run.passed / run.total) * 100
        const failedProgress =
          run.total === 0 ? 0 : (run.failed / run.total) * 100
        const blockedProgress =
          run.total === 0 ? 0 : (run.blocked / run.total) * 100
        const stateLabel = getRunStateLabel(run)
        const outcomeLabel =
          run.failed > 0
            ? `${run.failed} failed`
            : run.blocked > 0
              ? `${run.blocked} blocked`
              : run.passed > 0
                ? `${run.passed} passed`
                : `${run.notRun} not run`

        return {
          run,
          executed,
          progress,
          progressLabel: formatProgressLabel(progress, executed),
          passedProgress,
          failedProgress,
          blockedProgress,
          stateLabel,
          outcomeLabel,
          isFinished: run.total > 0 && run.notRun === 0,
          needsReview: run.failed > 0 || run.blocked > 0,
        }
      }),
    [runs],
  )
  const runFilterCounts = useMemo(() => {
    const counts: Record<RunListFilter, number> = {
      all: runViewModels.length,
      active: 0,
      review: 0,
      finished: 0,
    }

    for (const viewModel of runViewModels) {
      if (!viewModel.isFinished) {
        counts.active += 1
      }

      if (viewModel.needsReview) {
        counts.review += 1
      }

      if (viewModel.isFinished) {
        counts.finished += 1
      }
    }

    return counts
  }, [runViewModels])
  const filteredRunViewModels = useMemo(() => {
    const normalizedQuery = runQuery.trim().toLowerCase()

    return runViewModels.filter((viewModel) => {
      if (activeRunFilter === 'active' && viewModel.isFinished) {
        return false
      }

      if (activeRunFilter === 'review' && !viewModel.needsReview) {
        return false
      }

      if (activeRunFilter === 'finished' && !viewModel.isFinished) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return (
        viewModel.run.name.toLowerCase().includes(normalizedQuery) ||
        viewModel.run.id.toString().includes(normalizedQuery) ||
        viewModel.stateLabel.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [activeRunFilter, runQuery, runViewModels])
  const totalRunCases = useMemo(
    () => runs.reduce((total, run) => total + run.total, 0),
    [runs],
  )
  const filteredRunSuites = useMemo(() => {
    const normalizedQuery = createRunScopeQuery.trim().toLowerCase()

    return dashboard.sections.filter((section) => {
      if (!normalizedQuery) {
        return true
      }

      return section.name.toLowerCase().includes(normalizedQuery)
    })
  }, [createRunScopeQuery, dashboard.sections])
  const filteredRunCases = useMemo(() => {
    const normalizedQuery = createRunScopeQuery.trim().toLowerCase()

    return activeTests.filter((test) => {
      if (!normalizedQuery) {
        return true
      }

      const section = dashboard.sections.find(
        (item) => item.id === test.sectionId,
      )

      return (
        test.title.toLowerCase().includes(normalizedQuery) ||
        test.id.toString().includes(normalizedQuery) ||
        (section?.name.toLowerCase().includes(normalizedQuery) ?? false)
      )
    })
  }, [activeTests, createRunScopeQuery, dashboard.sections])

  function resetCreateRunForm(): void {
    setRunName('')
    setRunScope('all')
    setSelectedRunSuiteIds([])
    setSelectedRunCaseIds([])
    setCreateRunScopeQuery('')
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

  function openRun(runId: number): void {
    window.location.href = `/run/${runId}`
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <Panel className="runs-panel runs-cockpit-panel p-4">
            <div className="runs-cockpit-header">
              <WorkspaceSectionHeader
                dense
                title="Runs"
                description={`${project.name} execution cockpit for readiness, progress, and review.`}
                meta={
                  <Badge>
                    {runs.length} run{runs.length === 1 ? '' : 's'}
                  </Badge>
                }
              />
              <Button
                onClick={() => {
                  setOpenRunActionsId(null)
                  setShowCreateRunForm((current) => {
                    if (current) {
                      resetCreateRunForm()
                    }

                    return !current
                  })
                }}
                variant="primary"
                size="sm"
              >
                + Run
              </Button>
            </div>

            <div className="runs-summary-strip" aria-label="Run summary">
              <div className="runs-summary-item">
                <span>Active</span>
                <strong>{runFilterCounts.active}</strong>
              </div>
              <div className="runs-summary-item">
                <span>Needs review</span>
                <strong>{runFilterCounts.review}</strong>
              </div>
              <div className="runs-summary-item">
                <span>Finished</span>
                <strong>{runFilterCounts.finished}</strong>
              </div>
              <div className="runs-summary-item">
                <span>Total cases</span>
                <strong>{totalRunCases}</strong>
              </div>
            </div>

            <div className="runs-cockpit-toolbar">
              <div
                className="runs-filter-list"
                role="group"
                aria-label="Filter runs"
              >
                {RUN_FILTERS.map((filter) => {
                  const isActive = activeRunFilter === filter.value

                  return (
                    <button
                      key={filter.value}
                      type="button"
                      aria-pressed={isActive}
                      className={`runs-filter-button${
                        isActive ? ' is-active' : ''
                      }`}
                      onClick={() => setActiveRunFilter(filter.value)}
                    >
                      {filter.label}
                      <strong>{runFilterCounts[filter.value]}</strong>
                    </button>
                  )
                })}
              </div>
              <Input
                value={runQuery}
                onChange={(event) => setRunQuery(event.target.value)}
                placeholder="Search runs"
                size="sm"
                aria-label="Search runs"
              />
            </div>

            {showCreateRunForm ? (
              <div className="runs-create-layer" role="presentation">
                <button
                  type="button"
                  className="runs-create-backdrop"
                  aria-label="Close create run"
                  onClick={() => {
                    setShowCreateRunForm(false)
                    resetCreateRunForm()
                  }}
                />
                <form
                  className="runs-create-drawer"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="runs-create-title"
                  onSubmit={handleCreateRun}
                >
                  <div className="runs-create-drawer__header">
                    <div className="min-w-0">
                      <div className="runs-create-drawer__eyebrow">
                        Execution
                      </div>
                      <h2 id="runs-create-title">New run</h2>
                      <p>Choose scope and create a focused execution batch.</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      aria-label="Close create run"
                      onClick={() => {
                        setShowCreateRunForm(false)
                        resetCreateRunForm()
                      }}
                    >
                      Close
                    </Button>
                  </div>

                  <div className="runs-create-drawer__body">
                    {createRunErrorMessage ? (
                      <Alert variant="danger">{createRunErrorMessage}</Alert>
                    ) : null}

                    <label className="grid gap-2 text-sm font-semibold text-[var(--tms-text)]">
                      Run name
                      <Input
                        value={runName}
                        onChange={(event) => setRunName(event.target.value)}
                        placeholder="Week 13. Regression"
                        size="md"
                        className="min-w-0"
                      />
                    </label>

                    <div>
                      <div className="runs-create-label">Scope</div>
                      <div className="runs-scope-segmented">
                        {[
                          { value: 'all', label: 'All' },
                          { value: 'suites', label: 'Suites' },
                          { value: 'cases', label: 'Cases' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`runs-scope-segment${
                              runScope === option.value ? ' is-active' : ''
                            }`}
                            aria-pressed={runScope === option.value}
                            onClick={() => {
                              setRunScope(
                                option.value as 'all' | 'suites' | 'cases',
                              )
                              setCreateRunScopeQuery('')
                              setCreateRunErrorMessage(null)
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {runScope !== 'all' ? (
                      <Input
                        value={createRunScopeQuery}
                        onChange={(event) =>
                          setCreateRunScopeQuery(event.target.value)
                        }
                        placeholder={
                          runScope === 'suites'
                            ? 'Search suites'
                            : 'Search cases'
                        }
                        size="sm"
                        aria-label={
                          runScope === 'suites'
                            ? 'Search suites'
                            : 'Search cases'
                        }
                      />
                    ) : (
                      <div className="runs-create-note">
                        All active repository cases will be included.
                      </div>
                    )}

                    {runScope === 'suites' ? (
                      <div className="runs-create-pick-list">
                        {filteredRunSuites.length === 0 ? (
                          <div className="runs-create-empty">
                            No suites found.
                          </div>
                        ) : (
                          filteredRunSuites.map((section) => {
                            const sectionCaseCount = activeTests.filter(
                              (test) => test.sectionId === section.id,
                            ).length
                            const isSelected = selectedRunSuiteIds.includes(
                              section.id,
                            )

                            return (
                              <label
                                key={section.id}
                                className={`runs-create-pick-row${
                                  isSelected ? ' is-selected' : ''
                                }`}
                              >
                                <span className="min-w-0">
                                  <span>{section.name}</span>
                                  <small>
                                    {sectionCaseCount} case
                                    {sectionCaseCount === 1 ? '' : 's'}
                                  </small>
                                </span>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() =>
                                    toggleRunSuiteSelection(section.id)
                                  }
                                />
                              </label>
                            )
                          })
                        )}
                      </div>
                    ) : null}

                    {runScope === 'cases' ? (
                      <div className="runs-create-pick-list">
                        {activeTests.length === 0 ? (
                          <div className="runs-create-empty">
                            No active cases are available.
                          </div>
                        ) : filteredRunCases.length === 0 ? (
                          <div className="runs-create-empty">
                            No cases found.
                          </div>
                        ) : (
                          filteredRunCases.map((test) => {
                            const section = dashboard.sections.find(
                              (item) => item.id === test.sectionId,
                            )

                            return (
                              <label
                                key={test.id}
                                className={`runs-create-pick-row${
                                  selectedRunTestIdSet.has(test.id)
                                    ? ' is-selected'
                                    : ''
                                }`}
                              >
                                <span className="min-w-0">
                                  <span>
                                    #{test.id} {test.title}
                                  </span>
                                  <small>
                                    {section?.name ?? 'No suite'} /{' '}
                                    {test.priority ?? 'Medium'} /{' '}
                                    {test.caseType ?? 'Functional'}
                                  </small>
                                </span>
                                <Checkbox
                                  checked={selectedRunTestIdSet.has(test.id)}
                                  onChange={() =>
                                    toggleRunCaseSelection(test.id)
                                  }
                                />
                              </label>
                            )
                          })
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="runs-create-drawer__footer">
                    <Badge>
                      {selectedRunTestIds.length} case
                      {selectedRunTestIds.length === 1 ? '' : 's'} selected
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setShowCreateRunForm(false)
                          resetCreateRunForm()
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={
                          isCreatingRun || selectedRunTestIds.length === 0
                        }
                        variant="primary"
                        size="sm"
                      >
                        {isCreatingRun ? 'Creating...' : 'Create run'}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            ) : null}

          {runActionErrorMessage ? (
            <Alert variant="danger" className="mb-5">
              {runActionErrorMessage}
            </Alert>
          ) : null}

          {filteredRunViewModels.length === 0 ? (
            <EmptyState
              title={runs.length === 0 ? 'No runs yet' : 'No runs found'}
              description={
                runs.length === 0
                  ? 'Create the first run when you are ready to execute test cases.'
                  : 'Try another search query or run filter.'
              }
            />
          ) : (
            <TableShell>
              <TableHead
                columns="minmax(340px,1fr) 180px 72px 72px 78px 78px 56px"
                minWidth="928px"
                padding="sm"
              >
                <div>Run</div>
                <div>Progress</div>
                <div>Passed</div>
                <div>Failed</div>
                <div>Blocked</div>
                <div>Not run</div>
                <div className="runs-actions-head" aria-label="Actions">
                  ...
                </div>
              </TableHead>
              {filteredRunViewModels.map((viewModel) => {
                const { run } = viewModel
                const isEditing = editingRunId === run.id
                const isPending = pendingRunId === run.id

                return (
                  <TableRow
                    key={run.id}
                    columns="minmax(340px,1fr) 180px 72px 72px 78px 78px 56px"
                    minWidth="928px"
                    padding="sm"
                    className={`runs-table-row${
                      isEditing ? '' : ' runs-table-row--interactive'
                    }`}
                    role={isEditing ? undefined : 'link'}
                    tabIndex={isEditing ? undefined : 0}
                    aria-label={
                      isEditing ? undefined : `Open run ${run.name}`
                    }
                    onClick={isEditing ? undefined : () => openRun(run.id)}
                    onKeyDown={
                      isEditing
                        ? undefined
                        : (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openRun(run.id)
                            }
                          }
                    }
                  >
                    <div className="min-w-0 pr-3">
                      {isEditing ? (
                          <form
                            className="grid gap-2 xl:grid-cols-[minmax(220px,1fr)_auto_auto]"
                            onSubmit={(event) => handleRenameRun(event, run.id)}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Input
                              value={editingRunName}
                              onChange={(event) =>
                                setEditingRunName(event.target.value)
                              }
                              size="sm"
                              className="min-w-0"
                            />
                            <Button
                              type="submit"
                              disabled={isPending}
                              variant="primary"
                              size="sm"
                            >
                              {isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              onClick={() => {
                                setEditingRunId(null)
                                setEditingRunName('')
                                setRunActionErrorMessage(null)
                              }}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <>
                            <div className="runs-run-title truncate">
                              {run.name}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--tms-text-muted)]">
                              <span>
                                #{run.id} / {run.total} cases /{' '}
                                {viewModel.executed} executed
                              </span>
                              <Badge
                                className="px-2 py-0.5"
                                variant={getRunStateBadgeVariant(
                                  viewModel.stateLabel,
                                )}
                              >
                                {viewModel.stateLabel}
                              </Badge>
                              <span className="runs-outcome">
                                {viewModel.outcomeLabel}
                              </span>
                            </div>
                          </>
                        )}
                    </div>
                    <div className="pr-4">
                      <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[var(--tms-text)]">
                        <span>{viewModel.progressLabel}</span>
                        <span className="text-xs text-[var(--tms-text-soft)]">
                          {viewModel.executed}/{run.total}
                        </span>
                      </div>
                      <div
                        className="tms-run-progress-track mt-1 flex h-1.5 overflow-hidden rounded-full"
                        aria-label={`${run.passed} passed, ${run.failed} failed, ${run.blocked} blocked, ${run.notRun} not run`}
                      >
                        <div
                          className="tms-run-progress-segment tms-run-progress-segment--passed"
                          style={{ width: `${viewModel.passedProgress}%` }}
                        />
                        <div
                          className="tms-run-progress-segment tms-run-progress-segment--failed"
                          style={{ width: `${viewModel.failedProgress}%` }}
                        />
                        <div
                          className="tms-run-progress-segment tms-run-progress-segment--blocked"
                          style={{ width: `${viewModel.blockedProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-[var(--run-passed-text)]">
                      {run.passed}
                    </div>
                    <div className="text-xs font-semibold text-[var(--run-failed-text)]">
                      {run.failed}
                    </div>
                    <div className="text-xs font-semibold text-[var(--run-blocked-text)]">
                      {run.blocked}
                    </div>
                    <div className="text-xs font-semibold text-[var(--run-not-run-text)]">
                      {run.notRun}
                    </div>
                    <div
                      className="flex justify-end whitespace-nowrap"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {!isEditing ? (
                        <PopoverMenu
                          isOpen={openRunActionsId === run.id}
                          onClose={() => {
                            setOpenRunActionsId((current) =>
                              current === run.id ? null : current,
                            )
                          }}
                          onOpenChange={(nextOpen) => {
                            setOpenRunActionsId(nextOpen ? run.id : null)
                          }}
                          className="min-w-[150px] text-left"
                          trigger={
                            <Button
                              size="sm"
                              variant="secondary"
                              aria-label={`Open actions for ${run.name}`}
                              aria-haspopup="menu"
                              aria-expanded={openRunActionsId === run.id}
                            >
                              ...
                            </Button>
                          }
                        >
                          <PopoverMenuLabel>Run</PopoverMenuLabel>
                          <Link
                            to="/run/$runId"
                            params={{ runId: run.id.toString() }}
                            className="tms-menu-item"
                          >
                            Open
                          </Link>
                          <PopoverMenuItem
                            onClick={() => {
                              setOpenRunActionsId(null)
                              startRenameRun(run.id, run.name)
                            }}
                          >
                            Rename
                          </PopoverMenuItem>
                        </PopoverMenu>
                      ) : null}
                    </div>
                  </TableRow>
                )
              })}
            </TableShell>
          )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
