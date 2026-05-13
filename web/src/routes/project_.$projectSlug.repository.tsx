import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { BulkCaseBar } from '../components/repository/BulkCaseBar'
import { CasePreviewDrawer } from '../components/repository/CasePreviewDrawer'
import { RepositoryEmptyState } from '../components/repository/RepositoryEmptyState'
import { RepositoryErrorBanner } from '../components/repository/RepositoryErrorBanner'
import { RepositoryPanel } from '../components/repository/RepositoryPanel'
import { RepositorySuiteTree } from '../components/repository/RepositorySuiteTree'
import {
  CaseRow,
  DEFAULT_REPOSITORY_VISIBLE_COLUMNS,
  getRepositoryCaseGridTemplate,
  type RepositoryColumnKey,
  type RepositoryTableDensity,
  type RepositoryVisibleColumns,
} from '../components/repository/CaseRow'
import { RepositoryToolbar } from '../components/repository/RepositoryToolbar'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { FileInput } from '../components/ui/FileInput'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { SelectMenu } from '../components/ui/SelectMenu'
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
  deleteArchivedTestCase,
  duplicateTestCase,
  exportRepositoryCasesCsv,
  getRepositoryState,
  getTestDetail,
  importRepositoryCsv,
  moveAndReorderTestCases,
  previewRepositoryImportCsv,
  restoreTestCase,
  updateTestContent,
  updateTestTitle,
} from '../features/tests/server'
import type {
  DashboardTest,
  RepositoryImportPreview,
  RepositoryImportResult,
  RepositoryImportSource,
  TestDetail,
} from '../features/tests/server'

