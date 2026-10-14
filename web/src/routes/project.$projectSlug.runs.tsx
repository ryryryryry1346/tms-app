import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import {
  ArrowUpRight,
  Ban,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CirclePlay,
  Clock,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Search,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
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
} from '../components/ui/PopoverMenu'
import { SelectMenu } from '../components/ui/SelectMenu'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import { getDashboardState } from '../features/tests/server'
import {
  createRun,
  getRunsForProject,
  updateRunName,
} from '../features/runs/server'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

type RunStateLabel =
  | 'Passed'
  | 'Needs review'
  | 'Blocked'
  | 'In progress'
  | 'Not started'
  | 'Empty'

type RunListFilter = 'all' | 'active' | 'review' | 'finished'
type RunSortMode = 'number' | 'attention' | 'progress'
type RunTone = 'red' | 'blue' | 'green' | 'amber' | 'grey'

const RUN_STATE_META: Record<RunStateLabel, { tone: RunTone; Icon: LucideIcon }> =
  {
    Passed: { tone: 'green', Icon: CircleCheck },
    'Needs review': { tone: 'red', Icon: TriangleAlert },
    Blocked: { tone: 'amber', Icon: Ban },
    'In progress': { tone: 'blue', Icon: CirclePlay },
    'Not started': { tone: 'grey', Icon: Clock },
    Empty: { tone: 'grey', Icon: Clock },
  }

const RUN_SORT_OPTIONS: Array<{ value: RunSortMode; label: string }> = [
  { value: 'number', label: 'Sort: by number' },
  { value: 'attention', label: 'Needs attention first' },
  { value: 'progress', label: 'By progress' },
]

const RUN_TABLE_COLUMNS =
  'minmax(260px,1.5fr) 132px 172px minmax(190px,1fr) 150px 44px'
