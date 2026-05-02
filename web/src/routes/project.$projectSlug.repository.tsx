import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
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

function DragHandleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="currentColor"
    >
      <path d="M5 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM13 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
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
  const [activeComposer, setActiveComposer] = useState<ComposerKind>(null)
  const [searchValue, setSearchValue] = useState('')
  const [caseFilter, setCaseFilter] = useState<CaseFilter>('All')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('All')
  const [caseTypeFilter, setCaseTypeFilter] = useState<CaseTypeFilter>('All')
  const [suiteFilterId, setSuiteFilterId] = useState<string>(ALL_SUITES_FILTER)
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([])
  const [moveTargetSuiteId, setMoveTargetSuiteId] = useState('')
  const [bulkPriorityValue, setBulkPriorityValue] = useState<'' | PriorityValue>(
    '',
  )
  const [bulkCaseTypeValue, setBulkCaseTypeValue] = useState<'' | CaseTypeValue>(
    '',
  )
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

  function resetBulkMetadataFields(): void {
    setBulkPriorityValue('')
    setBulkCaseTypeValue('')
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
      resetBulkMetadataFields()
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
      resetBulkMetadataFields()
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
      resetBulkMetadataFields()
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
      resetBulkMetadataFields()
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
      resetBulkMetadataFields()
      setMoveTargetSuiteId('')
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
      resetBulkMetadataFields()
      setMoveTargetSuiteId('')
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

  async function handleMoveSelectedCases(): Promise<void> {
    const targetSuiteId = Number(moveTargetSuiteId)

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

  function renderQuickCreateCaseRow(sectionId: number, projectId: number) {
    const isPending = pendingQuickCreateSuiteId === sectionId

    return (
      <div className="grid grid-cols-[44px_82px_minmax(220px,1fr)_110px_110px_110px_110px_110px_96px] items-center border-t border-[#dbe4f4] bg-[#f8fbff] px-5 py-2.5">
        <div />
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9aa7bf]">
          New
        </div>
        <input
          value={quickCreateTitle}
          onChange={(event) => setQuickCreateTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void handleQuickCreateCase(sectionId)
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              cancelQuickCreateCase()
            }
          }}
          disabled={isPending}
          autoFocus
          placeholder="Test case title"
          className="min-w-0 rounded-lg border border-[#c7d5ee] bg-white px-2 py-1 text-sm font-semibold text-[#1b2f5b] outline-none disabled:cursor-not-allowed disabled:opacity-55"
        />
        <select
          value={quickCreatePriority}
          onChange={(event) =>
            setQuickCreatePriority(event.target.value as PriorityValue)
          }
          disabled={isPending}
          className="w-fit rounded-full border-0 bg-[#eef6ff] px-2.5 py-1 text-xs font-semibold text-[#506487] outline-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          {PRIORITY_OPTIONS.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <select
          value={quickCreateType}
          onChange={(event) =>
            setQuickCreateType(event.target.value as CaseTypeValue)
          }
          disabled={isPending}
          className="w-fit rounded-full border-0 bg-[#f3f5f9] px-2.5 py-1 text-xs font-semibold text-[#60718f] outline-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          {CASE_TYPE_OPTIONS.map((caseType) => (
            <option key={caseType} value={caseType}>
              {caseType}
            </option>
          ))}
        </select>
        <span className="text-sm font-semibold text-[#9aa7bf]">-</span>
        <span className="text-sm font-semibold text-[#9aa7bf]">-</span>
        <select
          value={quickCreateStatus}
          onChange={(event) =>
            setQuickCreateStatus(event.target.value as QuickCreateStatusValue)
          }
          disabled={isPending}
          className="w-fit rounded-full border-0 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          {QUICK_CREATE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              void handleQuickCreateCase(sectionId)
            }}
            disabled={isPending}
            className="rounded-lg border border-[#9dbaf7] bg-white px-2.5 py-1 text-sm font-semibold text-[#3369d6] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
    )
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
              className="overflow-visible rounded-3xl border border-[#e6ecf8] bg-white shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
            >
            <div className="border-b border-[#e6ecf8] bg-white px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="m-0 text-xl font-semibold text-[#1b2f5b]">
                    Test suites and cases
                  </h2>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                    {filteredLifecycleTests.length} visible cases
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="flex w-[260px] items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
                  <span className="shrink-0 whitespace-nowrap font-semibold">Search</span>
                  <input
                    value={searchValue}
                    onChange={(event) => {
                      clearBulkConfirmations()
                      setSearchValue(event.target.value)
                    }}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
                  <span className="font-semibold">Suite</span>
                  <select
                    value={suiteFilterId}
                    onChange={(event) => {
                      clearBulkConfirmations()
                      setSuiteFilterId(event.target.value)
                    }}
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
                <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
                  <span className="font-semibold">Priority</span>
                  <select
                    value={priorityFilter}
                    onChange={(event) => {
                      clearBulkConfirmations()
                      setPriorityFilter(event.target.value as PriorityFilter)
                    }}
                    className="min-w-[110px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
                  >
                    <option value="All">All</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm text-[#6d7d9e]">
                  <span className="font-semibold">Type</span>
                  <select
                    value={caseTypeFilter}
                    onChange={(event) => {
                      clearBulkConfirmations()
                      setCaseTypeFilter(event.target.value as CaseTypeFilter)
                    }}
                    className="min-w-[120px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none"
                  >
                    <option value="All">All</option>
                    <option value="Functional">Functional</option>
                    <option value="Regression">Regression</option>
                    <option value="Smoke">Smoke</option>
                    <option value="E2E">E2E</option>
                    <option value="UI">UI</option>
                    <option value="API">API</option>
                  </select>
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['All', 'Ready', 'Draft', 'Archived'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => {
                        clearBulkConfirmations()
                        setCaseFilter(filter)
                      }}
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

            {selectedTestIds.length > 0 ? (
              <div className="mx-5 mt-4 rounded-2xl border border-[#dbe4f4] bg-[#f8fbff] px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-[#1b2f5b]">
                    {selectedTestIds.length} selected
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]">
                      Move to
                      <select
                        value={moveTargetSuiteId}
                        onChange={(event) => setMoveTargetSuiteId(event.target.value)}
                        disabled={isApplyingBulkAction}
                        className="min-w-[160px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none disabled:cursor-not-allowed"
                      >
                        <option value="">Choose suite</option>
                        {dashboard.sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        void handleMoveSelectedCases()
                      }}
                      disabled={isApplyingBulkAction || !moveTargetSuiteId}
                      className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Move
                    </button>
                    <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]">
                      Priority
                      <select
                        value={bulkPriorityValue}
                        onChange={(event) =>
                          setBulkPriorityValue(event.target.value as PriorityValue)
                        }
                        disabled={isApplyingBulkAction}
                        className="min-w-[110px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none disabled:cursor-not-allowed"
                      >
                        <option value="">Choose</option>
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!bulkPriorityValue) {
                          return
                        }

                        void handleBulkMetadataUpdate({
                          priority: bulkPriorityValue,
                        })
                      }}
                      disabled={isApplyingBulkAction || !bulkPriorityValue}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Set
                    </button>
                    <label className="flex items-center gap-2 rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]">
                      Type
                      <select
                        value={bulkCaseTypeValue}
                        onChange={(event) =>
                          setBulkCaseTypeValue(event.target.value as CaseTypeValue)
                        }
                        disabled={isApplyingBulkAction}
                        className="min-w-[120px] border-0 bg-transparent p-0 text-sm text-[#1b2f5b] outline-none disabled:cursor-not-allowed"
                      >
                        <option value="">Choose</option>
                        {CASE_TYPE_OPTIONS.map((caseType) => (
                          <option key={caseType} value={caseType}>
                            {caseType}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!bulkCaseTypeValue) {
                          return
                        }

                        void handleBulkMetadataUpdate({
                          caseType: bulkCaseTypeValue,
                        })
                      }}
                      disabled={isApplyingBulkAction || !bulkCaseTypeValue}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Set
                    </button>
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
                          onClick={handleBulkDeleteArchivedRequest}
                          disabled={
                            isApplyingBulkAction ||
                            selectedArchivedTests.length === 0
                          }
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Delete permanently
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            void handleBulkStatusChange('Ready')
                          }}
                          disabled={isApplyingBulkAction}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Mark Ready
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void handleBulkStatusChange('Draft')
                          }}
                          disabled={isApplyingBulkAction}
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Mark Draft
                        </button>
                        <button
                          type="button"
                          onClick={handleBulkArchiveRequest}
                          disabled={
                            isApplyingBulkAction ||
                            selectedArchivableTests.length === 0
                          }
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-55"
                        >
                          Archive
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTestIds([])
                        setIsBulkArchiveConfirming(false)
                        setIsBulkDeleteConfirming(false)
                        resetBulkMetadataFields()
                      }}
                      disabled={isApplyingBulkAction}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                {isBulkArchiveConfirming ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div>
                      <p className="m-0 text-sm font-semibold text-amber-950">
                        Archive {selectedArchivableTests.length} selected case
                        {selectedArchivableTests.length === 1 ? '' : 's'}?
                      </p>
                      <p className="m-0 mt-1 text-sm text-amber-900">
                        Archived cases leave the active repository and can be
                        restored from the Archived filter.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBulkArchiveConfirming(false)}
                        disabled={isApplyingBulkAction}
                        className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-900 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleBulkStatusChange('Archived')
                        }}
                        disabled={isApplyingBulkAction}
                        className="rounded-xl border border-amber-300 bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isApplyingBulkAction ? 'Archiving...' : 'Confirm archive'}
                      </button>
                    </div>
                  </div>
                ) : null}

                {isBulkDeleteConfirming ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                    <div>
                      <p className="m-0 text-sm font-semibold text-rose-950">
                        Permanently delete {selectedArchivedTests.length} archived
                        case{selectedArchivedTests.length === 1 ? '' : 's'}?
                      </p>
                      <p className="m-0 mt-1 text-sm text-rose-900">
                        This action cannot be undone. Deleted test cases will be
                        removed from the repository.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsBulkDeleteConfirming(false)}
                        disabled={isApplyingBulkAction}
                        className="rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-900 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void handleBulkDeleteArchived()
                        }}
                        disabled={isApplyingBulkAction}
                        className="rounded-xl border border-rose-300 bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isApplyingBulkAction ? 'Deleting...' : 'Confirm delete'}
                      </button>
                    </div>
                  </div>
                ) : null}

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
                  const sectionAllTestIds = dashboard.tests
                    .filter((test) => test.sectionId === section.id)
                    .map((test) => test.id)
                  const visibleTestIds = visibleTests.map((test) => test.id)
                  const allVisibleSelected =
                    visibleTestIds.length > 0 &&
                    visibleTestIds.every((id) => selectedTestIdSet.has(id))

                  return (
                    <section
                      key={section.id}
                      onDragOver={(event) => handleSuiteDragOver(event, section.id)}
                      onDragLeave={() =>
                        setDragOverSuiteId((current) =>
                          current === section.id ? null : current,
                        )
                      }
                      className={`overflow-visible rounded-3xl border transition ${
                        dragOverSuiteId === section.id
                          ? 'border-[#2f6fe4] bg-[#f8fbff] shadow-[0_0_0_3px_rgba(47,111,228,0.12)]'
                          : 'border-[#dfe6f4]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9eef8] bg-[#fbfcff] px-5 py-4">
                        <div className="flex min-w-0 items-center gap-4">
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
                          {dragOverSuiteId === section.id ? (
                            <span className="rounded-full bg-[#ecf2ff] px-3 py-1 text-xs font-semibold text-[#2f6fe4]">
                              Drop to move
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => toggleSuiteSelection(visibleTestIds)}
                            disabled={
                              visibleTestIds.length === 0 || isApplyingBulkAction
                            }
                            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {allVisibleSelected ? 'Clear cases' : 'Select cases'}
                          </button>
                          <button
                            type="button"
                            onClick={() => startQuickCreateCase(section.id)}
                            className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6]"
                          >
                            + Case
                          </button>
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
                                <div className="absolute right-0 top-full z-50 mt-2 min-w-[190px] rounded-2xl border border-[#dbe4f4] bg-white p-2 shadow-[0_12px_30px_rgba(31,57,102,0.12)]">
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
                                      toggleSuiteCollapsed(section.id)
                                      setOpenSuiteMenuId(null)
                                    }}
                                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#60718f] hover:bg-[#f5f8ff]"
                                  >
                                    {isCollapsed ? 'Expand' : 'Collapse'}
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
                                    Delete empty suite
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
                        <div className="bg-white">
                          <div className="px-5 py-4 text-sm text-[#63759a]">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <span>No test cases in this suite yet.</span>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startQuickCreateCase(section.id)}
                                  className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6]"
                                >
                                  + Case
                                </button>
                              </div>
                            </div>
                          </div>
                          {quickCreateSuiteId === section.id
                            ? renderQuickCreateCaseRow(section.id, project.id)
                            : null}
                        </div>
                      ) : (
                        <div className="bg-white">
                          <div className="grid grid-cols-[64px_82px_minmax(220px,1fr)_110px_110px_110px_110px_110px_96px] items-center border-t border-[#e9eef8] bg-[#fbfcff] px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
                            <div />
                            <div>ID</div>
                            <div>Title</div>
                            <div>Priority</div>
                            <div>Type</div>
                            <div>Created</div>
                            <div>Updated</div>
                            <div>Status</div>
                            <div className="text-right">Actions</div>
                          </div>
                          {quickCreateSuiteId === section.id
                            ? renderQuickCreateCaseRow(section.id, project.id)
                            : null}
                          {visibleTests.map((test) => {
                            const isReady = test.status === 'Ready'
                            const isArchived = test.status === 'Archived'
                            const isCaseMenuOpen = openCaseMenuId === test.id
                            const isPendingCaseAction = pendingCaseActionId === test.id

                            return (
                              <article
                                key={test.id}
                                onDragOver={(event) => {
                                  if (draggedTestIds.length === 0) {
                                    return
                                  }

                                  event.preventDefault()
                                  event.stopPropagation()
                                  event.dataTransfer.dropEffect = 'move'
                                  const bounds =
                                    event.currentTarget.getBoundingClientRect()
                                  const position =
                                    event.clientY - bounds.top > bounds.height / 2
                                      ? 'after'
                                      : 'before'

                                  setDragOverSuiteId(section.id)
                                  setDragOverTestDrop({
                                    testId: test.id,
                                    position,
                                  })
                                }}
                                onDragLeave={() =>
                                  setDragOverTestDrop((current) =>
                                    current?.testId === test.id ? null : current,
                                  )
                                }
                                onDrop={(event) => {
                                  const position =
                                    dragOverTestDrop?.testId === test.id
                                      ? dragOverTestDrop.position
                                      : 'before'

                                  void handleCaseDrop({
                                    event,
                                    suiteId: section.id,
                                    targetTestId: test.id,
                                    position,
                                    currentSuiteTestIds: sectionAllTestIds,
                                  })
                                }}
                                className={`grid grid-cols-[64px_82px_minmax(220px,1fr)_110px_110px_110px_110px_110px_96px] items-center border-t border-[#eef2f8] px-5 py-2.5 transition hover:bg-[#f8fbff] ${
                                  draggedTestIds.includes(test.id)
                                    ? 'bg-[#f8fbff] opacity-70'
                                    : dragOverTestDrop?.testId === test.id
                                      ? dragOverTestDrop.position === 'before'
                                        ? 'bg-[#ecf2ff] shadow-[inset_0_2px_0_#2f6fe4]'
                                        : 'bg-[#ecf2ff] shadow-[inset_0_-2px_0_#2f6fe4]'
                                    : ''
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selectedTestIdSet.has(test.id)}
                                    onChange={() => toggleTestSelection(test.id)}
                                    className="h-4 w-4 rounded border-[#c7d5ee] text-[#2f6fe4] focus:ring-[#2f6fe4]"
                                  />
                                  <button
                                    type="button"
                                    draggable
                                    onDragStart={(event) =>
                                      handleCaseDragStart(event, test.id)
                                    }
                                    onDragEnd={() => {
                                      setDraggedTestIds([])
                                      setDragOverSuiteId(null)
                                      setDragOverTestDrop(null)
                                    }}
                                    className="cursor-grab rounded-md p-1 text-[#9aa7bf] hover:bg-[#eef3fb] hover:text-[#60718f] active:cursor-grabbing"
                                    aria-label={`Drag test case ${test.id}`}
                                  >
                                    <DragHandleIcon />
                                  </button>
                                </div>
                                <Link
                                  to="/test/$testId"
                                  params={{ testId: test.id.toString() }}
                                  className="text-sm font-semibold no-underline text-[#2f6fe4]"
                                >
                                  #{test.id}
                                </Link>
                                {editingCaseTitleId === test.id ? (
                                  <input
                                    value={editingCaseTitleValue}
                                    onChange={(event) =>
                                      setEditingCaseTitleValue(event.target.value)
                                    }
                                    onBlur={() => {
                                      void saveCaseTitleEdit(test.id, test.title)
                                    }}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') {
                                        event.preventDefault()
                                        event.currentTarget.blur()
                                      }

                                      if (event.key === 'Escape') {
                                        event.preventDefault()
                                        cancelCaseTitleEdit()
                                      }
                                    }}
                                    onPointerDown={(event) => event.stopPropagation()}
                                    disabled={isPendingCaseAction}
                                    autoFocus
                                    className="min-w-0 rounded-lg border border-[#9dbaf7] bg-white px-2 py-1 text-sm font-semibold text-[#1b2f5b] outline-none disabled:cursor-not-allowed disabled:opacity-55"
                                    aria-label={`Edit title for ${test.title}`}
                                  />
                                ) : (
                                  <Link
                                    to="/test/$testId"
                                    params={{ testId: test.id.toString() }}
                                    onDoubleClick={(event) => {
                                      event.preventDefault()
                                      startCaseTitleEdit(test.id, test.title)
                                    }}
                                    className="block min-w-0 truncate pr-4 text-sm font-semibold no-underline text-[#1b2f5b] hover:text-[#2f6fe4]"
                                  >
                                    {test.title}
                                  </Link>
                                )}
                                <select
                                  value={test.priority ?? 'Medium'}
                                  onChange={(event) => {
                                    const priority = event.target
                                      .value as PriorityValue

                                    if (priority === (test.priority ?? 'Medium')) {
                                      return
                                    }

                                    void handleCaseMetadataChange(test.id, {
                                      priority,
                                    })
                                  }}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  disabled={isPendingCaseAction}
                                  className={`w-fit rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-55 ${
                                    test.priority === 'Critical'
                                      ? 'bg-rose-50 text-rose-700'
                                      : test.priority === 'High'
                                        ? 'bg-amber-50 text-amber-800'
                                        : test.priority === 'Low'
                                          ? 'bg-slate-100 text-slate-600'
                                          : 'bg-[#eef6ff] text-[#506487]'
                                  }`}
                                  aria-label={`Change priority for ${test.title}`}
                                >
                                  {PRIORITY_OPTIONS.map((priority) => (
                                    <option key={priority} value={priority}>
                                      {priority}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  value={test.caseType ?? 'Functional'}
                                  onChange={(event) => {
                                    const caseType = event.target
                                      .value as CaseTypeValue

                                    if (
                                      caseType === (test.caseType ?? 'Functional')
                                    ) {
                                      return
                                    }

                                    void handleCaseMetadataChange(test.id, {
                                      caseType,
                                    })
                                  }}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  disabled={isPendingCaseAction}
                                  className="w-fit rounded-full border-0 bg-[#f3f5f9] px-2.5 py-1 text-xs font-semibold text-[#60718f] outline-none disabled:cursor-not-allowed disabled:opacity-55"
                                  aria-label={`Change type for ${test.title}`}
                                >
                                  {CASE_TYPE_OPTIONS.map((caseType) => (
                                    <option key={caseType} value={caseType}>
                                      {caseType}
                                    </option>
                                  ))}
                                </select>
                                <span className="text-sm font-semibold text-[#60718f]">
                                  {formatRepositoryDate(test.createdAt)}
                                </span>
                                <span className="text-sm font-semibold text-[#60718f]">
                                  {formatRepositoryDate(
                                    test.updatedAt ?? test.createdAt,
                                  )}
                                </span>
                                <select
                                  value={test.status ?? 'Draft'}
                                  onChange={(event) => {
                                    const status = event.target
                                      .value as CaseStatusValue

                                    if (status === (test.status ?? 'Draft')) {
                                      return
                                    }

                                    void handleCaseStatusChange(test.id, status)
                                  }}
                                  onPointerDown={(event) => event.stopPropagation()}
                                  disabled={isPendingCaseAction}
                                  className={`w-fit rounded-full border-0 px-2.5 py-1 text-xs font-semibold outline-none disabled:cursor-not-allowed disabled:opacity-55 ${
                                    isReady
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : test.status === 'Archived'
                                        ? 'bg-amber-50 text-amber-800'
                                        : 'bg-slate-100 text-slate-700'
                                  }`}
                                  aria-label={`Change status for ${test.title}`}
                                >
                                  {CASE_STATUS_OPTIONS.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                                <div
                                  className="relative flex justify-end"
                                  onPointerDown={(event) => event.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    disabled={isPendingCaseAction}
                                    onClick={(event) => {
                                      event.stopPropagation()
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
                                    <div
                                      className="absolute right-0 top-full z-50 mt-2 min-w-[170px] rounded-2xl border border-[#dbe4f4] bg-white p-2 text-left shadow-[0_12px_30px_rgba(31,57,102,0.12)]"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      <Link
                                        to="/test/$testId"
                                        params={{ testId: test.id.toString() }}
                                        className="block rounded-xl px-3 py-2 text-sm font-semibold no-underline text-[#60718f] hover:bg-[#f5f8ff]"
                                      >
                                        Open
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => openCasePreview(test.id)}
                                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#60718f] hover:bg-[#f5f8ff]"
                                      >
                                        Preview
                                      </button>
                                      <Link
                                        to="/edit-test/$testId"
                                        params={{ testId: test.id.toString() }}
                                        className="block rounded-xl px-3 py-2 text-sm font-semibold no-underline text-[#60718f] hover:bg-[#f5f8ff]"
                                      >
                                        Edit
                                      </Link>
                                      <button
                                        type="button"
                                        disabled={isPendingCaseAction}
                                        onClick={() => handleCaseDuplicate(test.id)}
                                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#60718f] hover:bg-[#f5f8ff] disabled:cursor-not-allowed disabled:opacity-55"
                                      >
                                        Duplicate
                                      </button>
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
                          <div
                            onDragOver={(event) => {
                              if (draggedTestIds.length === 0) {
                                return
                              }

                              event.preventDefault()
                              event.stopPropagation()
                              event.dataTransfer.dropEffect = 'move'
                              setDragOverSuiteId(section.id)
                              setDragOverTestDrop(null)
                            }}
                            onDrop={(event) => {
                              void handleSuiteAppendDrop({
                                event,
                                suiteId: section.id,
                                currentSuiteTestIds: sectionAllTestIds,
                              })
                            }}
                            className={`border-t border-dashed px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] transition ${
                              dragOverSuiteId === section.id && !dragOverTestDrop
                                ? 'border-[#9dbaf7] bg-[#ecf2ff] text-[#2f6fe4]'
                                : 'border-[#e9eef8] text-[#9aa7bf]'
                            }`}
                          >
                            Drop here to move to the end
                          </div>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>
            )}
          </section>

          {previewTest ? (
            <div className="fixed inset-0 z-40">
              <button
                type="button"
                aria-label="Close case preview"
                onClick={() => setPreviewTestId(null)}
                className="absolute inset-0 bg-[#16233f]/30"
              />
              <aside className="absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col border-l border-[#dbe4f4] bg-white shadow-[0_24px_80px_rgba(31,57,102,0.22)]">
                <div className="border-b border-[#e9eef8] px-6 py-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[#7f8da9]">
                        Case #{previewTest.id}
                      </p>
                      <h2 className="m-0 mt-2 text-2xl font-bold leading-tight text-[#1b2f5b]">
                        {previewTest.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewTestId(null)}
                      className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-[#eef6ff] px-2.5 py-1 text-[#506487]">
                      {previewSuite?.name ?? 'No suite'}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 ${
                        previewTest.status === 'Ready'
                          ? 'bg-emerald-50 text-emerald-700'
                          : previewTest.status === 'Archived'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {previewTest.status ?? 'Draft'}
                    </span>
                    <span className="rounded-full bg-[#f3f5f9] px-2.5 py-1 text-[#60718f]">
                      {previewTest.priority ?? 'Medium'}
                    </span>
                    <span className="rounded-full bg-[#f3f5f9] px-2.5 py-1 text-[#60718f]">
                      {previewTest.caseType ?? 'Functional'}
                    </span>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                  {isEditingPreviewContent ? (
                    <div className="grid gap-5">
                      <RichTextEditor
                        label="Steps"
                        placeholder="Describe the test steps"
                        value={previewStepsValue}
                        onChange={setPreviewStepsValue}
                        onUploadMedia={uploadPreviewMedia}
                        isUploading={isUploadingPreviewMedia}
                      />
                      <RichTextEditor
                        label="Expected result"
                        placeholder="Describe the expected result"
                        value={previewExpectedValue}
                        onChange={setPreviewExpectedValue}
                        onUploadMedia={uploadPreviewMedia}
                        isUploading={isUploadingPreviewMedia}
                      />
                    </div>
                  ) : (
                    <>
                      <section className="mb-5">
                        <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[#7f8da9]">
                          Steps
                        </h3>
                        <div
                          className="rich-output prose prose-sm mt-3 max-w-none text-[#1b2f5b]"
                          onClick={handleRichContentClick}
                          dangerouslySetInnerHTML={{
                            __html: previewTest.steps || '<p>-</p>',
                          }}
                        />
                      </section>

                      <section>
                        <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[#7f8da9]">
                          Expected result
                        </h3>
                        <div
                          className="rich-output prose prose-sm mt-3 max-w-none text-[#1b2f5b]"
                          onClick={handleRichContentClick}
                          dangerouslySetInnerHTML={{
                            __html: previewTest.expected || '<p>-</p>',
                          }}
                        />
                      </section>

                      <section className="mt-6 border-t border-[#e9eef8] pt-5">
                        <h3 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[#7f8da9]">
                          Activity
                        </h3>
                        {previewActivities.length === 0 ? (
                          <p className="m-0 mt-3 text-sm text-[#60718f]">
                            No activity recorded yet.
                          </p>
                        ) : (
                          <div className="mt-3 grid gap-3">
                            {previewActivities.map((activity) => (
                              <div
                                key={activity.id}
                                className="rounded-xl border border-[#e9eef8] bg-[#fbfcff] px-3 py-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-[#1b2f5b]">
                                    {activity.summary}
                                  </span>
                                  <span className="text-xs font-semibold text-[#7f8da9]">
                                    {formatRepositoryDateTime(activity.createdAt)}
                                  </span>
                                </div>
                                <div className="mt-1 text-xs font-semibold text-[#60718f]">
                                  {activity.actorName ?? 'system'} ·{' '}
                                  {activity.action.replaceAll('_', ' ')}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 border-t border-[#e9eef8] px-6 py-4">
                  {isEditingPreviewContent ? (
                    <>
                      <button
                        type="button"
                        disabled={isSavingPreviewContent || isUploadingPreviewMedia}
                        onClick={() => {
                          void savePreviewContent()
                        }}
                        className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {isSavingPreviewContent ? 'Saving...' : 'Save content'}
                      </button>
                      <button
                        type="button"
                        disabled={isSavingPreviewContent}
                        onClick={cancelPreviewContentEdit}
                        className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={startPreviewContentEdit}
                      className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6]"
                    >
                      Edit content
                    </button>
                  )}
                  <Link
                    to="/edit-test/$testId"
                    params={{ testId: previewTest.id.toString() }}
                    className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#60718f]"
                  >
                    Full editor
                  </Link>
                  <Link
                    to="/test/$testId"
                    params={{ testId: previewTest.id.toString() }}
                    className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#60718f]"
                  >
                    Open full page
                  </Link>
                  {previewTest.status === 'Archived' ? (
                    <button
                      type="button"
                      disabled={pendingCaseActionId === previewTest.id}
                      onClick={() => {
                        void handleCaseRestore(previewTest.id)
                      }}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pendingCaseActionId === previewTest.id}
                      onClick={() => {
                        void handleCaseArchive(previewTest.id)
                      }}
                      className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      Archive
                    </button>
                  )}
                </div>
              </aside>
            </div>
          ) : null}
      </div>
    </main>
  )
}