export const Route = createFileRoute('/project_/$projectSlug/repository')({
  validateSearch: z.object({
    q: z.string().optional().catch(''),
    suiteId: z.coerce.number().int().positive().optional().catch(undefined),
    status: z.enum(['All', 'Draft', 'Ready', 'Archived']).optional().catch('All'),
    priority: z
      .enum(['All', 'Low', 'Medium', 'High', 'Critical'])
      .optional()
      .catch('All'),
    type: z
      .enum(['All', 'Functional', 'Regression', 'Smoke', 'E2E', 'UI', 'API'])
      .optional()
      .catch('All'),
    page: z.coerce.number().int().positive().optional().catch(1),
    pageSize: z.coerce.number().int().min(25).max(200).optional().catch(100),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const projectSlug = params.projectSlug.trim()

    if (!projectSlug) {
      throw notFound()
    }

    const numericProjectId = Number(projectSlug)

    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      const legacyDashboard = await getRepositoryState({
        data: {
          projectId: numericProjectId,
          page: deps.page,
          pageSize: deps.pageSize,
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

    const dashboard = await getRepositoryState({
      data: {
        projectSlug,
        search: deps.q,
        suiteId: deps.suiteId,
        status: deps.status,
        priority: deps.priority,
        caseType: deps.type,
        page: deps.page,
        pageSize: deps.pageSize,
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
type RepositoryImportPanelSource = RepositoryImportSource
type CaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'
type CaseStatusValue = Exclude<CaseFilter, 'All'>
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
const PRIORITY_OPTIONS: PriorityValue[] = ['Low', 'Medium', 'High', 'Critical']
const CASE_TYPE_OPTIONS: CaseTypeValue[] = [
  'Functional',
  'Regression',
  'Smoke',
  'E2E',
  'UI',
  'API',
]
const REPOSITORY_COLUMNS_STORAGE_KEY = 'tms.repository.visibleColumns'
const REPOSITORY_DENSITY_STORAGE_KEY = 'tms.repository.tableDensity'

function normalizeRepositoryVisibleColumns(
  value: unknown,
): RepositoryVisibleColumns {
  if (!value || typeof value !== 'object') {
    return DEFAULT_REPOSITORY_VISIBLE_COLUMNS
  }

  const rawColumns = value as Partial<Record<RepositoryColumnKey, unknown>>
  const nextColumns: RepositoryVisibleColumns = {
    ...DEFAULT_REPOSITORY_VISIBLE_COLUMNS,
    priority: rawColumns.priority === false ? false : true,
    type: rawColumns.type === false ? false : true,
    created: rawColumns.created === false ? false : true,
    updated: rawColumns.updated === false ? false : true,
    status: rawColumns.status === false ? false : true,
  }

  if (!Object.values(nextColumns).some(Boolean)) {
    return DEFAULT_REPOSITORY_VISIBLE_COLUMNS
  }

  return nextColumns
}

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

function downloadCsvFile(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function ProjectRepositoryPage() {
  const loaderData = Route.useLoaderData()
  const search = Route.useSearch()
  const { project, dashboard: loaderDashboard } = loaderData
  const router = useRouter()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(loaderDashboard)
  const projectSlug = project.slug ?? project.id.toString()

  const [suiteName, setSuiteName] = useState('')
  const [suiteErrorMessage, setSuiteErrorMessage] = useState<string | null>(null)
  const [isSubmittingSuite, setIsSubmittingSuite] = useState(false)
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false)
  const [importSource, setImportSource] =
    useState<RepositoryImportPanelSource>('auto')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] =
    useState<RepositoryImportPreview | null>(null)
  const [importResult, setImportResult] = useState<RepositoryImportResult | null>(
    null,
  )
  const [createMissingImportSuites, setCreateMissingImportSuites] =
    useState(true)
  const [isImportConfirming, setIsImportConfirming] = useState(false)
  const [isParsingImport, setIsParsingImport] = useState(false)
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null)

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
  const [activeComposer, setActiveComposer] = useState<ComposerKind>(null)
  const [searchValue, setSearchValue] = useState(search.q ?? '')
  const [visibleColumns, setVisibleColumns] =
    useState<RepositoryVisibleColumns>(DEFAULT_REPOSITORY_VISIBLE_COLUMNS)
  const [tableDensity, setTableDensity] =
    useState<RepositoryTableDensity>('compact')
  const caseFilter = search.status ?? 'All'
  const priorityFilter = search.priority ?? 'All'
  const caseTypeFilter = search.type ?? 'All'
  const suiteFilterId = search.suiteId?.toString() ?? ALL_SUITES_FILTER
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([])
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
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
  const [previewDetailsById, setPreviewDetailsById] = useState<
    Record<number, TestDetail>
  >({})
  const [isLoadingPreviewDetail, setIsLoadingPreviewDetail] = useState(false)
  const [previewDetailErrorMessage, setPreviewDetailErrorMessage] = useState<
    string | null
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
  const [dragOverTestDrop, setDragOverTestDrop] = useState<{
    testId: number
    position: 'before' | 'after'
  } | null>(null)

  useEffect(() => {
    setDashboard(loaderDashboard)
  }, [loaderDashboard])

  useEffect(() => {
    setSearchValue(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    try {
      const storedColumns = window.localStorage.getItem(
        REPOSITORY_COLUMNS_STORAGE_KEY,
      )
      const storedDensity = window.localStorage.getItem(
        REPOSITORY_DENSITY_STORAGE_KEY,
      )

      if (storedColumns) {
        setVisibleColumns(
          normalizeRepositoryVisibleColumns(JSON.parse(storedColumns)),
        )
      }

      if (storedDensity === 'compact' || storedDensity === 'comfortable') {
        setTableDensity(storedDensity)
      }
    } catch {
      setVisibleColumns(DEFAULT_REPOSITORY_VISIBLE_COLUMNS)
      setTableDensity('compact')
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      REPOSITORY_COLUMNS_STORAGE_KEY,
      JSON.stringify(visibleColumns),
    )
  }, [visibleColumns])

  useEffect(() => {
    window.localStorage.setItem(REPOSITORY_DENSITY_STORAGE_KEY, tableDensity)
  }, [tableDensity])

  useEffect(() => {
    const nextSearch = searchValue.trim()

    if (nextSearch === (search.q ?? '')) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      updateRepositorySearch({
        q: nextSearch || undefined,
      })
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [search.q, searchValue])

  function updateRepositorySearch(
    nextSearch: Partial<{
      q: string
      suiteId: number | undefined
      status: CaseFilter
      priority: PriorityFilter
      type: CaseTypeFilter
      page: number
      pageSize: number
    }>,
  ): void {
    void navigate({
      to: '.',
      search: (current) => ({
        ...current,
        ...nextSearch,
        page: nextSearch.page ?? 1,
      }),
      replace: true,
    })
  }

  function toggleRepositoryColumn(column: RepositoryColumnKey): void {
    setVisibleColumns((currentColumns) => {
      const visibleColumnCount =
        Object.values(currentColumns).filter(Boolean).length

      if (currentColumns[column] && visibleColumnCount <= 1) {
        return currentColumns
      }

      return {
        ...currentColumns,
        [column]: !currentColumns[column],
      }
    })
  }

  function updateRepositoryTests(
    testIds: number[],
    updater: (test: DashboardTest) => DashboardTest,
  ): void {
    const testIdSet = new Set(testIds)

    setDashboard((current) => ({
      ...current,
      tests: current.tests.map((test) =>
        testIdSet.has(test.id) ? updater(test) : test,
      ),
    }))
  }

  function removeRepositoryTests(testIds: number[]): void {
    const testIdSet = new Set(testIds)

    setDashboard((current) => ({
      ...current,
      tests: current.tests.filter((test) => !testIdSet.has(test.id)),
      suiteStats: current.suiteStats.map((stats) => {
        const removedTests = current.tests.filter(
          (test) => test.sectionId === stats.sectionId && testIdSet.has(test.id),
        )

        if (removedTests.length === 0) {
          return stats
        }

        return {
          ...stats,
          totalCases: Math.max(0, stats.totalCases - removedTests.length),
          activeCases: Math.max(
            0,
            stats.activeCases -
              removedTests.filter((test) => test.status !== 'Archived').length,
          ),
          readyCases: Math.max(
            0,
            stats.readyCases -
              removedTests.filter((test) => test.status === 'Ready').length,
          ),
          draftCases: Math.max(
            0,
            stats.draftCases -
              removedTests.filter((test) => test.status === 'Draft').length,
          ),
          archivedCases: Math.max(
            0,
            stats.archivedCases -
              removedTests.filter((test) => test.status === 'Archived').length,
          ),
        }
      }),
    }))
  }

  function addRepositoryTest(test: DashboardTest): void {
    const normalizedStatus = test.status ?? 'Draft'
    const matchesLifecycleFilter =
      caseFilter === 'All'
        ? normalizedStatus !== 'Archived'
        : normalizedStatus === caseFilter
    const matchesSuiteFilter =
      suiteFilterId === ALL_SUITES_FILTER || String(test.sectionId) === suiteFilterId
    const matchesPriorityFilter =
      priorityFilter === 'All' || (test.priority ?? 'Medium') === priorityFilter
    const matchesTypeFilter =
      caseTypeFilter === 'All' || (test.caseType ?? 'Functional') === caseTypeFilter
    const normalizedTitle = test.title.toLowerCase()
    const normalizedQuery = searchValue.trim().toLowerCase()
    const matchesSearch =
      normalizedQuery.length === 0 ||
      normalizedTitle.includes(normalizedQuery) ||
      String(test.id).includes(normalizedQuery)
    const shouldAppearInCurrentView =
      matchesLifecycleFilter &&
      matchesSuiteFilter &&
      matchesPriorityFilter &&
      matchesTypeFilter &&
      matchesSearch

    setDashboard((current) => {
      const nextFilteredTotal = shouldAppearInCurrentView
        ? current.pagination.totalCases + 1
        : current.pagination.totalCases

      return {
        ...current,
        tests: shouldAppearInCurrentView ? [...current.tests, test] : current.tests,
        suiteStats: current.suiteStats.map((stats) =>
          stats.sectionId === test.sectionId
            ? {
                ...stats,
                totalCases: stats.totalCases + 1,
                activeCases:
                  normalizedStatus === 'Archived'
                    ? stats.activeCases
                    : stats.activeCases + 1,
                readyCases:
                  normalizedStatus === 'Ready'
                    ? stats.readyCases + 1
                    : stats.readyCases,
                draftCases:
                  normalizedStatus === 'Draft'
                    ? stats.draftCases + 1
                    : stats.draftCases,
                archivedCases:
                  normalizedStatus === 'Archived'
                    ? stats.archivedCases + 1
                    : stats.archivedCases,
              }
            : stats,
        ),
        pagination: {
          ...current.pagination,
          totalCases: nextFilteredTotal,
          totalPages: Math.max(
            1,
            Math.ceil(nextFilteredTotal / current.pagination.pageSize),
          ),
        },
        stats: {
          ...current.stats,
          totalCases: current.stats.totalCases + 1,
          activeCases:
            normalizedStatus === 'Archived'
              ? current.stats.activeCases
              : current.stats.activeCases + 1,
          readyCases:
            normalizedStatus === 'Ready'
              ? current.stats.readyCases + 1
              : current.stats.readyCases,
          archivedCases:
            normalizedStatus === 'Archived'
              ? current.stats.archivedCases + 1
              : current.stats.archivedCases,
        },
      }
    })
  }

  function addRepositorySuite(section: {
    id: number
    name: string
    projectId: number
  }): void {
    setDashboard((current) => ({
      ...current,
      sections: [
        ...current.sections,
        {
          ...section,
          projectName: project.name,
          projectSlug: project.slug,
        },
      ],
      suiteStats: [
        ...current.suiteStats,
        {
          sectionId: section.id,
          totalCases: 0,
          activeCases: 0,
          readyCases: 0,
          draftCases: 0,
          archivedCases: 0,
        },
      ],
    }))
  }

  function adjustSuiteStatsForStatusChanges(
    testIds: number[],
    nextStatusForTest: (test: DashboardTest) => CaseStatusValue,
  ): void {
    const testIdSet = new Set(testIds)

    setDashboard((current) => {
      const deltasBySuiteId = new Map<
        number,
        {
          activeCases: number
          readyCases: number
          draftCases: number
          archivedCases: number
        }
      >()

      for (const test of current.tests) {
        if (!test.sectionId || !testIdSet.has(test.id)) {
          continue
        }

        const previousStatus = test.status ?? 'Draft'
        const nextStatus = nextStatusForTest(test)

        if (previousStatus === nextStatus) {
          continue
        }

        const delta = deltasBySuiteId.get(test.sectionId) ?? {
          activeCases: 0,
          readyCases: 0,
          draftCases: 0,
          archivedCases: 0,
        }

        if (previousStatus !== 'Archived') {
          delta.activeCases -= 1
        }

        if (nextStatus !== 'Archived') {
          delta.activeCases += 1
        }

        if (previousStatus === 'Ready') {
          delta.readyCases -= 1
        } else if (previousStatus === 'Draft') {
          delta.draftCases -= 1
        } else if (previousStatus === 'Archived') {
          delta.archivedCases -= 1
        }

        if (nextStatus === 'Ready') {
          delta.readyCases += 1
        } else if (nextStatus === 'Draft') {
          delta.draftCases += 1
        } else if (nextStatus === 'Archived') {
          delta.archivedCases += 1
        }

        deltasBySuiteId.set(test.sectionId, delta)
      }

      if (deltasBySuiteId.size === 0) {
        return current
      }

      return {
        ...current,
        suiteStats: current.suiteStats.map((stats) => {
          const delta = deltasBySuiteId.get(stats.sectionId)

          if (!delta) {
            return stats
          }

          return {
            ...stats,
            activeCases: Math.max(0, stats.activeCases + delta.activeCases),
            readyCases: Math.max(0, stats.readyCases + delta.readyCases),
            draftCases: Math.max(0, stats.draftCases + delta.draftCases),
            archivedCases: Math.max(
              0,
              stats.archivedCases + delta.archivedCases,
            ),
          }
        }),
      }
    })
  }

  const allTestIdsBySectionId = useMemo(() => {
    const groupedIds = new Map<number, number[]>()

    for (const test of dashboard.tests) {
      if (test.sectionId === null) {
        continue
      }

      const existingIds = groupedIds.get(test.sectionId) ?? []
      existingIds.push(test.id)
      groupedIds.set(test.sectionId, existingIds)
    }

    return groupedIds
  }, [dashboard.tests])
  const totalSuites = dashboard.sections.length

  const selectedTestIdSet = useMemo(
    () => new Set(selectedTestIds),
    [selectedTestIds],
  )
  const selectedTests = useMemo(
    () => dashboard.tests.filter((test) => selectedTestIdSet.has(test.id)),
    [dashboard.tests, selectedTestIdSet],
  )
  const repositoryGridStyle = useMemo(
    () => ({
      gridTemplateColumns: getRepositoryCaseGridTemplate(visibleColumns),
    }),
    [visibleColumns],
  )
  const selectedArchivableTests = selectedTests.filter(
    (test) => test.status !== 'Archived',
  )
  const selectedArchivedTests = selectedTests.filter(
    (test) => test.status === 'Archived',
  )
  const importMissingSuitesSummary = importPreview
    ? importPreview.missingSuites.length > 8
      ? `${importPreview.missingSuites.slice(0, 8).join(', ')} and ${
          importPreview.missingSuites.length - 8
        } more`
      : importPreview.missingSuites.join(', ')
    : ''
  const previewTest =
    previewTestId === null
      ? null
      : dashboard.tests.find((test) => test.id === previewTestId) ?? null
  const previewTestDetail =
    previewTestId === null ? null : previewDetailsById[previewTestId] ?? null
  const previewDrawerTest =
    previewTestDetail ??
    (previewTest
      ? {
          ...previewTest,
          steps: null,
          expected: null,
        }
      : null)
  const previewSuite =
    previewTestDetail?.sectionName
      ? { name: previewTestDetail.sectionName }
      : previewTest?.sectionId == null
      ? null
      : dashboard.sections.find((section) => section.id === previewTest.sectionId) ??
        null
  const previewActivities = previewTestDetail?.activities.slice(0, 12) ?? []
  const selectedSuite =
    suiteFilterId === ALL_SUITES_FILTER
      ? null
      : dashboard.sections.find((section) => section.id.toString() === suiteFilterId) ??
        null

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
    let isCancelled = false

    if (previewTestId === null) {
      setIsLoadingPreviewDetail(false)
      setPreviewDetailErrorMessage(null)
      return
    }

    if (previewDetailsById[previewTestId]) {
      setIsLoadingPreviewDetail(false)
      setPreviewDetailErrorMessage(null)
      return
    }

    setIsLoadingPreviewDetail(true)
    setPreviewDetailErrorMessage(null)

    getTestDetail({
      data: {
        id: previewTestId,
      },
    })
      .then((detail) => {
        if (isCancelled) {
          return
        }

        setPreviewDetailsById((current) => ({
          ...current,
          [detail.id]: detail,
        }))
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setPreviewDetailErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to load test case content.',
        )
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingPreviewDetail(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [previewDetailsById, previewTestId])

  useEffect(() => {
    if (!previewTestDetail) {
      setIsEditingPreviewContent(false)
      setPreviewStepsValue('')
      setPreviewExpectedValue('')
      return
    }

    if (!isEditingPreviewContent) {
      setPreviewStepsValue(previewTestDetail.steps ?? '')
      setPreviewExpectedValue(previewTestDetail.expected ?? '')
    }
  }, [isEditingPreviewContent, previewTestDetail])

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
    if (!previewTestDetail) {
      return
    }

    setCaseActionErrorMessage(null)
    setPreviewStepsValue(previewTestDetail.steps ?? '')
    setPreviewExpectedValue(previewTestDetail.expected ?? '')
    setIsEditingPreviewContent(true)
  }

  function cancelPreviewContentEdit(): void {
    setIsEditingPreviewContent(false)
    setPreviewStepsValue(previewTestDetail?.steps ?? '')
    setPreviewExpectedValue(previewTestDetail?.expected ?? '')
  }

  async function uploadPreviewMedia(file: File): Promise<string> {
    setIsUploadingPreviewMedia(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadTestMedia({
        data: formData,
      })

      return result.url
    } finally {
      setIsUploadingPreviewMedia(false)
    }
  }

  async function savePreviewContent(): Promise<void> {
    if (!previewTestDetail) {
      return
    }

    setCaseActionErrorMessage(null)
    setIsSavingPreviewContent(true)

    try {
      await updateTestContent({
        data: {
          id: previewTestDetail.id,
          steps: previewStepsValue,
          expected: previewExpectedValue,
        },
      })

      setPreviewDetailsById((current) => ({
        ...current,
        [previewTestDetail.id]: {
          ...previewTestDetail,
          steps: previewStepsValue,
          expected: previewExpectedValue,
          updatedAt: new Date().toISOString(),
        },
      }))
      updateRepositoryTests([previewTestDetail.id], (test) => ({
        ...test,
        updatedAt: new Date().toISOString(),
      }))
      setIsEditingPreviewContent(false)
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
      const statusUpdateIds =
        status === 'Archived'
          ? selectedArchivableTests.map((test) => test.id)
          : selectedTestIds

      await bulkUpdateTestStatus({
        data: {
          ids: statusUpdateIds,
          status,
        },
      })

      const updatedAt = new Date().toISOString()
      adjustSuiteStatsForStatusChanges(statusUpdateIds, () => status)
      updateRepositoryTests(statusUpdateIds, (test) => ({
        ...test,
        status,
        archivedFromStatus:
          status === 'Archived'
            ? test.status === 'Ready' || test.status === 'Draft'
              ? test.status
              : test.archivedFromStatus ?? 'Draft'
            : null,
        updatedAt,
      }))
      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
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

      const updatedAt = new Date().toISOString()
      updateRepositoryTests(selectedTestIds, (test) => ({
        ...test,
        priority: metadata.priority ?? test.priority,
        caseType: metadata.caseType ?? test.caseType,
        updatedAt,
      }))
      setSelectedTestIds([])
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

      const updatedAt = new Date().toISOString()
      updateRepositoryTests([testId], (test) => ({
        ...test,
        priority: metadata.priority ?? test.priority,
        caseType: metadata.caseType ?? test.caseType,
        updatedAt,
      }))
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

      const updatedAt = new Date().toISOString()
      adjustSuiteStatsForStatusChanges([testId], () => status)
      updateRepositoryTests([testId], (test) => ({
        ...test,
        status,
        archivedFromStatus:
          status === 'Archived'
            ? test.status === 'Ready' || test.status === 'Draft'
              ? test.status
              : test.archivedFromStatus ?? 'Draft'
            : null,
        updatedAt,
      }))
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

      updateRepositoryTests([testId], (test) => ({
        ...test,
        title: nextTitle,
        updatedAt: new Date().toISOString(),
      }))
      cancelCaseTitleEdit()
    } catch (error) {
      setCaseActionErrorMessage(
        error instanceof Error ? error.message : 'Failed to update test case title.',
      )
    } finally {
      setPendingCaseActionId(null)
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

      adjustSuiteStatsForStatusChanges(selectedTestIds, (test) =>
        test.archivedFromStatus ?? 'Draft',
      )
      updateRepositoryTests(selectedTestIds, (test) => ({
        ...test,
        status: test.archivedFromStatus ?? 'Draft',
        archivedFromStatus: null,
        updatedAt: new Date().toISOString(),
      }))
      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
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

      removeRepositoryTests(selectedArchivedTests.map((test) => test.id))
      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
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

  async function handleExportCsv(scope: 'filtered' | 'selected'): Promise<void> {
    const ids = scope === 'selected' ? selectedTestIds : []

    if (scope === 'selected' && ids.length === 0) {
      setBulkActionErrorMessage('Select at least one test case to export.')
      return
    }

    setCaseActionErrorMessage(null)
    setBulkActionErrorMessage(null)
    setIsExportingCsv(true)

    try {
      const result = await exportRepositoryCasesCsv({
        data: {
          projectSlug,
          search: search.q,
          suiteId: search.suiteId,
          status: caseFilter,
          priority: priorityFilter,
          caseType: caseTypeFilter,
          ids,
        },
      })

      if (result.rowCount === 0) {
        const message =
          scope === 'selected'
            ? 'No selected test cases were available to export.'
            : 'No test cases match the current filters.'

        if (scope === 'selected') {
          setBulkActionErrorMessage(message)
        } else {
          setCaseActionErrorMessage(message)
        }

        return
      }

      downloadCsvFile(result.filename, result.csv)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to export test cases.'

      if (scope === 'selected') {
        setBulkActionErrorMessage(message)
      } else {
        setCaseActionErrorMessage(message)
      }
    } finally {
      setIsExportingCsv(false)
    }
  }

  async function handleImportPreview(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()

    if (!importFile) {
      setImportErrorMessage('Choose a CSV file first.')
      return
    }

    setImportErrorMessage(null)
    setImportPreview(null)
    setImportResult(null)
    setIsImportConfirming(false)
    setIsParsingImport(true)

    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('projectId', project.id.toString())
      formData.append('source', importSource)
      formData.append(
        'createMissingSuites',
        createMissingImportSuites ? 'true' : 'false',
      )

      const result = await previewRepositoryImportCsv({
        data: formData,
      })

      setImportPreview(result)
    } catch (error) {
      setImportErrorMessage(
        error instanceof Error ? error.message : 'Failed to preview CSV import.',
      )
    } finally {
      setIsParsingImport(false)
    }
  }

  async function handleImportConfirm(): Promise<void> {
    if (!importFile || !importPreview) {
      setImportErrorMessage('Preview a CSV file before importing.')
      return
    }

    if (importPreview.errorRows > 0) {
      setImportErrorMessage('Resolve import errors before creating test cases.')
      return
    }

    setImportErrorMessage(null)
    setImportResult(null)
    setIsImportingCsv(true)

    try {
      const formData = new FormData()
      formData.append('file', importFile)
      formData.append('projectId', project.id.toString())
      formData.append('source', importSource)
      formData.append(
        'createMissingSuites',
        createMissingImportSuites ? 'true' : 'false',
      )

      const result = await importRepositoryCsv({
        data: formData,
      })

      setImportResult(result)
      setIsImportConfirming(false)
      setImportPreview(null)
      setImportFile(null)
      await router.invalidate()
    } catch (error) {
      setImportErrorMessage(
        error instanceof Error ? error.message : 'Failed to import CSV.',
      )
    } finally {
      setIsImportingCsv(false)
    }
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
      adjustSuiteStatsForStatusChanges([testId], () => 'Archived')
      updateRepositoryTests([testId], (test) => ({
        ...test,
        status: 'Archived',
        archivedFromStatus:
          test.status === 'Ready' || test.status === 'Draft'
            ? test.status
            : test.archivedFromStatus ?? 'Draft',
        updatedAt: new Date().toISOString(),
      }))
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
      adjustSuiteStatsForStatusChanges([testId], (test) =>
        test.archivedFromStatus ?? 'Draft',
      )
      updateRepositoryTests([testId], (test) => ({
        ...test,
        status: test.archivedFromStatus ?? 'Draft',
        archivedFromStatus: null,
        updatedAt: new Date().toISOString(),
      }))
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
      removeRepositoryTests([testId])
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
      const result = await createSuite({
        data: {
          projectId: project.id,
          name: suiteName,
        },
      })

      addRepositorySuite({
        id: result.id,
        name: suiteName.trim(),
        projectId: project.id,
      })
      setSuiteName('')
      setActiveComposer(null)
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
      setDashboard((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === suiteId ? { ...section, name: editingSuiteName } : section,
        ),
      }))
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
      setDashboard((current) => ({
        ...current,
        sections: current.sections.filter((section) => section.id !== suiteId),
        suiteStats: current.suiteStats.filter(
          (stats) => stats.sectionId !== suiteId,
        ),
      }))
      if (suiteFilterId === suiteId.toString()) {
        updateRepositorySearch({
          suiteId: undefined,
        })
      }
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
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            description="Browse suites, test cases, filters, and bulk repository actions."
            actions={
              <>
                <Button
                  onClick={() =>
                    setActiveComposer((current) => (current === 'suite' ? null : 'suite'))
                  }
                  variant="secondary"
                >
                  + Suite
                </Button>
                <Button
                  onClick={() => {
                    setIsImportPanelOpen((current) => !current)
                    setImportErrorMessage(null)
                    setImportResult(null)
                    setIsImportConfirming(false)
                  }}
                  variant="secondary"
                >
                  Import CSV
                </Button>
                <LinkButton
                  to="/create-test"
                  search={{ projectId: project.id }}
                  variant="primary"
                >
                  + Test case
                </LinkButton>
              </>
            }
          />

          <section className="workspace-toolbar-surface repository-summary-strip">
            <div className="workspace-toolbar-surface__copy">
            {[
              { label: 'Suites', value: totalSuites },
              { label: 'Cases', value: dashboard.stats.activeCases },
              { label: 'Ready', value: dashboard.stats.readyCases },
              { label: 'Archived', value: dashboard.stats.archivedCases },
            ].map((item) => (
              <div key={item.label} className="tms-chip repository-summary-strip__chip">
                <span className="text-[var(--tms-text)]">{item.value}</span> {item.label}
              </div>
            ))}
            </div>
          </section>

          {activeComposer ? (
            <section className="tms-panel mb-6 px-6 py-5">
              <form
                className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]"
                onSubmit={handleCreateSuite}
              >
                <div className="text-base font-semibold text-[var(--tms-text)] md:col-span-2">
                  Create suite
                </div>
                <Input
                  value={suiteName}
                  onChange={(event) => setSuiteName(event.target.value)}
                  className="px-3 py-2 text-sm"
                  placeholder="Checkout smoke"
                />
                <Button
                  type="submit"
                  disabled={isSubmittingSuite || !dashboard.databaseConfigured}
                  className="border-[var(--status-ready-border)] bg-[var(--status-ready-bg)] px-3 py-2 text-sm text-[var(--status-ready-text)]"
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

          {isImportPanelOpen ? (
            <section className="tms-panel mb-6 px-4 py-4 sm:px-5">
              <form
                className="grid gap-3 lg:grid-cols-[180px_minmax(0,1fr)_140px]"
                onSubmit={(event) => {
                  void handleImportPreview(event)
                }}
              >
                <div className="lg:col-span-3">
                  <div className="text-base font-semibold text-[var(--tms-text)]">
                    Import CSV
                  </div>
                  <div className="mt-1 text-sm text-[var(--tms-text-muted)]">
                    Preview, validate, confirm, then create test cases.
                  </div>
                </div>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">
                  Source
                  <SelectMenu
                    value={importSource}
                    onValueChange={(value) => {
                      setImportSource(value as RepositoryImportPanelSource)
                      setImportPreview(null)
                    }}
                    options={[
                      { value: 'auto', label: 'Auto detect' },
                      { value: 'native', label: 'TMS CSV' },
                      { value: 'testmo', label: 'Testmo CSV' },
                    ]}
                    aria-label="Import source"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">
                  CSV file
                  <FileInput
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      setImportFile(event.currentTarget.files?.[0] ?? null)
                      setImportPreview(null)
                      setImportResult(null)
                      setIsImportConfirming(false)
                      setImportErrorMessage(null)
                    }}
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    disabled={isParsingImport || !importFile}
                    variant="primary"
                    className="w-full"
                  >
                    {isParsingImport ? 'Parsing...' : 'Preview'}
                  </Button>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--tms-text)] lg:col-span-3">
                  <Checkbox
                    checked={createMissingImportSuites}
                    onChange={(event) => {
                      setCreateMissingImportSuites(event.currentTarget.checked)
                      setImportPreview(null)
                      setImportResult(null)
                      setIsImportConfirming(false)
                    }}
                  />
                  Create missing suites during import
                </label>
              </form>

              {importErrorMessage ? (
                <Alert variant="danger" className="mt-3">
                  {importErrorMessage}
                </Alert>
              ) : null}

              {importResult ? (
                <Alert variant="success" className="mt-3">
                  Imported {importResult.importedCases} cases
                  {importResult.createdSuites > 0
                    ? ` and created ${importResult.createdSuites} suites`
                    : ''}
                  .
                </Alert>
              ) : null}

              {importPreview ? (
                <div className="mt-4 grid gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--tms-text-muted)]">
                    <span className="tms-chip">
                      {importPreview.totalRows} rows
                    </span>
                    <span className="tms-chip tms-chip-status-ready">
                      {importPreview.validRows} valid
                    </span>
                    <span className="tms-chip tms-chip-status-draft">
                      {importPreview.warningRows} warnings
                    </span>
                    <span className="tms-chip tms-chip-status-archived">
                      {importPreview.errorRows} errors
                    </span>
                    <span className="tms-chip">
                      {importPreview.duplicateRows} duplicates
                    </span>
                    <span className="tms-chip">
                      {importPreview.missingSuites.length} missing suites
                    </span>
                    <span>
                      Detected: {importPreview.detectedSource === 'testmo' ? 'Testmo CSV' : 'TMS CSV'}
                    </span>
                  </div>
                  {importPreview.missingSuites.length > 0 ? (
                    <Alert
                      variant={
                        createMissingImportSuites && importPreview.errorRows === 0
                          ? 'info'
                          : 'warning'
                      }
                    >
                      Missing suites: {importMissingSuitesSummary}.
                      {createMissingImportSuites
                        ? ' They will be created during import.'
                        : ' Enable suite creation or create them manually before import.'}
                    </Alert>
                  ) : null}
                  <div className="overflow-x-auto rounded-[var(--tms-radius-md)] border border-[var(--tms-border-subtle)]">
                    <div className="grid min-w-[980px] grid-cols-[70px_1.2fr_1fr_100px_110px_110px_1.4fr] border-b border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                      <span>Row</span>
                      <span>Title</span>
                      <span>Suite</span>
                      <span>Status</span>
                      <span>Priority</span>
                      <span>Type</span>
                      <span>Notes</span>
                    </div>
                    {importPreview.previewRows.map((row) => (
                      <div
                        key={row.rowNumber}
                        className="grid min-w-[980px] grid-cols-[70px_1.2fr_1fr_100px_110px_110px_1.4fr] gap-0 border-b border-[var(--tms-border-subtle)] px-3 py-2 text-sm last:border-b-0"
                      >
                        <span className="text-[var(--tms-text-muted)]">
                          {row.rowNumber}
                        </span>
                        <span className="min-w-0 truncate font-semibold">
                          {row.title || '-'}
                        </span>
                        <span className="min-w-0 truncate">{row.suite || '-'}</span>
                        <span>{row.status}</span>
                        <span>{row.priority}</span>
                        <span>{row.caseType}</span>
                        <span className="min-w-0 text-[var(--tms-text-muted)]">
                          {[
                            ...row.errors,
                            ...row.warnings,
                            row.duplicate !== 'none'
                              ? `Duplicate: ${row.duplicate}`
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ') || 'OK'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {importPreview.totalRows > importPreview.previewRows.length ? (
                    <div className="text-xs text-[var(--tms-text-muted)]">
                      Showing first {importPreview.previewRows.length} rows only.
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--tms-radius-md)] border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-3 py-3">
                    <div className="text-sm text-[var(--tms-text-muted)]">
                      {importPreview.errorRows > 0
                        ? 'Import is blocked until CSV errors are resolved.'
                        : isImportConfirming
                          ? `Confirm import of ${importPreview.validRows} cases.`
                          : 'Review the preview before creating test cases.'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isImportConfirming ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isImportingCsv}
                            onClick={() => setIsImportConfirming(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            variant="primary"
                            disabled={isImportingCsv}
                            onClick={() => {
                              void handleImportConfirm()
                            }}
                          >
                            {isImportingCsv ? 'Importing...' : 'Confirm import'}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          disabled={importPreview.errorRows > 0 || isImportingCsv}
                          onClick={() => setIsImportConfirming(true)}
                        >
                          Continue to import
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <RepositoryPanel>
            <RepositoryToolbar
              visibleCount={dashboard.pagination.totalCases}
              searchValue={searchValue}
              priorityFilter={priorityFilter}
              caseTypeFilter={caseTypeFilter}
              caseFilter={caseFilter}
              priorityOptions={PRIORITY_OPTIONS}
              caseTypeOptions={CASE_TYPE_OPTIONS}
              visibleColumns={visibleColumns}
              density={tableDensity}
              isExporting={isExportingCsv}
              onSearchChange={(value) => {
                clearBulkConfirmations()
                setSearchValue(value)
              }}
              onToggleColumn={toggleRepositoryColumn}
              onDensityChange={setTableDensity}
              onPriorityFilterChange={(value) => {
                clearBulkConfirmations()
                updateRepositorySearch({
                  priority: value,
                })
              }}
              onCaseTypeFilterChange={(value) => {
                clearBulkConfirmations()
                updateRepositorySearch({
                  type: value,
                })
              }}
              onCaseFilterChange={(value) => {
                clearBulkConfirmations()
                updateRepositorySearch({
                  status: value,
                })
              }}
              onExportFiltered={() => {
                void handleExportCsv('filtered')
              }}
            />

            {selectedTestIds.length > 0 ? (
              <BulkCaseBar
                selectedCount={selectedTestIds.length}
                suites={dashboard.sections}
                priorities={PRIORITY_OPTIONS}
                caseTypes={CASE_TYPE_OPTIONS}
                isApplying={isApplyingBulkAction}
                isExporting={isExportingCsv}
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
                onExportSelected={() => {
                  void handleExportCsv('selected')
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

            <div className="repository-browser">
              <RepositorySuiteTree
                sections={dashboard.sections}
                suiteStats={dashboard.suiteStats}
                selectedSuiteId={suiteFilterId}
                allSuitesFilter={ALL_SUITES_FILTER}
                totalActiveCases={dashboard.stats.activeCases}
                editingSuiteId={editingSuiteId}
                editingSuiteName={editingSuiteName}
                deleteConfirmSuiteId={deleteConfirmSuiteId}
                openSuiteMenuId={openSuiteMenuId}
                pendingSuiteActionById={pendingSuiteActionById}
                suiteActionErrorMessage={suiteActionErrorMessage}
                suiteActionSuiteId={suiteActionSuiteId}
                onCreateSuite={() =>
                  setActiveComposer((current) =>
                    current === 'suite' ? null : 'suite',
                  )
                }
                onCreateCase={(suiteId) => {
                  void navigate({
                    to: '/create-test',
                    search: {
                      projectId: project.id,
                      suiteId,
                    },
                  })
                }}
                onSelectSuite={(value) => {
                  clearBulkConfirmations()
                  setSelectedTestIds([])
                  updateRepositorySearch({
                    suiteId:
                      value === ALL_SUITES_FILTER ? undefined : Number(value),
                  })
                }}
                onStartRenameSuite={startRenameSuite}
                onRenameSuite={(event, suiteId) => {
                  void handleRenameSuite(event, suiteId)
                }}
                onEditingSuiteNameChange={setEditingSuiteName}
                onCancelRenameSuite={() => {
                  setEditingSuiteId(null)
                  setEditingSuiteName('')
                  setSuiteActionSuiteId(null)
                }}
                onRequestDeleteSuite={(suiteId) => {
                  setSuiteActionErrorMessage(null)
                  setSuiteActionSuiteId(suiteId)
                  setDeleteConfirmSuiteId(suiteId)
                  setOpenSuiteMenuId(null)
                }}
                onConfirmDeleteSuite={(suiteId) => {
                  void handleDeleteSuite(suiteId)
                }}
                onCancelDeleteSuite={() => {
                  setDeleteConfirmSuiteId(null)
                  setSuiteActionSuiteId(null)
                }}
                onToggleSuiteMenu={(suiteId) => {
                  setSuiteActionErrorMessage(null)
                  setOpenSuiteMenuId((current) =>
                    current === suiteId ? null : suiteId,
                  )
                }}
                onCloseSuiteMenu={() => setOpenSuiteMenuId(null)}
              />

              <section className="repository-browser-table">
                <div className="repository-browser-table__header">
                  <div>
                    <div className="tms-kicker">
                      {selectedSuite ? 'Suite' : 'Repository'}
                    </div>
                    <div className="repository-browser-table__title">
                      {selectedSuite?.name ?? 'All test cases'}
                    </div>
                  </div>
                  <div className="repository-browser-table__meta">
                    {dashboard.pagination.totalCases} visible
                  </div>
                </div>
                <div
                  className={`tms-table-header repository-case-grid px-3 sm:px-4 ${
                    tableDensity === 'compact' ? 'py-1.5' : 'py-2'
                  }`}
                  style={repositoryGridStyle}
                >
                  <span />
                  <span>ID</span>
                  <span>Title</span>
                  {visibleColumns.priority ? <span>Priority</span> : null}
                  {visibleColumns.type ? <span>Type</span> : null}
                  {visibleColumns.created ? <span>Created</span> : null}
                  {visibleColumns.updated ? <span>Updated</span> : null}
                  {visibleColumns.status ? <span>Status</span> : null}
                  <span>Actions</span>
                </div>

                {dashboard.sections.length === 0 ? (
                  <RepositoryEmptyState reason="no-suites" />
                ) : dashboard.tests.length === 0 ? (
                  <RepositoryEmptyState
                    reason="no-matching-cases"
                    caseFilter={caseFilter}
                  />
                ) : (
                  dashboard.tests.map((test) => {
                    const sectionId = test.sectionId ?? 0
                    const sectionAllTestIds =
                      allTestIdsBySectionId.get(sectionId) ?? []

                    return (
                      <CaseRow
                        key={test.id}
                        test={test}
                        isSelected={selectedTestIdSet.has(test.id)}
                        isMenuOpen={openCaseMenuId === test.id}
                        isPending={pendingCaseActionId === test.id}
                        isEditingTitle={editingCaseTitleId === test.id}
                        editingTitleValue={editingCaseTitleValue}
                        draggedTestIds={draggedTestIds}
                        dragOverDrop={dragOverTestDrop}
                        priorityOptions={PRIORITY_OPTIONS}
                        caseTypeOptions={CASE_TYPE_OPTIONS}
                        statusOptions={CASE_STATUS_OPTIONS}
                        visibleColumns={visibleColumns}
                        density={tableDensity}
                        formatDate={formatRepositoryDate}
                        onToggleSelection={() => toggleTestSelection(test.id)}
                        onDragStart={(event) => handleCaseDragStart(event, test.id)}
                        onDragEnd={() => {
                          setDraggedTestIds([])
                          setDragOverTestDrop(null)
                        }}
                        onDragOver={(_event, testId, position) => {
                          setDragOverTestDrop({
                            testId,
                            position,
                          })
                        }}
                        onDragLeave={(testId) => {
                          setDragOverTestDrop((current) =>
                            current?.testId === testId ? null : current,
                          )
                        }}
                        onDrop={(event) => {
                          if (!test.sectionId) {
                            return
                          }

                          const position =
                            dragOverTestDrop?.testId === test.id
                              ? dragOverTestDrop.position
                              : 'before'

                          void handleCaseDrop({
                            event,
                            suiteId: test.sectionId,
                            targetTestId: test.id,
                            position,
                            currentSuiteTestIds: sectionAllTestIds,
                          })
                        }}
                        onTitleEditChange={setEditingCaseTitleValue}
                        onStartTitleEdit={() =>
                          startCaseTitleEdit(test.id, test.title)
                        }
                        onSaveTitleEdit={() =>
                          void saveCaseTitleEdit(test.id, test.title)
                        }
                        onCancelTitleEdit={cancelCaseTitleEdit}
                        onPriorityChange={(priority) => {
                          if (priority === (test.priority ?? 'Medium')) {
                            return
                          }

                          void handleCaseMetadataChange(test.id, { priority })
                        }}
                        onCaseTypeChange={(caseType) => {
                          if (caseType === (test.caseType ?? 'Functional')) {
                            return
                          }

                          void handleCaseMetadataChange(test.id, { caseType })
                        }}
                        onStatusChange={(status) => {
                          if (status === (test.status ?? 'Draft')) {
                            return
                          }

                          void handleCaseStatusChange(test.id, status)
                        }}
                        onToggleMenu={() => {
                          setCaseActionErrorMessage(null)
                          setOpenCaseMenuId((current) =>
                            current === test.id ? null : test.id,
                          )
                        }}
                        onCloseMenu={() => setOpenCaseMenuId(null)}
                        onPreview={() => openCasePreview(test.id)}
                        onDuplicate={() => {
                          void handleCaseDuplicate(test.id)
                        }}
                        onRestore={() => {
                          void handleCaseRestore(test.id)
                        }}
                        onDeletePermanently={() => {
                          void handleCaseDeletePermanently(test.id)
                        }}
                        onArchive={() => {
                          void handleCaseArchive(test.id)
                        }}
                      />
                    )
                  })
                )}
              </section>
            </div>
          </RepositoryPanel>

          {dashboard.pagination.totalPages > 1 ? (
            <section className="workspace-toolbar-surface repository-pagination">
              <div className="workspace-toolbar-surface__copy text-sm text-[var(--tms-text-muted)]">
                Page {dashboard.pagination.page} of {dashboard.pagination.totalPages}
                <span className="text-[var(--tms-text-soft)]">
                  {dashboard.tests.length} shown of {dashboard.pagination.totalCases}
                </span>
              </div>
              <div className="workspace-secondary-actions">
                <Button
                  variant="secondary"
                  disabled={dashboard.pagination.page <= 1}
                  onClick={() =>
                    updateRepositorySearch({
                      page: Math.max(1, dashboard.pagination.page - 1),
                    })
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={
                    dashboard.pagination.page >= dashboard.pagination.totalPages
                  }
                  onClick={() =>
                    updateRepositorySearch({
                      page: Math.min(
                        dashboard.pagination.totalPages,
                        dashboard.pagination.page + 1,
                      ),
                    })
                  }
                >
                  Next
                </Button>
              </div>
            </section>
          ) : null}

          {previewDrawerTest ? (
            <CasePreviewDrawer
              test={previewDrawerTest}
              suite={previewSuite}
              activities={previewActivities}
              isLoadingContent={isLoadingPreviewDetail}
              errorMessage={previewDetailErrorMessage}
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
                void handleCaseRestore(previewDrawerTest.id)
              }}
              onArchive={() => {
                void handleCaseArchive(previewDrawerTest.id)
              }}
              formatDateTime={formatRepositoryDateTime}
            />
          ) : null}
        </div>
      </div>
    </main>
  )
}
