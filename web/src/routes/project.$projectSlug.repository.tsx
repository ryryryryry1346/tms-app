import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { BulkCaseBar } from '../components/repository/BulkCaseBar'
import { CasePreviewDrawer } from '../components/repository/CasePreviewDrawer'
import { RepositoryEmptyState } from '../components/repository/RepositoryEmptyState'
import { RepositoryErrorBanner } from '../components/repository/RepositoryErrorBanner'
import { RepositoryPanel } from '../components/repository/RepositoryPanel'
import { RepositoryToolbar } from '../components/repository/RepositoryToolbar'
import { SuiteSection } from '../components/repository/SuiteSection'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { uploadTestMedia } from '../features/media/server'
import {
  createSuite,
  deleteSuite,
  updateSuite,
} from '../features/projects/server'
import {
  archiveTestCase,
  bulkDeleteArchivedTestCases,
  bulkMoveTestCases,
  bulkRestoreTestCases,
  bulkUpdateTestMetadata,
  bulkUpdateTestStatus,
  createTestCase,
  deleteArchivedTestCase,
  duplicateTestCase,
  getDashboardState,
  moveAndReorderTestCases,
  restoreTestCase,
  updateTestContent,
  updateTestTitle,
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
type CaseStatusValue = Exclude<CaseFilter, 'All'>
type QuickCreateStatusValue = Exclude<CaseStatusValue, 'Archived'>
type PriorityFilter = 'All' | 'Low' | 'Medium' | 'High' | 'Critical'
type PriorityValue = Exclude<PriorityFilter, 'All'>
type CaseTypeFilter =
  | 'All'
  | 'Functional'
  | 'Regression'
  | 'Smoke'
  | 'E2E'
  | 'UI'
  | 'API'
type CaseTypeValue = Exclude<CaseTypeFilter, 'All'>
const ALL_SUITES_FILTER = 'all'
const CASE_STATUS_OPTIONS: CaseStatusValue[] = ['Draft', 'Ready', 'Archived']
const QUICK_CREATE_STATUS_OPTIONS: QuickCreateStatusValue[] = ['Draft', 'Ready']
const PRIORITY_OPTIONS: PriorityValue[] = ['Low', 'Medium', 'High', 'Critical']
const CASE_TYPE_OPTIONS: CaseTypeValue[] = [
  'Functional',
  'Regression',
  'Smoke',
  'E2E',
  'UI',
  'API',
]

function formatRepositoryDate(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatRepositoryDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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
  const [activeComposer, setActiveComposer] = useState<ComposerKind>(null)
  const [searchValue, setSearchValue] = useState('')
  const [caseFilter, setCaseFilter] = useState<CaseFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All')
  const [caseTypeFilter, setCaseTypeFilter] = useState<CaseTypeFilter>('All')
  const [suiteFilterId, setSuiteFilterId] = useState<string>(ALL_SUITES_FILTER)
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([])
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false)
  const [isBulkArchiveConfirming, setIsBulkArchiveConfirming] = useState(false)
  const [isBulkDeleteConfirming, setIsBulkDeleteConfirming] = useState(false)
  const [bulkActionErrorMessage, setBulkActionErrorMessage] = useState<string | null>(
    null,
  )
  const [openCaseMenuId, setOpenCaseMenuId] = useState<number | null>(null)
  const [pendingCaseActionId, setPendingCaseActionId] = useState<number | null>(null)
  const [editingCaseTitleId, setEditingCaseTitleId] = useState<number | null>(
    null,
  )
  const [editingCaseTitleValue, setEditingCaseTitleValue] = useState('')
  const [previewTestId, setPreviewTestId] = useState<number | null>(null)
  const [quickCreateSuiteId, setQuickCreateSuiteId] = useState<number | null>(
    null,
  )
  const [quickCreateTitle, setQuickCreateTitle] = useState('')
  const [quickCreatePriority, setQuickCreatePriority] =
    useState<PriorityValue>('Medium')
  const [quickCreateType, setQuickCreateType] =
    useState<CaseTypeValue>('Functional')
  const [quickCreateStatus, setQuickCreateStatus] =
    useState<QuickCreateStatusValue>('Draft')
  const [pendingQuickCreateSuiteId, setPendingQuickCreateSuiteId] = useState<
    number | null
  >(null)
  const [isEditingPreviewContent, setIsEditingPreviewContent] = useState(false)
  const [previewStepsValue, setPreviewStepsValue] = useState('')
  const [previewExpectedValue, setPreviewExpectedValue] = useState('')
  const [isSavingPreviewContent, setIsSavingPreviewContent] = useState(false)
  const [isUploadingPreviewMedia, setIsUploadingPreviewMedia] = useState(false)
  const [caseActionErrorMessage, setCaseActionErrorMessage] = useState<
    string | null
  >(null)
  const [draggedTestIds, setDraggedTestIds] = useState<number[]>([])
  const [dragOverSuiteId, setDragOverSuiteId] = useState<number | null>(null)
  const [dragOverTestDrop, setDragOverTestDrop] = useState<{
    testId: number
    position: 'before' | 'after'
  } | null>(null)

  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const filteredLifecycleTests = dashboard.tests.filter((test) => {
    if (caseFilter === 'All') {
      if (test.status === 'Archived') {
        return false
      }
    } else if (caseFilter === 'Archived') {
      if (test.status !== 'Archived') {
        return false
      }
    } else if (test.status !== caseFilter) {
      return false
    }

    if (priorityFilter !== 'All' && (test.priority ?? 'Medium') !== priorityFilter) {
      return false
    }

    if (
      caseTypeFilter !== 'All' &&
      (test.caseType ?? 'Functional') !== caseTypeFilter
    ) {
      return false
    }

    return true
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
                const priority = (test.priority ?? 'Medium').toLowerCase()
                const caseType = (test.caseType ?? 'Functional').toLowerCase()

                return (
                  title.includes(normalizedSearch) ||
                  id.includes(normalizedSearch) ||
                  suiteName.includes(normalizedSearch) ||
                  priority.includes(normalizedSearch) ||
                  caseType.includes(normalizedSearch)
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
    caseTypeFilter,
    filteredLifecycleTests,
    normalizedSearch,
    priorityFilter,
    suiteFilterId,
  ])

  const selectedTestIdSet = useMemo(
    () => new Set(selectedTestIds),
    [selectedTestIds],
  )
  const selectedTests = useMemo(
    () => dashboard.tests.filter((test) => selectedTestIdSet.has(test.id)),
    [dashboard.tests, selectedTestIdSet],
  )
  const selectedArchivableTests = selectedTests.filter(
    (test) => test.status !== 'Archived',
  )
  const selectedArchivedTests = selectedTests.filter(
    (test) => test.status === 'Archived',
  )
  const previewTest =
    previewTestId === null
      ? null
      : dashboard.tests.find((test) => test.id === previewTestId) ?? null
  const previewSuite =
    previewTest?.sectionId == null
      ? null
      : dashboard.sections.find((section) => section.id === previewTest.sectionId) ??
        null
  const previewActivities = previewTest
    ? dashboard.activities
        .filter((activity) => activity.testId === previewTest.id)
        .slice(0, 12)
    : []

  useEffect(() => {
    if (!previewTest) {
      return
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setPreviewTestId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewTest])

  useEffect(() => {
    if (!previewTest) {
      setIsEditingPreviewContent(false)
      setPreviewStepsValue('')
      setPreviewExpectedValue('')
      return
    }

    if (!isEditingPreviewContent) {
      setPreviewStepsValue(previewTest.steps ?? '')
      setPreviewExpectedValue(previewTest.expected ?? '')
    }
  }, [isEditingPreviewContent, previewTest])

  function clearBulkConfirmations(): void {
    setIsBulkArchiveConfirming(false)
    setIsBulkDeleteConfirming(false)
  }

  function startCaseTitleEdit(testId: number, title: string): void {
    setCaseActionErrorMessage(null)
    setOpenCaseMenuId(null)
    setEditingCaseTitleId(testId)
    setEditingCaseTitleValue(title)
  }

  function cancelCaseTitleEdit(): void {
    setEditingCaseTitleId(null)
    setEditingCaseTitleValue('')
  }

  function startQuickCreateCase(suiteId: number): void {
    setCaseActionErrorMessage(null)
    setOpenCaseMenuId(null)
    setQuickCreateSuiteId(suiteId)
    setQuickCreateTitle('')
    setQuickCreatePriority('Medium')
    setQuickCreateType('Functional')
    setQuickCreateStatus('Draft')
  }

  function cancelQuickCreateCase(): void {
    setQuickCreateSuiteId(null)
    setQuickCreateTitle('')
    setQuickCreatePriority('Medium')
    setQuickCreateType('Functional')
    setQuickCreateStatus('Draft')
  }

  function openCasePreview(testId: number): void {
    setCaseActionErrorMessage(null)
    setOpenCaseMenuId(null)
    setPreviewTestId(testId)
  }

  function handleRichContentClick(event: React.MouseEvent<HTMLElement>): void {
    const target = event.target

    if (!(target instanceof HTMLElement)) {
      return
    }

    const mediaElement = target.closest<HTMLElement>('[data-media-url]')
    const url = mediaElement?.dataset.mediaUrl

    if (!url) {
      return
    }

    event.preventDefault()
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function startPreviewContentEdit(): void {
    if (!previewTest) {
      return
    }

    setCaseActionErrorMessage(null)
    setPreviewStepsValue(previewTest.steps ?? '')
    setPreviewExpectedValue(previewTest.expected ?? '')
    setIsEditingPreviewContent(true)
  }

  function cancelPreviewContentEdit(): void {
    setIsEditingPreviewContent(false)
    setPreviewStepsValue(previewTest?.steps ?? '')
    setPreviewExpectedValue(previewTest?.expected ?? '')
  }

  async function uploadPreviewMedia(file: File): Promise<string> {
    setIsUploadingPreviewMedia(true)

    try {
      const result = await uploadTestMedia({
        data: {
          file,
        },
      })

      return result.url
    } finally {
      setIsUploadingPreviewMedia(false)
    }
  }

  async function savePreviewContent(): Promise<void> {
    if (!previewTest) {
      return
    }

    setCaseActionErrorMessage(null)
    setIsSavingPreviewContent(true)

    try {
      await updateTestContent({
        data: {
          id: previewTest.id,
          steps: previewStepsValue,
          expected: previewExpectedValue,
        },
      })

      setIsEditingPreviewContent(false)
      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to update test content.',
      )
    } finally {
      setIsSavingPreviewContent(false)
    }
  }

  function toggleTestSelection(testId: number): void {
    setBulkActionErrorMessage(null)
    clearBulkConfirmations()
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
    clearBulkConfirmations()
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
    setIsBulkArchiveConfirming(false)
    setIsBulkDeleteConfirming(false)
    setIsApplyingBulkAction(true)

    try {
      await bulkUpdateTestStatus({
        data: {
          ids:
            status === 'Archived'
              ? selectedArchivableTests.map((test) => test.id)
              : selectedTestIds,
          status,
        },
      })

      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
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

  async function handleBulkMetadataUpdate(
    metadata:
      | { priority: PriorityValue; caseType?: never }
      | { priority?: never; caseType: CaseTypeValue },
  ): Promise<void> {
    if (selectedTestIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    clearBulkConfirmations()
    setIsApplyingBulkAction(true)

    try {
      await bulkUpdateTestMetadata({
        data: {
          ids: selectedTestIds,
          ...metadata,
        },
      })

      setSelectedTestIds([])
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update selected test case metadata.',
      )
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  async function handleCaseMetadataChange(
    testId: number,
    metadata:
      | { priority: PriorityValue; caseType?: never }
      | { priority?: never; caseType: CaseTypeValue },
  ): Promise<void> {
    setCaseActionErrorMessage(null)
    setOpenCaseMenuId(null)
    setPendingCaseActionId(testId)

    try {
      await bulkUpdateTestMetadata({
        data: {
          ids: [testId],
          ...metadata,
        },
      })

      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update test case metadata.',
      )
    } finally {
      setPendingCaseActionId(null)
    }
  }

  async function handleCaseStatusChange(
    testId: number,
    status: CaseStatusValue,
  ): Promise<void> {
    setCaseActionErrorMessage(null)
    setOpenCaseMenuId(null)
    setPendingCaseActionId(testId)

    try {
      await bulkUpdateTestStatus({
        data: {
          ids: [testId],
          status,
        },
      })

      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to update test case status.',
      )
    } finally {
      setPendingCaseActionId(null)
    }
  }

  async function saveCaseTitleEdit(testId: number, currentTitle: string): Promise<void> {
    const nextTitle = editingCaseTitleValue.trim()

    if (!nextTitle) {
      setCaseActionErrorMessage('Test case title cannot be empty.')
      return
    }

    if (nextTitle === currentTitle) {
      cancelCaseTitleEdit()
      return
    }

    setCaseActionErrorMessage(null)
    setOpenCaseMenuId(null)
    setPendingCaseActionId(testId)

    try {
      await updateTestTitle({
        data: {
          id: testId,
          title: nextTitle,
        },
      })

      cancelCaseTitleEdit()
      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to update test case title.',
      )
    } finally {
      setPendingCaseActionId(null)
    }
  }

  async function handleQuickCreateCase(suiteId: number): Promise<void> {
    const title = quickCreateTitle.trim()

    if (!title) {
      setCaseActionErrorMessage('Test case title cannot be empty.')
      return
    }

    setCaseActionErrorMessage(null)
    setPendingQuickCreateSuiteId(suiteId)

    try {
      await createTestCase({
        data: {
          title,
          sectionId: suiteId,
          status: quickCreateStatus,
          priority: quickCreatePriority,
          caseType: quickCreateType,
          steps: '',
          expected: '',
        },
      })

      cancelQuickCreateCase()
      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to create test case.',
      )
    } finally {
      setPendingQuickCreateSuiteId(null)
    }
  }

  function handleBulkArchiveRequest(): void {
    if (selectedArchivableTests.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsBulkDeleteConfirming(false)
    setIsBulkArchiveConfirming(true)
  }

  async function handleBulkRestore(): Promise<void> {
    if (selectedTestIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsBulkArchiveConfirming(false)
    setIsBulkDeleteConfirming(false)
    setIsApplyingBulkAction(true)

    try {
      await bulkRestoreTestCases({
        data: {
          ids: selectedTestIds,
        },
      })

      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
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
    if (selectedArchivedTests.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsBulkArchiveConfirming(false)
    setIsBulkDeleteConfirming(false)
    setIsApplyingBulkAction(true)

    try {
      await bulkDeleteArchivedTestCases({
        data: {
          ids: selectedArchivedTests.map((test) => test.id),
        },
      })

      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
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

  function handleBulkDeleteArchivedRequest(): void {
    if (selectedArchivedTests.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsBulkArchiveConfirming(false)
    setIsBulkDeleteConfirming(true)
  }

  async function handleMoveTestCases(
    testIds: number[],
    targetSuiteId: number,
  ): Promise<void> {
    if (testIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsBulkArchiveConfirming(false)
    setIsBulkDeleteConfirming(false)
    setIsApplyingBulkAction(true)

    try {
      await bulkMoveTestCases({
        data: {
          ids: testIds,
          sectionId: targetSuiteId,
        },
      })

      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
      setDraggedTestIds([])
      setDragOverSuiteId(null)
      setDragOverTestDrop(null)
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to move test cases.',
      )
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  async function handleMoveAndReorderTestCases({
    testIds,
    targetSuiteId,
    orderedIds,
  }: {
    testIds: number[]
    targetSuiteId: number
    orderedIds: number[]
  }): Promise<void> {
    if (testIds.length === 0 || orderedIds.length === 0) {
      return
    }

    setBulkActionErrorMessage(null)
    setIsBulkArchiveConfirming(false)
    setIsBulkDeleteConfirming(false)
    setIsApplyingBulkAction(true)

    try {
      await moveAndReorderTestCases({
        data: {
          ids: testIds,
          sectionId: targetSuiteId,
          orderedIds,
        },
      })

      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
      setDraggedTestIds([])
      setDragOverSuiteId(null)
      setDragOverTestDrop(null)
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        error instanceof Error
          ? error.message
          : 'Failed to move and reorder test cases.',
      )
    } finally {
      setIsApplyingBulkAction(false)
    }
  }

  async function handleMoveSelectedCases(targetSuiteIdValue: string): Promise<void> {
    const targetSuiteId = Number(targetSuiteIdValue)

    if (!Number.isInteger(targetSuiteId) || targetSuiteId <= 0) {
      setBulkActionErrorMessage('Choose a target suite first.')
      return
    }

    await handleMoveTestCases(selectedTestIds, targetSuiteId)
  }

  function handleCaseDragStart(
    event: React.DragEvent<HTMLElement>,
    testId: number,
  ): void {
    const ids =
      selectedTestIds.includes(testId) && selectedTestIds.length > 0
        ? selectedTestIds
        : [testId]

    setBulkActionErrorMessage(null)
    setDraggedTestIds(ids)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify(ids))
    event.dataTransfer.setData('text/plain', ids.join(','))
  }

  function getDraggedIdsFromEvent(
    event: React.DragEvent<HTMLElement>,
  ): number[] {
    if (draggedTestIds.length > 0) {
      return draggedTestIds
    }

    try {
      const rawPayload = event.dataTransfer.getData('application/json')
      const parsedPayload = JSON.parse(rawPayload) as unknown

      if (Array.isArray(parsedPayload)) {
        return parsedPayload.filter(
          (id): id is number => Number.isInteger(id) && id > 0,
        )
      }
    } catch {
      return []
    }

    return []
  }

  function buildReorderedIds({
    currentIds,
    draggedIds,
    beforeId,
  }: {
    currentIds: number[]
    draggedIds: number[]
    beforeId?: number
  }): number[] {
    const draggedIdSet = new Set(draggedIds)
    const remainingIds = currentIds.filter((id) => !draggedIdSet.has(id))

    if (!beforeId) {
      return [...remainingIds, ...draggedIds]
    }

    const beforeIndex = remainingIds.indexOf(beforeId)

    if (beforeIndex < 0) {
      return [...remainingIds, ...draggedIds]
    }

    return [
      ...remainingIds.slice(0, beforeIndex),
      ...draggedIds,
      ...remainingIds.slice(beforeIndex),
    ]
  }

  function buildReorderedIdsAfter({
    currentIds,
    draggedIds,
    afterId,
  }: {
    currentIds: number[]
    draggedIds: number[]
    afterId: number
  }): number[] {
    const draggedIdSet = new Set(draggedIds)
    const remainingIds = currentIds.filter((id) => !draggedIdSet.has(id))
    const afterIndex = remainingIds.indexOf(afterId)

    if (afterIndex < 0) {
      return [...remainingIds, ...draggedIds]
    }

    return [
      ...remainingIds.slice(0, afterIndex + 1),
      ...draggedIds,
      ...remainingIds.slice(afterIndex + 1),
    ]
  }

  function handleSuiteDragOver(
    event: React.DragEvent<HTMLElement>,
    suiteId: number,
  ): void {
    if (draggedTestIds.length === 0) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverSuiteId(suiteId)
  }

  async function handleSuiteAppendDrop({
    event,
    suiteId,
    currentSuiteTestIds,
  }: {
    event: React.DragEvent<HTMLElement>
    suiteId: number
    currentSuiteTestIds: number[]
  }): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    const ids = getDraggedIdsFromEvent(event)
    const orderedIds = buildReorderedIds({
      currentIds: currentSuiteTestIds,
      draggedIds: ids,
    })

    await handleMoveAndReorderTestCases({
      testIds: ids,
      targetSuiteId: suiteId,
      orderedIds,
    })
  }

  async function handleCaseDrop({
    event,
    suiteId,
    targetTestId,
    position,
    currentSuiteTestIds,
  }: {
    event: React.DragEvent<HTMLElement>
    suiteId: number
    targetTestId: number
    position: 'before' | 'after'
    currentSuiteTestIds: number[]
  }): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    const ids = getDraggedIdsFromEvent(event)

    if (ids.includes(targetTestId)) {
      setDraggedTestIds([])
      setDragOverSuiteId(null)
      setDragOverTestDrop(null)
      return
    }

    const orderedIds =
      position === 'before'
        ? buildReorderedIds({
            currentIds: currentSuiteTestIds,
            draggedIds: ids,
            beforeId: targetTestId,
          })
        : buildReorderedIdsAfter({
            currentIds: currentSuiteTestIds,
            draggedIds: ids,
            afterId: targetTestId,
          })

    await handleMoveAndReorderTestCases({
      testIds: ids,
      targetSuiteId: suiteId,
      orderedIds,
    })
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

  async function handleCaseDuplicate(testId: number): Promise<void> {
    setCaseActionErrorMessage(null)
    setOpenCaseMenuId(null)
    setPendingCaseActionId(testId)

    try {
      await duplicateTestCase({
        data: {
          id: testId,
        },
      })

      setOpenCaseMenuId(null)
      await router.invalidate()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to duplicate test case.',
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
    <main className="tms-page">
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10">
          <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="mb-2 flex items-center gap-3 text-sm text-[var(--tms-text-muted)]">
                <Link to="/" className="no-underline text-[var(--tms-primary)]">
                  Workspace
                </Link>
                <span>/</span>
                <span>Project</span>
              </div>
              <h1 className="m-0 text-4xl font-bold tracking-tight text-[var(--tms-text)] md:text-5xl">
                {project.name}
              </h1>
              <p className="mt-2 text-base text-[var(--tms-text-muted)] md:text-lg">
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
              <Button
                onClick={() =>
                  setActiveComposer((current) => (current === 'suite' ? null : 'suite'))
                }
                variant="primary"
                className="px-7 py-3 text-base"
              >
                + Suite
              </Button>
              <Link
                to="/create-test"
                search={{ projectId: project.id }}
                className="tms-button tms-button-primary px-7 py-3 text-base no-underline"
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
                className="tms-chip"
              >
                <span className="text-[var(--tms-text)]">{item.value}</span> {item.label}
              </div>
            ))}
          </section>

          {activeComposer ? (
            <section className="tms-panel mb-6 px-6 py-5">
              <form
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]"
                onSubmit={handleCreateSuite}
              >
                <div className="md:col-span-2 text-xl font-semibold text-[var(--tms-text)]">
                  Create suite
                </div>
                <Input
                  value={suiteName}
                  onChange={(event) => setSuiteName(event.target.value)}
                  className="px-4 py-3 text-base"
                  placeholder="Checkout smoke"
                />
                <Button
                  type="submit"
                  disabled={isSubmittingSuite || !dashboard.databaseConfigured}
                  className="border-[var(--status-ready-border)] bg-[var(--status-ready-bg)] px-4 py-3 text-sm text-[var(--status-ready-text)]"
                >
                  {isSubmittingSuite ? 'Creating...' : 'Create suite'}
                </Button>
                {suiteErrorMessage ? (
                  <Alert variant="danger" className="md:col-span-2">
                    {suiteErrorMessage}
                  </Alert>
                ) : null}
              </form>
            </section>
          ) : null}

          <RepositoryPanel>
            <RepositoryToolbar
              visibleCount={filteredLifecycleTests.length}
              searchValue={searchValue}
              suiteFilterId={suiteFilterId}
              priorityFilter={priorityFilter}
              caseTypeFilter={caseTypeFilter}
              caseFilter={caseFilter}
              allSuitesFilter={ALL_SUITES_FILTER}
              suites={dashboard.sections}
              priorityOptions={PRIORITY_OPTIONS}
              caseTypeOptions={CASE_TYPE_OPTIONS}
              onSearchChange={(value) => {
                clearBulkConfirmations()
                setSearchValue(value)
              }}
              onSuiteFilterChange={(value) => {
                clearBulkConfirmations()
                setSuiteFilterId(value)
              }}
              onPriorityFilterChange={(value) => {
                clearBulkConfirmations()
                setPriorityFilter(value)
              }}
              onCaseTypeFilterChange={(value) => {
                clearBulkConfirmations()
                setCaseTypeFilter(value)
              }}
              onCaseFilterChange={(value) => {
                clearBulkConfirmations()
                setCaseFilter(value)
              }}
            />

            {selectedTestIds.length > 0 ? (
              <BulkCaseBar
                selectedCount={selectedTestIds.length}
                suites={dashboard.sections}
                priorities={PRIORITY_OPTIONS}
                caseTypes={CASE_TYPE_OPTIONS}
                isApplying={isApplyingBulkAction}
                isArchivedView={caseFilter === 'Archived'}
                selectedArchivableCount={selectedArchivableTests.length}
                selectedArchivedCount={selectedArchivedTests.length}
                isArchiveConfirming={isBulkArchiveConfirming}
                isDeleteConfirming={isBulkDeleteConfirming}
                errorMessage={bulkActionErrorMessage}
                onMoveToSuite={(suiteId) => {
                  void handleMoveSelectedCases(suiteId)
                }}
                onStatusChange={(status) => {
                  void handleBulkStatusChange(status)
                }}
                onPriorityChange={(priority) => {
                  void handleBulkMetadataUpdate({ priority })
                }}
                onCaseTypeChange={(caseType) => {
                  void handleBulkMetadataUpdate({ caseType })
                }}
                onRestoreArchived={() => {
                  void handleBulkRestore()
                }}
                onRequestArchive={handleBulkArchiveRequest}
                onCancelArchive={() => setIsBulkArchiveConfirming(false)}
                onConfirmArchive={() => {
                  void handleBulkStatusChange('Archived')
                }}
                onRequestDeleteArchived={handleBulkDeleteArchivedRequest}
                onCancelDeleteArchived={() => setIsBulkDeleteConfirming(false)}
                onConfirmDeleteArchived={() => {
                  void handleBulkDeleteArchived()
                }}
                onClearSelection={() => {
                  setSelectedTestIds([])
                  setIsBulkArchiveConfirming(false)
                  setIsBulkDeleteConfirming(false)
                }}
              />
            ) : null}

            {caseActionErrorMessage ? (
              <RepositoryErrorBanner message={caseActionErrorMessage} />
            ) : null}

            {dashboard.sections.length === 0 ? (
              <RepositoryEmptyState reason="no-suites" />
            ) : filteredSections.length === 0 ? (
              <RepositoryEmptyState
                reason="no-matching-cases"
                caseFilter={caseFilter}
              />
            ) : (
              <div className="grid gap-4 p-5">
                {filteredSections.map(({ section, sectionTests, visibleTests }) => {
                  const isEditingSuite = editingSuiteId === section.id
                  const isDeleteConfirming = deleteConfirmSuiteId === section.id
                  const isCollapsed = Boolean(collapsedSuiteById[section.id])
                  const isPendingSuiteAction = Boolean(
                    pendingSuiteActionById[section.id],
                  )
                  const sectionAllTestIds = dashboard.tests
                    .filter((test) => test.sectionId === section.id)
                    .map((test) => test.id)
                  const visibleTestIds = visibleTests.map((test) => test.id)
                  const allVisibleSelected =
                    visibleTestIds.length > 0 &&
                    visibleTestIds.every((id) => selectedTestIdSet.has(id))

                  return (
                    <SuiteSection
                      key={section.id}
                      section={section}
                      sectionTests={sectionTests}
                      visibleTests={visibleTests}
                      sectionAllTestIds={sectionAllTestIds}
                      visibleTestIds={visibleTestIds}
                      selectedTestIdSet={selectedTestIdSet}
                      isCollapsed={isCollapsed}
                      isEditingSuite={isEditingSuite}
                      isDeleteConfirming={isDeleteConfirming}
                      isPendingSuiteAction={isPendingSuiteAction}
                      isMenuOpen={openSuiteMenuId === section.id}
                      allVisibleSelected={allVisibleSelected}
                      editingSuiteName={editingSuiteName}
                      suiteActionErrorMessage={suiteActionErrorMessage}
                      showSuiteActionError={suiteActionSuiteId === section.id}
                      dragOverSuiteId={dragOverSuiteId}
                      draggedTestIds={draggedTestIds}
                      dragOverTestDrop={dragOverTestDrop}
                      isApplyingBulkAction={isApplyingBulkAction}
                      quickCreateSuiteId={quickCreateSuiteId}
                      pendingQuickCreateSuiteId={pendingQuickCreateSuiteId}
                      quickCreateTitle={quickCreateTitle}
                      quickCreatePriority={quickCreatePriority}
                      quickCreateType={quickCreateType}
                      quickCreateStatus={quickCreateStatus}
                      priorityOptions={PRIORITY_OPTIONS}
                      caseTypeOptions={CASE_TYPE_OPTIONS}
                      statusOptions={CASE_STATUS_OPTIONS}
                      quickCreateStatusOptions={QUICK_CREATE_STATUS_OPTIONS}
                      openCaseMenuId={openCaseMenuId}
                      pendingCaseActionId={pendingCaseActionId}
                      editingCaseTitleId={editingCaseTitleId}
                      editingCaseTitleValue={editingCaseTitleValue}
                      formatDate={formatRepositoryDate}
                      onToggleCollapsed={toggleSuiteCollapsed}
                      onRenameSuite={(event, suiteId) => {
                        void handleRenameSuite(event, suiteId)
                      }}
                      onEditingSuiteNameChange={setEditingSuiteName}
                      onCancelRenameSuite={() => {
                        setEditingSuiteId(null)
                        setEditingSuiteName('')
                        setSuiteActionErrorMessage(null)
                      }}
                      onToggleSuiteSelection={toggleSuiteSelection}
                      onStartQuickCreateCase={startQuickCreateCase}
                      onQuickCreateTitleChange={setQuickCreateTitle}
                      onQuickCreatePriorityChange={setQuickCreatePriority}
                      onQuickCreateTypeChange={setQuickCreateType}
                      onQuickCreateStatusChange={setQuickCreateStatus}
                      onSubmitQuickCreateCase={(suiteId) => {
                        void handleQuickCreateCase(suiteId)
                      }}
                      onCancelQuickCreateCase={cancelQuickCreateCase}
                      onToggleSuiteMenu={(suiteId) => {
                        setSuiteActionErrorMessage(null)
                        setDeleteConfirmSuiteId(null)
                        setOpenSuiteMenuId((current) =>
                          current === suiteId ? null : suiteId,
                        )
                      }}
                      onCloseSuiteMenu={() => setOpenSuiteMenuId(null)}
                      onStartRenameSuite={startRenameSuite}
                      onRequestDeleteSuite={(suiteId) => {
                        setSuiteActionErrorMessage(null)
                        setSuiteActionSuiteId(suiteId)
                        setDeleteConfirmSuiteId((current) =>
                          current === suiteId ? null : suiteId,
                        )
                        setOpenSuiteMenuId(null)
                      }}
                      onConfirmDeleteSuite={(suiteId) => {
                        void handleDeleteSuite(suiteId)
                      }}
                      onCancelDeleteSuite={() => setDeleteConfirmSuiteId(null)}
                      onSuiteDragOver={handleSuiteDragOver}
                      onSuiteDragLeave={(suiteId) => {
                        setDragOverSuiteId((current) =>
                          current === suiteId ? null : current,
                        )
                      }}
                      onSuiteAppendDrop={(event, suiteId) => {
                        setDragOverTestDrop(null)
                        void handleSuiteAppendDrop({
                          event,
                          suiteId,
                          currentSuiteTestIds: sectionAllTestIds,
                        })
                      }}
                      onToggleTestSelection={toggleTestSelection}
                      onCaseDragStart={handleCaseDragStart}
                      onCaseDragEnd={() => {
                        setDraggedTestIds([])
                        setDragOverSuiteId(null)
                        setDragOverTestDrop(null)
                      }}
                      onCaseDragOver={(_event, testId, position) => {
                        setDragOverSuiteId(section.id)
                        setDragOverTestDrop({
                          testId,
                          position,
                        })
                      }}
                      onCaseDragLeave={(testId) => {
                        setDragOverTestDrop((current) =>
                          current?.testId === testId ? null : current,
                        )
                      }}
                      onCaseDrop={(event, testId) => {
                        const position =
                          dragOverTestDrop?.testId === testId
                            ? dragOverTestDrop.position
                            : 'before'

                        void handleCaseDrop({
                          event,
                          suiteId: section.id,
                          targetTestId: testId,
                          position,
                          currentSuiteTestIds: sectionAllTestIds,
                        })
                      }}
                      onStartCaseTitleEdit={startCaseTitleEdit}
                      onCaseTitleEditChange={setEditingCaseTitleValue}
                      onSaveCaseTitleEdit={(testId, currentTitle) => {
                        void saveCaseTitleEdit(testId, currentTitle)
                      }}
                      onCancelCaseTitleEdit={cancelCaseTitleEdit}
                      onCasePriorityChange={(testId, priority) => {
                        const test = visibleTests.find((item) => item.id === testId)

                        if (priority === (test?.priority ?? 'Medium')) {
                          return
                        }

                        void handleCaseMetadataChange(testId, { priority })
                      }}
                      onCaseTypeChange={(testId, caseType) => {
                        const test = visibleTests.find((item) => item.id === testId)

                        if (caseType === (test?.caseType ?? 'Functional')) {
                          return
                        }

                        void handleCaseMetadataChange(testId, { caseType })
                      }}
                      onCaseStatusChange={(testId, status) => {
                        const test = visibleTests.find((item) => item.id === testId)

                        if (status === (test?.status ?? 'Draft')) {
                          return
                        }

                        void handleCaseStatusChange(testId, status)
                      }}
                      onToggleCaseMenu={(testId) => {
                        setCaseActionErrorMessage(null)
                        setOpenCaseMenuId((current) =>
                          current === testId ? null : testId,
                        )
                      }}
                      onCloseCaseMenu={() => setOpenCaseMenuId(null)}
                      onPreviewCase={openCasePreview}
                      onDuplicateCase={(testId) => {
                        void handleCaseDuplicate(testId)
                      }}
                      onRestoreCase={(testId) => {
                        void handleCaseRestore(testId)
                      }}
                      onDeleteCasePermanently={(testId) => {
                        void handleCaseDeletePermanently(testId)
                      }}
                      onArchiveCase={(testId) => {
                        void handleCaseArchive(testId)
                      }}
                    />
                  )
                })}
              </div>
            )}
          </RepositoryPanel>

          {previewTest ? (
            <CasePreviewDrawer
              test={previewTest}
              suite={previewSuite}
              activities={previewActivities}
              isEditingContent={isEditingPreviewContent}
              stepsValue={previewStepsValue}
              expectedValue={previewExpectedValue}
              isSavingContent={isSavingPreviewContent}
              isUploadingMedia={isUploadingPreviewMedia}
              isPendingAction={pendingCaseActionId === previewTest.id}
              onClose={() => setPreviewTestId(null)}
              onStartEdit={startPreviewContentEdit}
              onCancelEdit={cancelPreviewContentEdit}
              onSaveContent={() => {
                void savePreviewContent()
              }}
              onStepsChange={setPreviewStepsValue}
              onExpectedChange={setPreviewExpectedValue}
              onUploadMedia={uploadPreviewMedia}
              onRichContentClick={handleRichContentClick}
              onRestore={() => {
                void handleCaseRestore(previewTest.id)
              }}
              onArchive={() => {
                void handleCaseArchive(previewTest.id)
              }}
              formatDateTime={formatRepositoryDateTime}
            />
          ) : null}
      </div>
    </main>
  )
}