const RUN_TABLE_MIN_WIDTH = '1010px'

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
  const t = useT()

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
  const [releaseFilter, setReleaseFilter] = useState('all')
  const [sortMode, setSortMode] = useState<RunSortMode>('number')
  const [groupByRelease, setGroupByRelease] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([])
  const [openRunActionsId, setOpenRunActionsId] = useState<number | null>(null)
  const [createRunScopeQuery, setCreateRunScopeQuery] = useState('')
  const [releaseName, setReleaseName] = useState('')

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

      if (releaseFilter === '__none__') {
        if (viewModel.run.releaseName) {
          return false
        }
      } else if (releaseFilter !== 'all') {
        if (viewModel.run.releaseName !== releaseFilter) {
          return false
        }
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
  }, [activeRunFilter, releaseFilter, runQuery, runViewModels])

  const sortedRunViewModels = useMemo(() => {
    const items = [...filteredRunViewModels]

    if (sortMode === 'attention') {
      const score = (viewModel: (typeof items)[number]): number =>
        viewModel.needsReview
          ? 0
          : viewModel.stateLabel === 'In progress'
            ? 1
            : viewModel.isFinished
              ? 3
              : 2

      items.sort(
        (a, b) =>
          score(a) - score(b) ||
          b.run.failed - a.run.failed ||
          a.run.id - b.run.id,
      )
    } else if (sortMode === 'progress') {
      items.sort((a, b) => a.progress - b.progress || a.run.id - b.run.id)
    } else {
      items.sort((a, b) => a.run.id - b.run.id)
    }

    return items
  }, [filteredRunViewModels, sortMode])
  const runGroups = useMemo(() => {
    if (!groupByRelease) {
      return null
    }

    const groups = new Map<string, typeof sortedRunViewModels>()

    for (const viewModel of sortedRunViewModels) {
      const key = viewModel.run.releaseName || ''
      const items = groups.get(key)

      if (items) {
        items.push(viewModel)
      } else {
        groups.set(key, [viewModel])
      }
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
      .map(([key, items]) => {
        const total = items.reduce((sum, item) => sum + item.run.total, 0)
        const sumOf = (pick: (item: (typeof items)[number]) => number) =>
          total === 0
            ? 0
            : (items.reduce((sum, item) => sum + pick(item), 0) / total) * 100

        return {
          key,
          items,
          progress: sumOf((item) => item.executed),
          passedProgress: sumOf((item) => item.run.passed),
          failedProgress: sumOf((item) => item.run.failed),
          blockedProgress: sumOf((item) => item.run.blocked),
        }
      })
  }, [groupByRelease, sortedRunViewModels])

  const existingReleaseNames = useMemo(
    () =>
      Array.from(
        new Set<string>(
          runs
            .map((run) => run.releaseName)
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [runs],
  )

  const releaseFilterOptions = useMemo(() => {
    const names = new Set<string>()
    let hasNoRelease = false

    for (const run of runs) {
      if (run.releaseName) {
        names.add(run.releaseName)
      } else {
        hasNoRelease = true
      }
    }

    return [
      { value: 'all', label: 'All releases' },
      ...Array.from(names)
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ value: name, label: name })),
      ...(hasNoRelease
        ? [{ value: '__none__', label: 'No release' }]
        : []),
    ]
  }, [runs])
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
    setReleaseName('')
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

    const trimmedRunName = runName.trim()

    if (!trimmedRunName) {
      setCreateRunErrorMessage('Enter a run name.')
      return
    }

    if (selectedRunTestIds.length === 0) {
      setCreateRunErrorMessage('Choose at least one active test case for this run.')
      return
    }

    setIsCreatingRun(true)

    try {
      const result = await createRun({
        data: {
          projectId: project.id,
          name: trimmedRunName,
          testIds: selectedRunTestIds,
          releaseName: releaseName.trim() || undefined,
        },
      })

      resetCreateRunForm()
      setShowCreateRunForm(false)
      window.location.href = `/run/${result.id}`
    } catch (error) {
      setCreateRunErrorMessage(
        getErrorMessage(error, 'Failed to create run.'),
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
        getErrorMessage(error, 'Failed to rename run.'),
      )
    } finally {
      setPendingRunId(null)
    }
  }

  function openRun(runId: number): void {
    window.location.href = `/run/${runId}`
  }

  const isFiltering =
    activeRunFilter !== 'all' ||
    releaseFilter !== 'all' ||
    runQuery.trim().length > 0

  function resetRunFilters(): void {
    setActiveRunFilter('all')
    setReleaseFilter('all')
    setRunQuery('')
  }

  function renderProgressBar(
    passed: number,
    failed: number,
    blocked: number,
    className = '',
  ) {
    return (
      <div className={`runs-bar ${className}`.trim()}>
        <i className="runs-bar__passed" style={{ width: `${passed}%` }} />
        <i className="runs-bar__failed" style={{ width: `${failed}%` }} />
        <i className="runs-bar__blocked" style={{ width: `${blocked}%` }} />
      </div>
    )
  }

  function renderRunRow(viewModel: (typeof sortedRunViewModels)[number]) {
    const { run } = viewModel
    const isEditing = editingRunId === run.id
    const isPending = pendingRunId === run.id
    const { tone, Icon } = RUN_STATE_META[viewModel.stateLabel]
    const metaLabel =
      viewModel.executed === 0
        ? `${run.total} ${run.total === 1 ? 'case' : 'cases'} · not started`
        : `${run.total} ${run.total === 1 ? 'case' : 'cases'} · ${viewModel.executed} executed`
    const results: Array<{ key: string; value: number; label: string }> = [
      { key: 'passed', value: run.passed, label: t('Passed') },
      { key: 'failed', value: run.failed, label: t('Failed') },
      { key: 'blocked', value: run.blocked, label: t('Blocked') },
      { key: 'notRun', value: run.notRun, label: t('Not run') },
    ].filter((item) => item.value > 0)

    return (
      <TableRow
        key={run.id}
        columns={RUN_TABLE_COLUMNS}
        minWidth={RUN_TABLE_MIN_WIDTH}
        padding="sm"
        className={`runs-table-row${
          isEditing ? '' : ' runs-table-row--interactive'
        }${viewModel.needsReview ? ' runs-row--attention' : ''}`}
        role={isEditing ? undefined : 'link'}
        tabIndex={isEditing ? undefined : 0}
        aria-label={isEditing ? undefined : t('Open run {name}', { name: run.name })}
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
        <div className="runs-run-cell">
          <span className="runs-state-icon" data-tone={tone}>
            <Icon size={17} strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            {isEditing ? (
              <form
                className="grid gap-2 xl:grid-cols-[minmax(160px,1fr)_auto_auto]"
                onSubmit={(event) => handleRenameRun(event, run.id)}
                onClick={(event) => event.stopPropagation()}
              >
                <Input
                  value={editingRunName}
                  onChange={(event) => setEditingRunName(event.target.value)}
                  size="sm"
                  className="min-w-0"
                />
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="primary"
                  size="sm"
                >
                  {isPending ? t('Saving...') : t('Save')}
                </Button>
                <Button
                  onClick={() => {
                    setEditingRunId(null)
                    setEditingRunName('')
                    setRunActionErrorMessage(null)
                  }}
                  size="sm"
                >{t('Cancel')}</Button>
              </form>
            ) : (
              <>
                <div className="runs-run-title">{run.name}</div>
                <div className="runs-run-meta">
                  #{run.id} · {metaLabel}
                </div>
              </>
            )}
          </div>
        </div>
        <div>
          <span className="runs-badge" data-tone={tone}>
            {viewModel.stateLabel}
          </span>
        </div>
        <div className="min-w-0">
          {run.releaseName ? (
            <span
              className="runs-release-tag"
              title={t('Release: {releaseName}', { releaseName: run.releaseName })}
            >
              {run.releaseName}
            </span>
          ) : (
            <span className="runs-muted">—</span>
          )}
        </div>
        <div>
          <div className="runs-progress-top">
            <strong>{viewModel.progressLabel}</strong>
            <span>
              {viewModel.executed}/{run.total}
            </span>
          </div>
          <div
            aria-label={t('{passed} passed, {failed} failed, {blocked} blocked, {notRun} not run', { passed: run.passed, failed: run.failed, blocked: run.blocked, notRun: run.notRun })}
          >
            {renderProgressBar(
              viewModel.passedProgress,
              viewModel.failedProgress,
              viewModel.blockedProgress,
            )}
          </div>
        </div>
        <div className="runs-results">
          {results.length === 0 ? (
            <span className="runs-muted">{t('no results')}</span>
          ) : (
            results.map((item) => (
              <span
                key={item.key}
                className={`runs-result runs-result--${item.key}`}
                title={item.label}
              >
                {item.value}
              </span>
            ))
          )}
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
                <button
                  type="button"
                  className="case-actions-trigger"
                  aria-label={t('Open actions for {name}', { name: run.name })}
                  aria-haspopup="menu"
                  aria-expanded={openRunActionsId === run.id}
                >
                  <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                </button>
              }
            >
              <Link
                to="/run/$runId"
                params={{ runId: run.id.toString() }}
                className="tms-menu-item tms-menu-item--icon no-underline"
              >
                <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Open')}</Link>
              <PopoverMenuItem
                className="tms-menu-item--icon"
                onClick={() => {
                  setOpenRunActionsId(null)
                  startRenameRun(run.id, run.name)
                }}
              >
                <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Rename')}</PopoverMenuItem>
            </PopoverMenu>
          ) : null}
        </div>
      </TableRow>
    )
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <Panel className="runs-panel runs-cockpit-panel p-4">
            <div className="runs-cockpit-header">
              <WorkspaceSectionHeader
                dense
                title={t('Runs')}
                description={t('Test runs: readiness, progress and review.')}
                meta={
                  <>
                    <Badge>
                      {isFiltering
                        ? t('{length} of {v1} runs', { length: sortedRunViewModels.length, v1: runs.length })
                        : `${runs.length} run${runs.length === 1 ? '' : 's'}`}
                    </Badge>
                    {isFiltering ? (
                      <button
                        type="button"
                        className="runs-reset-filters"
                        onClick={resetRunFilters}
                      >{t('Reset')}</button>
                    ) : null}
                  </>
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
              >{t('+ Run')}</Button>
            </div>

            <div className="runs-stats" aria-label={t('Run summary')}>
              {(
                [
                  {
                    filter: 'active',
                    tone: 'blue',
                    label: t('Unfinished'),
                    Icon: CircleDashed,
                  },
                  {
                    filter: 'review',
                    tone: 'red',
                    label: t('Needs review'),
                    Icon: TriangleAlert,
                  },
                  {
                    filter: 'finished',
                    tone: 'green',
                    label: t('Finished'),
                    Icon: CircleCheck,
                  },
                ] as const
              ).map((card) => {
                const isActive = activeRunFilter === card.filter

                return (
                  <button
                    key={card.filter}
                    type="button"
                    className={`runs-stat${isActive ? ' is-active' : ''}`}
                    data-tone={card.tone}
                    aria-pressed={isActive}
                    onClick={() =>
                      setActiveRunFilter(isActive ? 'all' : card.filter)
                    }
                  >
                    <span className="runs-stat__icon">
                      <card.Icon size={19} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span className="runs-stat__label">{card.label}</span>
                    <span className="runs-stat__value">
                      {runFilterCounts[card.filter]}
                    </span>
                  </button>
                )
              })}
              <div className="runs-stat runs-stat--static" data-tone="grey">
                <span className="runs-stat__icon">
                  <ListChecks size={19} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="runs-stat__label">{t('Total cases')}</span>
                <span className="runs-stat__value">{totalRunCases}</span>
              </div>
            </div>

            <div className="runs-toolbar">
              <div className="runs-search">
                <Search size={16} strokeWidth={2} aria-hidden="true" />
                <Input
                  value={runQuery}
                  onChange={(event) => setRunQuery(event.target.value)}
                  placeholder={t('Search by title, number or release')}
                  size="sm"
                  aria-label={t('Search runs')}
                />
              </div>
              {releaseFilterOptions.length > 1 ? (
                <SelectMenu
                  value={releaseFilter}
                  onValueChange={setReleaseFilter}
                  options={releaseFilterOptions}
                  className="runs-toolbar__select"
                  aria-label={t('Filter by release')}
                />
              ) : null}
              <SelectMenu
                value={sortMode}
                onValueChange={(value) => setSortMode(value as RunSortMode)}
                options={RUN_SORT_OPTIONS}
                className="runs-toolbar__select"
                aria-label={t('Sort runs')}
              />
              <button
                type="button"
                role="switch"
                aria-checked={groupByRelease}
                className={`runs-switch${groupByRelease ? ' is-on' : ''}`}
                onClick={() => setGroupByRelease((current) => !current)}
              >
                <span className="runs-switch__track" aria-hidden="true" />{t('Group by release')}</button>
            </div>

            {showCreateRunForm ? (
              <div className="runs-create-layer" role="presentation">
                <button
                  type="button"
                  className="runs-create-backdrop"
                  aria-label={t('Close create run')}
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
                      <div className="runs-create-drawer__eyebrow">{t('Execution')}</div>
                      <h2 id="runs-create-title">{t('New run')}</h2>
                      <p>{t('Choose scope and create a focused execution batch.')}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      aria-label={t('Close create run')}
                      onClick={() => {
                        setShowCreateRunForm(false)
                        resetCreateRunForm()
                      }}
                    >{t('Close')}</Button>
                  </div>

                  <div className="runs-create-drawer__body">
                    {createRunErrorMessage ? (
                      <Alert variant="danger">{createRunErrorMessage}</Alert>
                    ) : null}

                    <label className="grid gap-2 text-sm font-semibold text-[var(--tms-text)]">{t('Run name')}<Input
                        value={runName}
                        onChange={(event) => setRunName(event.target.value)}
                        placeholder={t('Week 13. Regression')}
                        size="md"
                        className="min-w-0"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-semibold text-[var(--tms-text)]">{t('Release')}<Input
                        value={releaseName}
                        onChange={(event) => setReleaseName(event.target.value)}
                        placeholder={t('Optional, e.g. 2.4.0')}
                        size="md"
                        className="min-w-0"
                        maxLength={255}
                        list="runs-release-suggestions"
                      />
                      <datalist id="runs-release-suggestions">
                        {existingReleaseNames.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </label>

                    <div>
                      <div className="runs-create-label">{t('Scope')}</div>
                      <div className="runs-scope-segmented">
                        {[
                          { value: 'all', label: t('All') },
                          { value: 'suites', label: t('Suites') },
                          { value: 'cases', label: t('Cases') },
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
                            ? t('Search suites')
                            : t('Search cases')
                        }
                        size="sm"
                        aria-label={
                          runScope === 'suites'
                            ? t('Search suites')
                            : t('Search cases')
                        }
                      />
                    ) : (
                      <div className="runs-create-note">{t('All active repository cases will be included.')}</div>
                    )}

                    {runScope === 'suites' ? (
                      <div className="runs-create-pick-list">
                        {filteredRunSuites.length === 0 ? (
                          <div className="runs-create-empty">{t('No suites found.')}</div>
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
                                    {sectionCaseCount}{' '}{t('case')}{sectionCaseCount === 1 ? '' : 's'}
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
                          <div className="runs-create-empty">{t('No active cases are available.')}</div>
                        ) : filteredRunCases.length === 0 ? (
                          <div className="runs-create-empty">{t('No cases found.')}</div>
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
                                    {section?.name ?? t('No suite')} /{' '}
                                    {test.priority ?? t('Medium')} /{' '}
                                    {test.caseType ?? t('Functional')}
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
                      {selectedRunTestIds.length}{' '}{t('case')}{selectedRunTestIds.length === 1 ? '' : 's'}{' '}{t('selected')}</Badge>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setShowCreateRunForm(false)
                          resetCreateRunForm()
                        }}
                      >{t('Cancel')}</Button>
                      <Button
                        type="submit"
                        disabled={
                          isCreatingRun || selectedRunTestIds.length === 0
                        }
                        variant="primary"
                        size="sm"
                      >
                        {isCreatingRun ? t('Creating...') : t('Create run')}
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

          {sortedRunViewModels.length === 0 ? (
            <EmptyState
              title={runs.length === 0 ? t('No runs yet') : t('No runs found')}
              description={
                runs.length === 0
                  ? t('Create the first run when you are ready to execute test cases.')
                  : t('Try another search query or run filter.')
              }
            />
          ) : (
            <TableShell className="runs-table">
              <TableHead
                columns={RUN_TABLE_COLUMNS}
                minWidth={RUN_TABLE_MIN_WIDTH}
                padding="sm"
              >
                <div>{t('Run')}</div>
                <div>{t('Status')}</div>
                <div>{t('Release')}</div>
                <div>{t('Progress')}</div>
                <div>{t('Results')}</div>
                <div className="runs-actions-head" aria-label={t('Actions')} />
              </TableHead>
              {runGroups
                ? runGroups.map((group) => {
                    const isCollapsed = collapsedGroups.includes(group.key)

                    return (
                      <div key={group.key || '__none__'}>
                        <button
                          type="button"
                          className="runs-group"
                          style={{ minWidth: RUN_TABLE_MIN_WIDTH }}
                          aria-expanded={!isCollapsed}
                          onClick={() =>
                            setCollapsedGroups((current) =>
                              current.includes(group.key)
                                ? current.filter((key) => key !== group.key)
                                : [...current, group.key],
                            )
                          }
                        >
                          <ChevronDown
                            className={`runs-group__chevron${
                              isCollapsed ? ' is-collapsed' : ''
                            }`}
                            size={14}
                            aria-hidden="true"
                          />
                          {group.key ? (
                            <span className="runs-release-tag">{group.key}</span>
                          ) : (
                            <span className="runs-group__title">{t('No release')}</span>
                          )}
                          <span className="runs-group__count">
                            {group.items.length}{' '}
                            {group.items.length === 1 ? 'run' : 'runs'}
                          </span>
                          <span className="runs-group__progress">
                            <span>{Math.round(group.progress)}%</span>
                            {renderProgressBar(
                              group.passedProgress,
                              group.failedProgress,
                              group.blockedProgress,
                              'runs-bar--thin',
                            )}
                          </span>
                        </button>
                        {isCollapsed ? null : group.items.map(renderRunRow)}
                      </div>
                    )
                  })
                : sortedRunViewModels.map(renderRunRow)}
            </TableShell>
          )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
