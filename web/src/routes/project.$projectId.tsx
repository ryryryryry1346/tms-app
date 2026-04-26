import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  createSuite,
  deleteSuite,
  updateSuite,
} from '../features/projects/server'
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

type ComposerKind = 'suite' | 'run' | null
type CaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'
const ALL_SUITES_FILTER = 'all'

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

  const [editingSuiteId, setEditingSuiteId] = useState<number | null>(null)
  const [editingSuiteName, setEditingSuiteName] = useState('')
  const [suiteActionErrorMessage, setSuiteActionErrorMessage] = useState<
    string | null
  >(null)
  const [suiteActionSuiteId, setSuiteActionSuiteId] = useState<number | null>(
    null,
  )
  const [pendingSuiteActionById, setPendingSuiteActionById] = useState<
    Record<number, boolean>
  >({})
  const [deleteConfirmSuiteId, setDeleteConfirmSuiteId] = useState<number | null>(
    null,
  )
  const [collapsedSuiteById, setCollapsedSuiteById] = useState<
    Record<number, boolean>
  >({})
  const [activeComposer, setActiveComposer] = useState<ComposerKind>(null)
  const [searchValue, setSearchValue] = useState('')
  const [caseFilter, setCaseFilter] = useState<CaseFilter>('All')
  const [suiteFilterId, setSuiteFilterId] = useState<string>(ALL_SUITES_FILTER)

  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const filteredLifecycleTests = dashboard.tests.filter((test) => {
    if (caseFilter === 'All') {
      return test.status !== 'Archived'
    }

    if (caseFilter === 'Archived') {
      return test.status === 'Archived'
    }

    return test.status === caseFilter
  })
  const totalCases =
    caseFilter === 'All' ? activeTests.length : filteredLifecycleTests.length
  const totalSuites = dashboard.sections.length
  const readyCases = activeTests.filter((test) => test.status === 'Ready').length

  const normalizedSearch = searchValue.trim().toLowerCase()

  const filteredSections = useMemo(() => {
    return dashboard.sections
      .map((section) => {
        if (
          suiteFilterId !== ALL_SUITES_FILTER &&
          String(section.id) !== suiteFilterId
        ) {
          return null
        }

        const sectionTests = filteredLifecycleTests.filter(
          (test) => test.sectionId === section.id,
        )
        const matchingTests =
          normalizedSearch.length === 0
            ? sectionTests
            : sectionTests.filter((test) => {
                const title = test.title.toLowerCase()
                const id = String(test.id)
                const suiteName = section.name.toLowerCase()

                return (
                  title.includes(normalizedSearch) ||
                  id.includes(normalizedSearch) ||
                  suiteName.includes(normalizedSearch)
                )
              })

        if (
          normalizedSearch.length > 0 &&
          !section.name.toLowerCase().includes(normalizedSearch) &&
          matchingTests.length === 0
        ) {
          return null
        }

        return {
          section,
          sectionTests,
          visibleTests:
            normalizedSearch.length > 0 &&
            section.name.toLowerCase().includes(normalizedSearch)
              ? sectionTests
              : matchingTests,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, [
    dashboard.sections,
    filteredLifecycleTests,
    normalizedSearch,
    suiteFilterId,
  ])

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
      setSuiteErrorMessage(
        error instanceof Error ? error.message : 'Failed to create suite.',
      )
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
      setRunErrorMessage(
        error instanceof Error ? error.message : 'Failed to create run.',
      )
    } finally {
      setIsSubmittingRun(false)
    }
  }

  function startRenameSuite(suiteId: number, currentName: string): void {
    setSuiteActionErrorMessage(null)
    setSuiteActionSuiteId(suiteId)
    setDeleteConfirmSuiteId((current) => (current === suiteId ? null : current))
    setEditingSuiteId(suiteId)
    setEditingSuiteName(currentName)
  }

  function toggleSuiteCollapsed(suiteId: number): void {
    setCollapsedSuiteById((current) => ({
      ...current,
      [suiteId]: !current[suiteId],
    }))
  }

  async function handleRenameSuite(
    event: React.FormEvent<HTMLFormElement>,
    suiteId: number,
  ): Promise<void> {
    event.preventDefault()
    setSuiteActionErrorMessage(null)
    setSuiteActionSuiteId(suiteId)
    setPendingSuiteActionById((current) => ({
      ...current,
      [suiteId]: true,
    }))

    try {
      await updateSuite({
        data: {
          suiteId,
          name: editingSuiteName,
        },
      })

      setEditingSuiteId(null)
      setEditingSuiteName('')
      setSuiteActionSuiteId(null)
      await router.invalidate()
    } catch (error) {
      setSuiteActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to rename suite.',
      )
    } finally {
      setPendingSuiteActionById((current) => {
        const nextState = { ...current }
        delete nextState[suiteId]
        return nextState
      })
    }
  }

  async function handleDeleteSuite(suiteId: number): Promise<void> {
    setSuiteActionErrorMessage(null)
    setSuiteActionSuiteId(suiteId)
    setPendingSuiteActionById((current) => ({
      ...current,
      [suiteId]: true,
    }))

    try {
      await deleteSuite({
        data: {
          suiteId,
        },
      })

      if (editingSuiteId === suiteId) {
        setEditingSuiteId(null)
        setEditingSuiteName('')
      }

      setDeleteConfirmSuiteId(null)
      setSuiteActionSuiteId(null)
      await router.invalidate()
    } catch (error) {
      setSuiteActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to delete suite.',
      )
    } finally {
      setPendingSuiteActionById((current) => {
        const nextState = { ...current }
        delete nextState[suiteId]
        return nextState
      })
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
                <span>Project</span>
              </div>
              <h1 className="m-0 text-5xl font-bold tracking-tight text-[#1b2f5b]">
                {project.name}
              </h1>
              <p className="mt-3 text-lg text-[#63759a]">
                Work with suites, cases, and execution runs for this project.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveComposer((current) => (current === 'suite' ? null : 'suite'))
                }
                className="rounded-2xl border border-[#9dbaf7] bg-white px-7 py-3 text-base font-semibold text-[#2f6fe4]"
              >
                + Suite
              </button>
              <Link
                to="/create-test"
                search={{ projectId: project.id }}
                className="rounded-2xl border border-[#9dbaf7] bg-white px-7 py-3 text-base font-semibold no-underline text-[#2f6fe4]"
              >
                + Test case
              </Link>
              <button
                type="button"
                onClick={() =>
                  setActiveComposer((current) => (current === 'run' ? null : 'run'))
                }
                className="rounded-2xl border border-[#2f6fe4] bg-[#2f6fe4] px-7 py-3 text-base font-semibold text-white"
              >
                + Run
              </button>
            </div>
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Suites', value: totalSuites, tone: 'text-[#2f6fe4]' },
              { label: 'Cases', value: totalCases, tone: 'text-[#2f6fe4]' },
              { label: 'Ready', value: readyCases, tone: 'text-[#2ea66b]' },
              { label: 'Runs', value: runs.length, tone: 'text-[#d05656]' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-[#e6ecf8] bg-white px-7 py-6 shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f7ff] text-xl font-bold ${item.tone}`}
                  >
                    0
                  </div>
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[#7686a7]">
                      {item.label}
                    </div>
                    <div className="mt-1 text-4xl font-semibold text-[#1b2f5b]">
                      {item.value}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="mb-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div />
            <section
              id="project-runs"
              className="rounded-3xl border border-[#e6ecf8] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="m-0 text-xl font-semibold text-[#1b2f5b]">
                  Recent runs
                </h2>
                <span className="text-sm text-[#63759a]">
                  {runs.length} run{runs.length === 1 ? '' : 's'}
                </span>
              </div>

              {runs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-4 text-sm text-[#63759a]">
                  No runs yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {runs.slice(0, 3).map((run) => (
                    <Link
                      key={run.id}
                      to="/run/$runId"
                      params={{ runId: run.id.toString() }}
                      className="rounded-2xl border border-[#dbe4f4] bg-[#fbfcff] px-4 py-3 no-underline text-[#1b2f5b] hover:text-[#2f6fe4]"
                    >
                      <div className="text-sm font-semibold">{run.name}</div>
                      <div className="mt-1 text-xs text-[#63759a]">
                        Run ID: {run.id}
                      </div>
                    </Link>
                  ))}
                  {runs.length > 3 ? (
                    <div className="text-xs text-[#63759a]">
                      Showing 3 of {runs.length} runs.
                    </div>
                  ) : null}
                </div>
              )}
            </section>
          </section>

          {activeComposer ? (
            <section className="mb-8 rounded-3xl border border-[#e6ecf8] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
              {activeComposer === 'suite' ? (
                <form
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"
                  onSubmit={handleCreateSuite}
                >
                  <div className="md:col-span-2 text-xl font-semibold text-[#1b2f5b]">
                    Create suite
                  </div>
                  <input
                    value={suiteName}
                    onChange={(event) => setSuiteName(event.target.value)}
                    className="rounded-2xl border border-[#d9e2f2] bg-white px-4 py-3 text-base outline-none transition focus:border-[#2f6fe4]"
                    placeholder="Checkout smoke"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingSuite || !dashboard.databaseConfigured}
                    className="rounded-2xl border border-[#9fd2ca] bg-[#dff5f1] px-4 py-3 text-sm font-semibold text-[#1b8b84] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmittingSuite ? 'Creating...' : 'Create suite'}
                  </button>
                  {suiteErrorMessage ? (
                    <div className="md:col-span-2 rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      {suiteErrorMessage}
                    </div>
                  ) : null}
                </form>
              ) : (
                <form
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"
                  onSubmit={handleCreateRun}
                >
                  <div className="md:col-span-2 text-xl font-semibold text-[#1b2f5b]">
                    Create run
                  </div>
                  <input
                    value={runName}
                    onChange={(event) => setRunName(event.target.value)}
                    className="rounded-2xl border border-[#d9e2f2] bg-white px-4 py-3 text-base outline-none transition focus:border-[#2f6fe4]"
                    placeholder="Regression 2026-04-25"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingRun || !dashboard.databaseConfigured}
                    className="rounded-2xl border border-[#2f6fe4] bg-[#2f6fe4] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {isSubmittingRun ? 'Creating...' : 'Create run'}
                  </button>
                  {runErrorMessage ? (
                    <div className="md:col-span-2 rounded-2xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                      {runErrorMessage}
                    </div>
                  ) : null}
                </form>
              )}
            </section>
          ) : null}

          <section
            id="project-suites"
            className="rounded-3xl border border-[#e6ecf8] bg-white px-6 py-6 shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
          >
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">
                Test suites and cases
              </h2>
              <div className="flex items-center gap-3">
                <label className="flex min-w-[290px] items-center gap-3 rounded-2xl border border-[#dbe4f4] bg-white px-4 py-3 text-sm text-[#6d7d9e]">
                  <span>Q</span>
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search cases..."
                    className="w-full border-0 bg-transparent p-0 text-base outline-none"
                  />
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-[#dbe4f4] bg-white px-4 py-3 text-sm text-[#6d7d9e]">
                  <span>Suite</span>
                  <select
                    value={suiteFilterId}
                    onChange={(event) => setSuiteFilterId(event.target.value)}
                    className="min-w-[180px] border-0 bg-transparent p-0 text-base text-[#1b2f5b] outline-none"
                  >
                    <option value={ALL_SUITES_FILTER}>All suites</option>
                    {dashboard.sections.map((section) => (
                      <option key={section.id} value={section.id.toString()}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['All', 'Ready', 'Draft', 'Archived'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setCaseFilter(filter)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        caseFilter === filter
                          ? filter === 'Archived'
                            ? 'border-amber-300 bg-amber-50 text-amber-900'
                            : 'border-[#b7cdfa] bg-[#ecf2ff] text-[#2f6fe4]'
                          : 'border-[#dbe4f4] bg-white text-[#60718f]'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {dashboard.sections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-6 text-sm text-[#63759a]">
                This project does not have test suites yet.
              </div>
            ) : filteredSections.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-6 text-sm text-[#63759a]">
                {caseFilter === 'All'
                  ? 'No test cases match the current search and suite filters.'
                  : caseFilter === 'Archived'
                    ? 'No archived test cases match the current search and suite filters.'
                    : `No ${caseFilter.toLowerCase()} test cases match the current search and suite filters.`}
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredSections.map(({ section, sectionTests, visibleTests }) => {
                  const isEditingSuite = editingSuiteId === section.id
                  const isDeleteConfirming = deleteConfirmSuiteId === section.id
                  const isCollapsed = Boolean(collapsedSuiteById[section.id])
                  const isPendingSuiteAction = Boolean(
                    pendingSuiteActionById[section.id],
                  )
                  const readyCount = sectionTests.filter(
                    (test) => test.status === 'Ready',
                  ).length
                  const draftCount = sectionTests.length - readyCount

                  return (
                    <section
                      key={section.id}
                      className="overflow-hidden rounded-3xl border border-[#dfe6f4]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9eef8] bg-[#fbfcff] px-5 py-5">
                        <div className="flex min-w-0 items-center gap-4">
                          <button
                            type="button"
                            onClick={() => toggleSuiteCollapsed(section.id)}
                            className="rounded-lg px-2 py-1 text-sm font-semibold text-[#506487]"
                            aria-label={isCollapsed ? 'Expand suite' : 'Collapse suite'}
                          >
                            {isCollapsed ? '>' : 'v'}
                          </button>
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dbe4f4] bg-white text-[#506487]">
                            []
                          </div>
                          <div className="min-w-0">
                            {isEditingSuite ? (
                              <form
                                className="flex flex-wrap items-center gap-2"
                                onSubmit={(event) =>
                                  handleRenameSuite(event, section.id)
                                }
                              >
                                <input
                                  value={editingSuiteName}
                                  onChange={(event) =>
                                    setEditingSuiteName(event.target.value)
                                  }
                                  className="min-w-[220px] rounded-xl border border-[#d9e2f2] bg-white px-3 py-2 text-base font-semibold text-[#1b2f5b] outline-none transition focus:border-[#2f6fe4]"
                                />
                                <button
                                  type="submit"
                                  disabled={isPendingSuiteAction}
                                  className="rounded-xl border border-[#2f6fe4] bg-[#2f6fe4] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                                >
                                  {isPendingSuiteAction ? 'Saving...' : 'Save'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSuiteId(null)
                                    setEditingSuiteName('')
                                    setSuiteActionErrorMessage(null)
                                  }}
                                  className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                                >
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="text-2xl font-semibold text-[#1b2f5b]">
                                  {section.name}
                                </div>
                                <div className="text-sm text-[#7f8da9]">
                                  {sectionTests.length} case
                                  {sectionTests.length === 1 ? '' : 's'}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-[#60718f]">
                            Ready {readyCount}
                          </span>
                          <span className="rounded-full bg-[#f3f5f9] px-3 py-1 text-xs font-semibold text-[#60718f]">
                            Draft {draftCount}
                          </span>
                          <Link
                            to="/create-test"
                            search={{ suiteId: section.id, projectId: project.id }}
                            className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#3369d6]"
                          >
                            Create test case
                          </Link>
                          {!isEditingSuite ? (
                            <button
                              type="button"
                              disabled={isPendingSuiteAction}
                              onClick={() => startRenameSuite(section.id, section.name)}
                              className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                            >
                              Rename
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={isPendingSuiteAction}
                            onClick={() => {
                              setSuiteActionErrorMessage(null)
                              setSuiteActionSuiteId(section.id)
                              setDeleteConfirmSuiteId((current) =>
                                current === section.id ? null : section.id,
                              )
                            }}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isDeleteConfirming ? (
                        <div className="border-b border-[#e9eef8] bg-amber-50 px-5 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-sm text-amber-950">
                              Delete this suite? This only works when the suite has no
                              test cases.
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={isPendingSuiteAction}
                                onClick={() => handleDeleteSuite(section.id)}
                                className="rounded-xl border border-rose-200 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700"
                              >
                                Confirm delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmSuiteId(null)}
                                className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {suiteActionErrorMessage && suiteActionSuiteId === section.id ? (
                        <div className="border-b border-[#e9eef8] bg-rose-50 px-5 py-3 text-sm text-rose-900">
                          {suiteActionErrorMessage}
                        </div>
                      ) : null}

                      {isCollapsed ? null : visibleTests.length === 0 ? (
                        <div className="bg-white px-5 py-5 text-sm text-[#63759a]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span>No test cases in this suite yet.</span>
                            <Link
                              to="/create-test"
                              search={{ suiteId: section.id, projectId: project.id }}
                              className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#3369d6]"
                            >
                              Create test case
                            </Link>
                          </div>
                        </div>
                      ) : (
                        visibleTests.map((test) => {
                          const isReady = test.status === 'Ready'

                          return (
                            <article
                              key={test.id}
                              className="grid grid-cols-[4px_minmax(0,1fr)] border-t border-[#e9eef8] bg-white"
                            >
                              <div
                                className={isReady ? 'bg-emerald-400' : 'bg-rose-400'}
                              />
                              <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-5">
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
                                      className="block min-w-0 truncate text-xl font-semibold no-underline text-[#1b2f5b] hover:text-[#2f6fe4]"
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
                                  <Link
                                    to="/test/$testId"
                                    params={{ testId: test.id.toString() }}
                                    className="text-sm font-semibold no-underline text-[#60718f] hover:text-[#2f6fe4]"
                                  >
                                    Open
                                  </Link>
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

        
      </div>
    </main>
  )
}
