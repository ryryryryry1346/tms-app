import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import {
  createSuite,
  deleteSuite,
  updateSuite,
} from '../features/projects/server'
import {
  archiveTestCase,
  bulkDeleteArchivedTestCases,
  bulkRestoreTestCases,
  bulkUpdateTestStatus,
  deleteArchivedTestCase,
  getDashboardState,
  restoreTestCase,
} from '../features/tests/server'

export const Route = createFileRoute('/project/$projectSlug/repository')({
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
          to: '/project/$projectSlug/repository',
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

    return {
      project,
      dashboard,
    }
  },
  component: ProjectRepositoryPage,
})

type ComposerKind = 'suite' | null
type CaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'
const ALL_SUITES_FILTER = 'all'

function ChevronRightIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 6 8 10.5 12.5 6" />
    </svg>
  )
}

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
        ? 'bg-[#ecf2ff] text-[#2f6fe4]'
        : 'text-[#60718f] hover:bg-[#f5f8ff]'
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

function ProjectRepositoryPage() {
  const loaderData = Route.useLoaderData()
  const { project, dashboard } = loaderData
  const router = useRouter()

  const [suiteName, setSuiteName] = useState('')
  const [suiteErrorMessage, setSuiteErrorMessage] = useState<string | null>(null)
  const [isSubmittingSuite, setIsSubmittingSuite] = useState(false)

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
  const [openSuiteMenuId, setOpenSuiteMenuId] = useState<number | null>(null)
  const [collapsedSuiteById, setCollapsedSuiteById] = useState<
    Record<number, boolean>
  >({})
  const [selectedSuiteIds, setSelectedSuiteIds] = useState<number[]>([])
  const [activeComposer, setActiveComposer] = useState<ComposerKind>(null)
  const [searchValue, setSearchValue] = useState('')
  const [caseFilter, setCaseFilter] = useState<CaseFilter>('All')
  const [suiteFilterId, setSuiteFilterId] = useState<string>(ALL_SUITES_FILTER)
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([])
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false)
  const [bulkActionErrorMessage, setBulkActionErrorMessage] = useState<string | null>(
    null,
  )
  const [openCaseMenuId, setOpenCaseMenuId] = useState<number | null>(null)
  const [pendingCaseActionId, setPendingCaseActionId] = useState<number | null>(null)
  const [caseActionErrorMessage, setCaseActionErrorMessage] = useState<
    string | null
  >(null)

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
  const archivedCases = dashboard.tests.filter(
    (test) => test.status === 'Archived',
  ).length

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

  const selectedTestIdSet = useMemo(
    () => new Set(selectedTestIds),
    [selectedTestIds],
  )
  const selectedSuiteIdSet = useMemo(
    () => new Set(selectedSuiteIds),
    [selectedSuiteIds],
  )

  function toggleTestSelection(testId: number): void {
    setBulkActionErrorMessage(null)
    setSelectedTestIds((current) =>
      current.includes(testId)
        ? current.filter((id) => id !== testId)
        : [...current, testId],
    )
  }

  function toggleSuiteSelection(testIds: number[]): void {
    if (testIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setSelectedTestIds((current) => {
      const allSelected = testIds.every((id) => current.includes(id))

      if (allSelected) {
        return current.filter((id) => !testIds.includes(id))
      }

      return Array.from(new Set([...current, ...testIds]))
    })
  }

  async function handleBulkStatusChange(
    status: 'Draft' | 'Ready' | 'Archived',
  ): Promise<void> {
    if (selectedTestIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsApplyingBulkAction(true)

    try {
      await bulkUpdateTestStatus({
        data: {
          ids: selectedTestIds,
          status,
        },
      })

      setSelectedTestIds([])
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update selected test cases.',
      )
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  async function handleBulkRestore(): Promise<void> {
    if (selectedTestIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsApplyingBulkAction(true)

    try {
      await bulkRestoreTestCases({
        data: {
          ids: selectedTestIds,
        },
      })

      setSelectedTestIds([])
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to restore selected test cases.',
      )
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  async function handleBulkDeleteArchived(): Promise<void> {
    if (selectedTestIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsApplyingBulkAction(true)

    try {
      await bulkDeleteArchivedTestCases({
        data: {
          ids: selectedTestIds,
        },
      })

      setSelectedTestIds([])
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to delete selected test cases permanently.',
      )
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  async function handleCaseArchive(testId: number): Promise<void> {
    setCaseActionErrorMessage(null)
    setPendingCaseActionId(testId)

    try {
      await archiveTestCase({
        data: {
          id: testId,
        },
      })

      setOpenCaseMenuId(null)
      setSelectedTestIds((current) => current.filter((id) => id !== testId))
      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to archive test case.',
      )
    } finally {
      setPendingCaseActionId(null)
    }
  }

  async function handleCaseRestore(testId: number): Promise<void> {
    setCaseActionErrorMessage(null)
    setPendingCaseActionId(testId)

    try {
      await restoreTestCase({
        data: {
          id: testId,
        },
      })

      setOpenCaseMenuId(null)
      setSelectedTestIds((current) => current.filter((id) => id !== testId))
      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to restore test case.',
      )
    } finally {
      setPendingCaseActionId(null)
    }
  }

  async function handleCaseDeletePermanently(testId: number): Promise<void> {
    setCaseActionErrorMessage(null)
    setPendingCaseActionId(testId)

    try {
      await deleteArchivedTestCase({
        data: {
          id: testId,
        },
      })

      setOpenCaseMenuId(null)
      setSelectedTestIds((current) => current.filter((id) => id !== testId))
      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to delete test case permanently.',
      )
    } finally {
      setPendingCaseActionId(null)
    }
  }

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

  function startRenameSuite(suiteId: number, currentName: string): void {
    setSuiteActionErrorMessage(null)
    setSuiteActionSuiteId(suiteId)
    setDeleteConfirmSuiteId((current) => (current === suiteId ? null : current))
    setEditingSuiteId(suiteId)
    setEditingSuiteName(currentName)
    setOpenSuiteMenuId(null)
  }

  function toggleSuiteCollapsed(suiteId: number): void {
    setCollapsedSuiteById((current) => ({
      ...current,
      [suiteId]: !current[suiteId],
    }))
  }

  function toggleSuiteBulkSelection(suiteId: number): void {
    setSuiteActionErrorMessage(null)
    setSelectedSuiteIds((current) =>
      current.includes(suiteId)
        ? current.filter((id) => id !== suiteId)
        : [...current, suiteId],
    )
  }

  function clearSuiteSelection(): void {
    setSelectedSuiteIds([])
  }

  function handleCollapseSelectedSuites(): void {
    if (selectedSuiteIds.length === 0) {
      return
    }

    setCollapsedSuiteById((current) => {
      const nextState = { ...current }
      for (const suiteId of selectedSuiteIds) {
        nextState[suiteId] = true
      }
      return nextState
    })
  }

  function handleExpandSelectedSuites(): void {
    if (selectedSuiteIds.length === 0) {
      return
    }

    setCollapsedSuiteById((current) => {
      const nextState = { ...current }
      for (const suiteId of selectedSuiteIds) {
        nextState[suiteId] = false
      }
      return nextState
    })
  }

  async function handleDeleteSelectedSuites(): Promise<void> {
    if (selectedSuiteIds.length === 0) {
      return
    }

    setSuiteActionErrorMessage(null)
    setSuiteActionSuiteId(null)

    const nextPending: Record<number, boolean> = {}
    for (const suiteId of selectedSuiteIds) {
      nextPending[suiteId] = true
    }
    setPendingSuiteActionById((current) => ({
      ...current,
      ...nextPending,
    }))

    try {
      for (const suiteId of selectedSuiteIds) {
        await deleteSuite({
          data: {
            suiteId,
          },
        })
      }

      setSelectedSuiteIds([])
      await router.invalidate()
    } catch (error) {
      setSuiteActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to delete selected suites.',
      )
    } finally {
      setPendingSuiteActionById((current) => {
        const nextState = { ...current }
        for (const suiteId of selectedSuiteIds) {
          delete nextState[suiteId]
        }
        return nextState
      })
    }
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
      setOpenSuiteMenuId(null)
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
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10">
          <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="mb-2 flex items-center gap-3 text-sm text-[#6d7d9e]">
                <Link to="/" className="no-underline text-[#6d7d9e]">
                  Workspace
                </Link>
                <span>/</span>
                <span>Project</span>
              </div>
              <h1 className="m-0 text-4xl font-bold tracking-tight text-[#1b2f5b] md:text-5xl">
                {project.name}
              </h1>
              <p className="mt-2 text-base text-[#63759a] md:text-lg">
                Browse suites, test cases, filters, and bulk repository actions.
              </p>
              <div className="mt-4">
                <ProjectSubnav
                  projectSlug={project.slug ?? project.id.toString()}
                  active="repository"
                />
              </div>
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
            </div>
          </section>

          <section className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            {[
              { label: 'Suites', value: totalSuites },
              { label: 'Cases', value: activeTests.length },
              { label: 'Ready', value: readyCases },
              { label: 'Archived', value: archivedCases },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-full border border-[#dfe6f4] bg-white px-3 py-1.5 font-semibold text-[#60718f]"
              >
                <span className="text-[#1b2f5b]">{item.value}</span> {item.label}
              </div>
            ))}
          </section>

          {activeComposer ? (
            <section className="mb-6 rounded-3xl border border-[#e6ecf8] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
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
            </section>
          ) : null}

            <section
              id="project-suites"
              className="overflow-hidden rounded-3xl border border-[#e6ecf8] bg-white shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
            >
            <div className="sticky top-[65px] z-20 border-b border-[#e6ecf8] bg-white/95 px-5 py-3 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 text-xl font-semibold text-[#1b2f5b]">
                    Test suites and cases
                  </h2>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                    {filteredLifecycleTests.length} visible cases
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                <label className="flex min-w-[260px] items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
                  <span className="font-semibold">Search</span>
                  <input
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                    placeholder="Search cases..."
                    className="w-full border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
                  <span className="font-semibold">Suite</span>
                  <select
                    value={suiteFilterId}
                    onChange={(event) => setSuiteFilterId(event.target.value)}
                    className="min-w-[160px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
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
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
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
            </div>

            {selectedSuiteIds.length > 0 ? (
              <div className="mx-5 mt-4 rounded-2xl border border-[#dbe4f4] bg-[#f8fbff] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[#1b2f5b]">
                    {selectedSuiteIds.length} suite
                    {selectedSuiteIds.length === 1 ? '' : 's'} selected
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExpandSelectedSuites}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                    >
                      Expand
                    </button>
                    <button
                      type="button"
                      onClick={handleCollapseSelectedSuites}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                    >
                      Collapse
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedSuites}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700"
                    >
                      Delete empty suites
                    </button>
                    <button
                      type="button"
                      onClick={clearSuiteSelection}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedTestIds.length > 0 ? (
              <div className="mx-5 mt-4 rounded-2xl border border-[#dbe4f4] bg-[#f8fbff] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[#1b2f5b]">
                    {selectedTestIds.length} selected
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {caseFilter === 'Archived' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleBulkRestore}
                          disabled={isApplyingBulkAction}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkDeleteArchived}
                          disabled={isApplyingBulkAction}
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Delete permanently
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange('Ready')}
                          disabled={isApplyingBulkAction}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Mark Ready
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange('Draft')}
                          disabled={isApplyingBulkAction}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Mark Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBulkStatusChange('Archived')}
                          disabled={isApplyingBulkAction}
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Archive
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTestIds([])}
                      disabled={isApplyingBulkAction}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                {bulkActionErrorMessage ? (
                  <div className="mt-3 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                    {bulkActionErrorMessage}
                  </div>
                ) : null}
              </div>
            ) : null}

            {caseActionErrorMessage ? (
              <div className="mx-5 mt-4 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                {caseActionErrorMessage}
              </div>
            ) : null}

            {dashboard.sections.length === 0 ? (
              <div className="m-5 rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-6 text-sm text-[#63759a]">
                This project does not have test suites yet.
              </div>
            ) : filteredSections.length === 0 ? (
              <div className="m-5 rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-6 text-sm text-[#63759a]">
                {caseFilter === 'All'
                  ? 'No test cases match the current search and suite filters.'
                  : caseFilter === 'Archived'
                    ? 'No archived test cases match the current search and suite filters.'
                    : `No ${caseFilter.toLowerCase()} test cases match the current search and suite filters.`}
              </div>
            ) : (
              <div className="grid gap-4 p-5">
                {filteredSections.map(({ section, sectionTests, visibleTests }) => {
                  const isEditingSuite = editingSuiteId === section.id
                  const isDeleteConfirming = deleteConfirmSuiteId === section.id
                  const isCollapsed = Boolean(collapsedSuiteById[section.id])
                  const isPendingSuiteAction = Boolean(
                    pendingSuiteActionById[section.id],
                  )
                  const isMenuOpen = openSuiteMenuId === section.id
                  const readyCount = sectionTests.filter(
                    (test) => test.status === 'Ready',
                  ).length
                  const draftCount = sectionTests.length - readyCount
                  const visibleTestIds = visibleTests.map((test) => test.id)
                  const allVisibleSelected =
                    visibleTestIds.length > 0 &&
                    visibleTestIds.every((id) => selectedTestIdSet.has(id))

                  return (
                    <section
                      key={section.id}
                      className="overflow-hidden rounded-3xl border border-[#dfe6f4]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9eef8] bg-[#fbfcff] px-5 py-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selectedSuiteIdSet.has(section.id)}
                            onChange={() => toggleSuiteBulkSelection(section.id)}
                            className="h-4 w-4 rounded border-[#c7d5ee] text-[#2f6fe4] focus:ring-[#2f6fe4]"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSuiteCollapsed(section.id)}
                            className="rounded-lg px-2 py-1 text-sm font-semibold text-[#506487]"
                            aria-label={isCollapsed ? 'Expand suite' : 'Collapse suite'}
                          >
                            {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                          </button>
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
                                <div className="text-[1.75rem] font-semibold text-[#1b2f5b]">
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
                          <button
                            type="button"
                            onClick={() => toggleSuiteSelection(visibleTestIds)}
                            disabled={
                              visibleTestIds.length === 0 || isApplyingBulkAction
                            }
                            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {allVisibleSelected ? 'Clear suite' : 'Select suite'}
                          </button>
                          <Link
                            to="/create-test"
                            search={{ suiteId: section.id, projectId: project.id }}
                            className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#3369d6]"
                          >
                            + Case
                          </Link>
                          {!isEditingSuite ? (
                            <div className="relative">
                              <button
                                type="button"
                                disabled={isPendingSuiteAction}
                                onClick={() => {
                                  setSuiteActionErrorMessage(null)
                                  setDeleteConfirmSuiteId(null)
                                  setOpenSuiteMenuId((current) =>
                                    current === section.id ? null : section.id,
                                  )
                                }}
                                className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                                aria-label="Open suite actions"
                              >
                                ...
                              </button>
                              {isMenuOpen ? (
                                <div className="absolute right-0 top-full z-10 mt-2 min-w-[160px] rounded-2xl border border-[#dbe4f4] bg-white p-2 shadow-[0_12px_30px_rgba(31,57,102,0.12)]">
                                  <button
                                    type="button"
                                    onClick={() => startRenameSuite(section.id, section.name)}
                                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#60718f] hover:bg-[#f5f8ff]"
                                  >
                                    Rename
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSuiteActionErrorMessage(null)
                                      setSuiteActionSuiteId(section.id)
                                      setDeleteConfirmSuiteId((current) =>
                                        current === section.id ? null : section.id,
                                      )
                                      setOpenSuiteMenuId(null)
                                    }}
                                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
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
                        <div className="bg-white px-5 py-4 text-sm text-[#63759a]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span>No test cases in this suite yet.</span>
                            <Link
                              to="/create-test"
                              search={{ suiteId: section.id, projectId: project.id }}
                              className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#3369d6]"
                            >
                              + Case
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white">
                          <div className="grid grid-cols-[44px_92px_minmax(220px,1fr)_130px_96px] items-center border-t border-[#e9eef8] bg-[#fbfcff] px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                            <div />
                            <div>ID</div>
                            <div>Title</div>
                            <div>Status</div>
                            <div className="text-right">Actions</div>
                          </div>
                          {visibleTests.map((test) => {
                            const isReady = test.status === 'Ready'
                            const isArchived = test.status === 'Archived'
                            const isCaseMenuOpen = openCaseMenuId === test.id
                            const isPendingCaseAction = pendingCaseActionId === test.id

                            return (
                              <article
                                key={test.id}
                                className="grid grid-cols-[44px_92px_minmax(220px,1fr)_130px_96px] items-center border-t border-[#eef2f8] px-5 py-2.5 transition hover:bg-[#f8fbff]"
                              >
                                <div>
                                  <input
                                    type="checkbox"
                                    checked={selectedTestIdSet.has(test.id)}
                                    onChange={() => toggleTestSelection(test.id)}
                                    className="h-4 w-4 rounded border-[#c7d5ee] text-[#2f6fe4] focus:ring-[#2f6fe4]"
                                  />
                                </div>
                                <Link
                                  to="/test/$testId"
                                  params={{ testId: test.id.toString() }}
                                  className="text-sm font-semibold no-underline text-[#2f6fe4]"
                                >
                                  #{test.id}
                                </Link>
                                <Link
                                  to="/test/$testId"
                                  params={{ testId: test.id.toString() }}
                                  className="block min-w-0 truncate pr-4 text-sm font-semibold no-underline text-[#1b2f5b] hover:text-[#2f6fe4]"
                                >
                                  {test.title}
                                </Link>
                                <span
                                  className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    isReady
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : test.status === 'Archived'
                                        ? 'bg-amber-50 text-amber-800'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {test.status ?? 'Draft'}
                                </span>
                                <div className="relative flex justify-end">
                                  <button
                                    type="button"
                                    disabled={isPendingCaseAction}
                                    onClick={() => {
                                      setCaseActionErrorMessage(null)
                                      setOpenCaseMenuId((current) =>
                                        current === test.id ? null : test.id,
                                      )
                                    }}
                                    className="rounded-lg border border-[#dbe4f4] bg-white px-2.5 py-1 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                                    aria-label="Open test case actions"
                                  >
                                    ...
                                  </button>
                                  {isCaseMenuOpen ? (
                                    <div className="absolute right-0 top-full z-10 mt-2 min-w-[170px] rounded-2xl border border-[#dbe4f4] bg-white p-2 text-left shadow-[0_12px_30px_rgba(31,57,102,0.12)]">
                                      <Link
                                        to="/test/$testId"
                                        params={{ testId: test.id.toString() }}
                                        className="block rounded-xl px-3 py-2 text-sm font-semibold no-underline text-[#60718f] hover:bg-[#f5f8ff]"
                                      >
                                        Open
                                      </Link>
                                      <Link
                                        to="/edit-test/$testId"
                                        params={{ testId: test.id.toString() }}
                                        className="block rounded-xl px-3 py-2 text-sm font-semibold no-underline text-[#60718f] hover:bg-[#f5f8ff]"
                                      >
                                        Edit
                                      </Link>
                                      {isArchived ? (
                                        <>
                                          <button
                                            type="button"
                                            disabled={isPendingCaseAction}
                                            onClick={() => handleCaseRestore(test.id)}
                                            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-55"
                                          >
                                            Restore
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isPendingCaseAction}
                                            onClick={() =>
                                              handleCaseDeletePermanently(test.id)
                                            }
                                            className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-55"
                                          >
                                            Delete permanently
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={isPendingCaseAction}
                                          onClick={() => handleCaseArchive(test.id)}
                                          className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-55"
                                        >
                                          Archive
                                        </button>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              </article>
                            )
                          })}
                        </div>
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
