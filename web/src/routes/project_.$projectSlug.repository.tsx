import {
  createFileRoute,
  Link,
  notFound,
  redirect,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { BulkCaseBar } from '../components/repository/BulkCaseBar'
import { CasePreviewDrawer } from '../components/repository/CasePreviewDrawer'
import { StepsEditor } from '../components/repository/StepsEditor'
import { StepsView } from '../components/repository/StepsView'
import {
  CaseRefsList,
  CaseTags,
  PreconditionsBlock,
} from '../components/repository/CaseFieldsView'
import { RepositoryEmptyState } from '../components/repository/RepositoryEmptyState'
import { RepositoryErrorBanner } from '../components/repository/RepositoryErrorBanner'
import { RepositoryPanel } from '../components/repository/RepositoryPanel'
import { RepositorySuiteTree } from '../components/repository/RepositorySuiteTree'
import {
  CaseRow,
  DEFAULT_REPOSITORY_VISIBLE_COLUMNS,
  getRepositoryCaseGridTemplate,
  type RepositoryColumnKey,
  type RepositoryVisibleColumns,
} from '../components/repository/CaseRow'
import { RepositoryToolbar } from '../components/repository/RepositoryToolbar'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Checkbox } from '../components/ui/Checkbox'
import { FileInput } from '../components/ui/FileInput'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Modal } from '../components/ui/Modal'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Link2,
  MoreHorizontal,
  X,
} from 'lucide-react'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuSeparator,
} from '../components/ui/PopoverMenu'
import { getErrorMessage } from '../lib/errors'
import {
  caseContentForEditing,
  serializeCaseContent,
  type CaseStep,
} from '../lib/caseContent'
import { SelectMenu } from '../components/ui/SelectMenu'
import { uploadTestMedia } from '../features/media/server'
import { createShortcutRepositoryStory } from '../features/shortcut/server'
import { getRepositoryPreviewDetailStaleAt } from '../lib/repositoryPreviewCache'
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
  getRepositoryCount,
  getRepositorySummary,
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
  RepositoryImportColumnMapping,
  RepositoryImportPreview,
  RepositoryImportResult,
  RepositoryImportSource,
  TestDetail,
} from '../features/tests/server'
import { useT } from '../lib/i18n'

const REPOSITORY_PAGE_SIZE_OPTIONS = [25, 50, 75, 100] as const
const REPOSITORY_DEFAULT_PAGE_SIZE = REPOSITORY_PAGE_SIZE_OPTIONS[0]
const REPOSITORY_PAGE_SIZE_VALUES: readonly number[] = REPOSITORY_PAGE_SIZE_OPTIONS

type RepositoryPageSize = (typeof REPOSITORY_PAGE_SIZE_OPTIONS)[number]

function normalizeRepositoryPageSize(value: number | undefined): RepositoryPageSize {
  return REPOSITORY_PAGE_SIZE_VALUES.includes(value ?? 0)
    ? (value as RepositoryPageSize)
    : REPOSITORY_DEFAULT_PAGE_SIZE
}

const repositorySearchSchema = z.object({
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
  tag: z.string().optional().catch(undefined),
  page: z.coerce.number().int().positive().optional().catch(1),
  pageSize: z.coerce
    .number()
    .int()
    .optional()
    .transform((value) => normalizeRepositoryPageSize(value))
    .catch(REPOSITORY_DEFAULT_PAGE_SIZE),
  previewId: z.coerce.number().int().positive().optional().catch(undefined),
})

export const Route = createFileRoute('/project_/$projectSlug/repository')({
  validateSearch: repositorySearchSchema,
  // No loaderDeps on purpose: search / filter / page changes must not create
  // a new route match (that swapped the page for the skeleton and remounted
  // it, wiping the search box). The loader reads the URL only when the page
  // is entered or invalidated; in-page filter changes are fetched by the
  // component itself (see the listQueryKey effect in ProjectRepositoryPage).
  loader: async ({ params, location }) => {
    const loaderStartedAt = Date.now()
    const deps = repositorySearchSchema.parse(location.search)
    const projectSlug = params.projectSlug.trim()
    const pageSize = normalizeRepositoryPageSize(deps.pageSize)

    if (!projectSlug) {
      throw notFound()
    }

    const numericProjectId = Number(projectSlug)

    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      const legacyDashboard = await getRepositoryState({
        data: {
          projectId: numericProjectId,
          page: deps.page,
          pageSize,
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
        tag: deps.tag,
        page: deps.page,
        pageSize,
      },
    })
    console.info(
      `[repository-timing] route-loader state-loaded ${JSON.stringify({
        projectSlug,
        totalMs: Date.now() - loaderStartedAt,
        page: deps.page ?? 1,
        pageSize,
        suiteId: deps.suiteId ?? null,
        status: deps.status ?? 'All',
        priority: deps.priority ?? 'All',
        caseType: deps.type ?? 'All',
        hasSearch: Boolean(deps.q?.trim()),
      })}`,
    )

    const project =
      dashboard.projects.find((item) => item.slug === projectSlug) ?? null

    const selectedProjectId = dashboard.selectedProjectId ?? project?.id ?? null

    if (!project || !selectedProjectId) {
      throw notFound()
    }

    const result = {
      project,
      dashboard,
    }
    console.info(
      `[repository-timing] route-loader complete ${JSON.stringify({
        projectSlug,
        totalMs: Date.now() - loaderStartedAt,
        cases: dashboard.tests.length,
        suites: dashboard.sections.length,
      })}`,
    )
    return result
  },
  component: ProjectRepositoryPage,
})

type ComposerKind = 'suite' | null
type RepositoryImportPanelSource = RepositoryImportSource
type RepositoryImportPreviewFilter =
  | 'all'
  | 'valid'
  | 'warnings'
  | 'errors'
  | 'duplicates'
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
const IMPORT_PREVIEW_FILTERS: Array<{
  value: RepositoryImportPreviewFilter
  label: string
}> = [
  { value: 'all', label: 'All' },
  { value: 'valid', label: 'Valid' },
  { value: 'warnings', label: 'Warnings' },
  { value: 'errors', label: 'Errors' },
  { value: 'duplicates', label: 'Duplicates' },
]

function formatImportFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function CsvUploadDropzone({
  file,
  onFileChange,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
}) {
  const t = useT()

  const [isDropActive, setIsDropActive] = useState(false)

  return (
    <div className="repository-import-upload">
      <label
        className={`repository-import-dropzone ${
          isDropActive ? 'repository-import-dropzone--active' : ''
        } ${file ? 'repository-import-dropzone--has-file' : ''}`}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDropActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          setIsDropActive(true)
        }}
        onDragLeave={(event) => {
          if (
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setIsDropActive(false)
          }
        }}
        onDrop={(event) => {
          event.preventDefault()
          setIsDropActive(false)
          onFileChange(event.dataTransfer.files?.[0] ?? null)
        }}
      >
        <FileInput
          key={file ? file.name : 'empty-import-file'}
          accept=".csv,text/csv"
          onChange={(event) =>
            onFileChange(event.currentTarget.files?.[0] ?? null)
          }
        />
        <span className="repository-import-dropzone__icon" aria-hidden="true">{t('CSV')}</span>
        <span className="repository-import-dropzone__copy">
          <span className="repository-import-dropzone__title">
            {file ? file.name : t('Choose CSV file')}
          </span>
          <span className="repository-import-dropzone__meta">
            {file
              ? t('{v1} selected', { v1: formatImportFileSize(file.size) })
              : t('Drop a TMS, Testmo, or generic CSV here. Click anywhere in this box to browse.')}
          </span>
        </span>
      </label>
      {file ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="repository-import-upload__remove"
          onClick={() => onFileChange(null)}
        >{t('Remove')}</Button>
      ) : null}
    </div>
  )
}
const REPOSITORY_PREVIEW_CACHE_LIMIT = 40
const REPOSITORY_PREVIEW_CACHE_VERSION = 2
const REPOSITORY_PREVIEW_CACHE_PREFIX = 'tms.repository.preview.'
const REPOSITORY_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

type RepositoryPreviewCacheItem = {
  cachedAt: number
  detail: TestDetail
}

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

  return `${REPOSITORY_MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
}

function formatRepositoryDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const hours = date.getUTCHours().toString().padStart(2, '0')
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')

  return `${REPOSITORY_MONTH_LABELS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ${hours}:${minutes}`
}

function isRepositoryPreviewDetailFresh(
  detail: TestDetail | undefined,
  test: DashboardTest | null,
): boolean {
  if (!detail) {
    return false
  }

  if (!test?.updatedAt || !detail.updatedAt) {
    return true
  }

  const detailUpdatedAt = new Date(detail.updatedAt).getTime()
  const testUpdatedAt = new Date(test.updatedAt).getTime()

  if (Number.isNaN(detailUpdatedAt) || Number.isNaN(testUpdatedAt)) {
    return detail.updatedAt === test.updatedAt
  }

  return detailUpdatedAt >= testUpdatedAt
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

function getRepositoryPreviewCacheKey(projectSlug: string): string {
  return `${REPOSITORY_PREVIEW_CACHE_PREFIX}${projectSlug}`
}

function readRepositoryPreviewCache(projectSlug: string): {
  details: Record<number, TestDetail>
  order: number[]
} {
  if (typeof window === 'undefined') {
    return {
      details: {},
      order: [],
    }
  }

  try {
    const rawValue = window.sessionStorage.getItem(
      getRepositoryPreviewCacheKey(projectSlug),
    )

    if (!rawValue) {
      return {
        details: {},
        order: [],
      }
    }

    const parsedValue = JSON.parse(rawValue) as {
      version?: number
      items?: RepositoryPreviewCacheItem[]
    }

    if (
      parsedValue.version !== REPOSITORY_PREVIEW_CACHE_VERSION ||
      !Array.isArray(parsedValue.items)
    ) {
      return {
        details: {},
        order: [],
      }
    }

    const details: Record<number, TestDetail> = {}
    const order: number[] = []

    for (const item of parsedValue.items) {
      if (!item?.detail || typeof item.detail.id !== 'number') {
        continue
      }

      if (
        item.cachedAt <= getRepositoryPreviewDetailStaleAt(item.detail.id)
      ) {
        continue
      }

      details[item.detail.id] = item.detail
      order.push(item.detail.id)
    }

    return {
      details,
      order,
    }
  } catch {
    return {
      details: {},
      order: [],
    }
  }
}

function writeRepositoryPreviewCache(
  projectSlug: string,
  details: Record<number, TestDetail>,
  order: number[],
): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const cachedAt = Date.now()
    const orderedItems: RepositoryPreviewCacheItem[] = order
      .filter((id, index, ids) => ids.indexOf(id) === index)
      .filter((id) => Boolean(details[id]))
      .slice(-REPOSITORY_PREVIEW_CACHE_LIMIT)
      .map((id) => ({
        cachedAt,
        detail: details[id],
      }))

    window.sessionStorage.setItem(
      getRepositoryPreviewCacheKey(projectSlug),
      JSON.stringify({
        version: REPOSITORY_PREVIEW_CACHE_VERSION,
        items: orderedItems,
      }),
    )
  } catch {
    // Preview cache is an optimization only.
  }
}

function ProjectRepositoryPage() {
  const t = useT()

  const loaderData = Route.useLoaderData()
  const search = Route.useSearch()
  const { project, dashboard: loaderDashboard } = loaderData
  const router = useRouter()
  const navigate = useNavigate()
  const [dashboard, setDashboard] = useState(loaderDashboard)
  const [isLoadingRepositorySummary, setIsLoadingRepositorySummary] =
    useState(true)
  const projectSlug = project.slug ?? project.id.toString()
  const initialPreviewCacheRef = useRef<{
    details: Record<number, TestDetail>
    order: number[]
  } | null>(null)

  if (initialPreviewCacheRef.current === null) {
    initialPreviewCacheRef.current = readRepositoryPreviewCache(projectSlug)
  }

  const [suiteName, setSuiteName] = useState('')
  const [suiteErrorMessage, setSuiteErrorMessage] = useState<string | null>(null)
  const [isSubmittingSuite, setIsSubmittingSuite] = useState(false)
  const [isImportPanelOpen, setIsImportPanelOpen] = useState(false)
  const [importSource, setImportSource] =
    useState<RepositoryImportPanelSource>('auto')
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] =
    useState<RepositoryImportPreview | null>(null)
  const [importColumnMappings, setImportColumnMappings] = useState<
    RepositoryImportColumnMapping[]
  >([])
  const [isImportMappingDirty, setIsImportMappingDirty] = useState(false)
  const [importResult, setImportResult] = useState<RepositoryImportResult | null>(
    null,
  )
  const [importPreviewFilter, setImportPreviewFilter] =
    useState<RepositoryImportPreviewFilter>('all')
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
  const [isRefreshingList, setIsRefreshingList] = useState(false)
  const isRouterReloading = useRouterState({
    select: (state) => state.isLoading,
  })
  const isRepositoryReloading = isRefreshingList || isRouterReloading
  const [visibleColumns, setVisibleColumns] =
    useState<RepositoryVisibleColumns>(DEFAULT_REPOSITORY_VISIBLE_COLUMNS)
  const caseFilter = search.status ?? 'All'
  const priorityFilter = search.priority ?? 'All'
  const caseTypeFilter = search.type ?? 'All'
  const activeTag = search.tag ?? null
  const suiteFilterId = search.suiteId?.toString() ?? ALL_SUITES_FILTER
  const selectedPageSize = normalizeRepositoryPageSize(search.pageSize)
  const searchPreviewId = search.previewId ?? null
  const [selectedTestIds, setSelectedTestIds] = useState<number[]>([])
  const [isApplyingBulkAction, setIsApplyingBulkAction] = useState(false)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [isPreviewActionsMenuOpen, setIsPreviewActionsMenuOpen] =
    useState(false)
  const [isCreatingShortcutStory, setIsCreatingShortcutStory] = useState(false)
  const [shortcutStoryResult, setShortcutStoryResult] = useState<{
    name: string
    url: string
  } | null>(null)
  const [shortcutStoryErrorMessage, setShortcutStoryErrorMessage] = useState<
    string | null
  >(null)
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
  const [previewTestId, setPreviewTestId] = useState<number | null>(
    search.previewId ?? null,
  )
  const [previewDetailsById, setPreviewDetailsById] = useState<
    Record<number, TestDetail>
  >(() => initialPreviewCacheRef.current?.details ?? {})
  const previewCacheOrderRef = useRef<number[]>(
    initialPreviewCacheRef.current?.order ?? [],
  )
  const prefetchingPreviewIdsRef = useRef<Set<number>>(new Set())
  const [isLoadingPreviewDetail, setIsLoadingPreviewDetail] = useState(false)
  const [previewDetailErrorMessage, setPreviewDetailErrorMessage] = useState<
    string | null
  >(null)
  const [isEditingPreviewContent, setIsEditingPreviewContent] = useState(false)
  const [previewPreconditionsValue, setPreviewPreconditionsValue] =
    useState('')
  const [previewDescriptionValue, setPreviewDescriptionValue] = useState('')
  const [previewStepsValue, setPreviewStepsValue] = useState<CaseStep[]>([])
  const [isSavingPreviewContent, setIsSavingPreviewContent] = useState(false)
  const [isUploadingPreviewMedia, setIsUploadingPreviewMedia] = useState(false)
  const [isSplitPreviewViewport, setIsSplitPreviewViewport] = useState(false)
  const [copiedPreviewLinkId, setCopiedPreviewLinkId] = useState<number | null>(
    null,
  )
  const [caseActionErrorMessage, setCaseActionErrorMessage] = useState<
    string | null
  >(null)
  const [draggedTestIds, setDraggedTestIds] = useState<number[]>([])
  const [dragOverTestDrop, setDragOverTestDrop] = useState<{
    testId: number
    position: 'before' | 'after'
  } | null>(null)
  const [pendingCrossSuiteMove, setPendingCrossSuiteMove] = useState<{
    testIds: number[]
    orderedIds: number[]
    targetSuiteId: number
    targetSuiteName: string
    sourceSuiteNames: string[]
  } | null>(null)

  // Identifies which search / filter / page combination the list on screen
  // was loaded for. The loader result matches the URL the page was entered
  // (or invalidated) with; in-page changes are fetched below.
  const listQueryKey = JSON.stringify([
    projectSlug,
    search.q ?? '',
    search.suiteId ?? null,
    search.status ?? 'All',
    search.priority ?? 'All',
    search.type ?? 'All',
    search.tag ?? null,
    search.page ?? 1,
    selectedPageSize,
  ])
  const loadedListKeyRef = useRef(listQueryKey)
  const listRequestIdRef = useRef(0)
  const latestListQueryKeyRef = useRef(listQueryKey)
  latestListQueryKeyRef.current = listQueryKey
  // Bumped every time a fresh list replaces the one on screen, so the
  // exact-count effect re-runs for that list.
  const [listVersion, setListVersion] = useState(0)

  useEffect(() => {
    // Loader data (page entry or router.invalidate()) wins over any
    // in-flight in-page fetch.
    listRequestIdRef.current += 1
    loadedListKeyRef.current = latestListQueryKeyRef.current
    setIsRefreshingList(false)
    setDashboard(loaderDashboard)
    setListVersion((version) => version + 1)
  }, [loaderDashboard])

  useEffect(() => {
    if (loadedListKeyRef.current === listQueryKey) {
      return
    }

    const requestId = ++listRequestIdRef.current
    setIsRefreshingList(true)

    getRepositoryState({
      data: {
        projectSlug,
        search: search.q,
        suiteId: search.suiteId,
        status: search.status,
        priority: search.priority,
        caseType: search.type,
        tag: search.tag,
        page: search.page,
        pageSize: selectedPageSize,
      },
    })
      .then((nextDashboard) => {
        if (requestId !== listRequestIdRef.current) {
          return
        }

        loadedListKeyRef.current = listQueryKey
        setDashboard(nextDashboard)
        setListVersion((version) => version + 1)
      })
      .catch(() => {
        if (requestId !== listRequestIdRef.current) {
          return
        }

        setCaseActionErrorMessage(
          'Could not load test cases. Check your connection and try again.',
        )
      })
      .finally(() => {
        if (requestId === listRequestIdRef.current) {
          setIsRefreshingList(false)
        }
      })
    // listQueryKey covers every value used in the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listQueryKey])

  useEffect(() => {
    let isCancelled = false

    // The loader already gives an exact count for the fully-unfiltered
    // view (it reuses the suite-sidebar aggregate), so there's nothing to
    // correct here — skip the extra round-trip and the transient mismatch
    // it would otherwise cause between the sidebar and this header.
    if (listVersion === 0 || !dashboard.pagination.isEstimated) {
      return
    }

    getRepositoryCount({
      data: {
        projectSlug,
        search: search.q,
        suiteId: search.suiteId,
        status: search.status,
        priority: search.priority,
        caseType: search.type,
        page: search.page,
        pageSize: selectedPageSize,
      },
    })
      .then((pagination) => {
        if (isCancelled) {
          return
        }

        setDashboard((current) => ({
          ...current,
          pagination: {
            ...current.pagination,
            ...pagination,
            isEstimated: false,
          },
        }))
      })
      .catch(() => {
        // Exact counts are not required for the repository to stay usable.
      })

    return () => {
      isCancelled = true
    }
    // Runs once per freshly loaded list; the search values read above are
    // the ones that list was loaded for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listVersion])

  useEffect(() => {
    let isCancelled = false
    setIsLoadingRepositorySummary(true)

    getRepositorySummary({
      data: {
        projectSlug,
      },
    })
      .then((summary) => {
        if (isCancelled) {
          return
        }

        setDashboard((current) => ({
          ...current,
          suiteStats: summary.suiteStats,
          stats: summary.stats,
        }))
      })
      .catch(() => {
        // Summary counts are an enhancement; the repository remains usable.
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingRepositorySummary(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [projectSlug])

  useEffect(() => {
    const cachedPreview = readRepositoryPreviewCache(projectSlug)
    previewCacheOrderRef.current = cachedPreview.order
    prefetchingPreviewIdsRef.current.clear()
    setPreviewDetailsById(cachedPreview.details)
  }, [projectSlug])

  useEffect(() => {
    writeRepositoryPreviewCache(
      projectSlug,
      previewDetailsById,
      previewCacheOrderRef.current,
    )
  }, [previewDetailsById, projectSlug])

  useEffect(() => {
    setPreviewTestId(searchPreviewId)
  }, [searchPreviewId])

  useEffect(() => {
    // Keep the input in sync when the URL changes from outside
    // (back/forward, reset, link). Typing alone never changes the URL.
    setSearchValue(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    try {
      const storedColumns = window.localStorage.getItem(
        REPOSITORY_COLUMNS_STORAGE_KEY,
      )

      if (storedColumns) {
        setVisibleColumns(
          normalizeRepositoryVisibleColumns(JSON.parse(storedColumns)),
        )
      }
    } catch {
      setVisibleColumns(DEFAULT_REPOSITORY_VISIBLE_COLUMNS)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(
      REPOSITORY_COLUMNS_STORAGE_KEY,
      JSON.stringify(visibleColumns),
    )
  }, [visibleColumns])

  // Search runs on Enter (or when the box is cleared), not on every
  // keystroke, so typing never reloads the list.
  function submitRepositorySearch(value: string = searchValue): void {
    const nextSearch = value.trim()

    if (nextSearch === (search.q ?? '')) {
      return
    }

    clearBulkConfirmations()
    updateRepositorySearch({
      q: nextSearch || undefined,
    })
  }

  function updateRepositorySearch(
    nextSearch: Partial<{
      q: string
      suiteId: number | undefined
      status: CaseFilter
      priority: PriorityFilter
      type: CaseTypeFilter
      tag: string | undefined
      page: number
      pageSize: number
      previewId: number | undefined
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

  function rememberPreviewDetail(detail: TestDetail): void {
    previewCacheOrderRef.current = [
      ...previewCacheOrderRef.current.filter((id) => id !== detail.id),
      detail.id,
    ].slice(-REPOSITORY_PREVIEW_CACHE_LIMIT)

    setPreviewDetailsById((current) => ({
      ...current,
      [detail.id]: detail,
    }))
  }

  function updatePreviewDetail(
    testId: number,
    updater: (detail: TestDetail) => TestDetail,
  ): void {
    previewCacheOrderRef.current = [
      ...previewCacheOrderRef.current.filter((id) => id !== testId),
      testId,
    ].slice(-REPOSITORY_PREVIEW_CACHE_LIMIT)

    setPreviewDetailsById((current) => {
      const detail = current[testId]

      if (!detail) {
        return current
      }

      return {
        ...current,
        [testId]: updater(detail),
      }
    })
  }

  function updatePreviewDetails(
    testIds: number[],
    updater: (detail: TestDetail) => TestDetail,
  ): void {
    const testIdSet = new Set(testIds)
    previewCacheOrderRef.current = [
      ...previewCacheOrderRef.current.filter((id) => !testIdSet.has(id)),
      ...testIds,
    ].slice(-REPOSITORY_PREVIEW_CACHE_LIMIT)

    setPreviewDetailsById((current) => {
      let didUpdate = false
      const next = { ...current }

      for (const testId of testIds) {
        const detail = current[testId]

        if (!detail) {
          continue
        }

        next[testId] = updater(detail)
        didUpdate = true
      }

      return didUpdate ? next : current
    })
  }

  function removePreviewDetails(testIds: number[]): void {
    const testIdSet = new Set(testIds)
    previewCacheOrderRef.current = previewCacheOrderRef.current.filter(
      (id) => !testIdSet.has(id),
    )

    setPreviewDetailsById((current) => {
      const next = { ...current }

      for (const id of testIds) {
        delete next[id]
      }

      return next
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

  function caseMatchesCurrentFilter(status: string | null): boolean {
    const normalized = status ?? 'Draft'

    if (caseFilter === 'All') {
      return normalized !== 'Archived'
    }

    return normalized === caseFilter
  }

  // After a status change a case may no longer belong to the current filter
  // (e.g. archived while viewing All) — drop it from the visible list so it
  // doesn't linger with a mismatched status.
  function pruneTestFromViewIfFiltered(testId: number): void {
    setDashboard((current) => {
      const test = current.tests.find((item) => item.id === testId)

      if (!test || caseMatchesCurrentFilter(test.status)) {
        return current
      }

      return {
        ...current,
        tests: current.tests.filter((item) => item.id !== testId),
        pagination: {
          ...current.pagination,
          totalCases: Math.max(0, current.pagination.totalCases - 1),
        },
      }
    })
    setPreviewTestId((current) => (current === testId ? null : current))
  }

  function pruneTestsFromViewIfFiltered(testIds: number[]): void {
    const idSet = new Set(testIds)

    setDashboard((current) => {
      const removableIds = new Set(
        current.tests
          .filter(
            (test) =>
              idSet.has(test.id) && !caseMatchesCurrentFilter(test.status),
          )
          .map((test) => test.id),
      )

      if (removableIds.size === 0) {
        return current
      }

      return {
        ...current,
        tests: current.tests.filter((test) => !removableIds.has(test.id)),
        pagination: {
          ...current.pagination,
          totalCases: Math.max(
            0,
            current.pagination.totalCases - removableIds.size,
          ),
        },
      }
    })
    setPreviewTestId((current) =>
      current !== null && idSet.has(current) ? null : current,
    )
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
  const paginationStart =
    dashboard.pagination.totalCases === 0
      ? 0
      : (dashboard.pagination.page - 1) * dashboard.pagination.pageSize + 1
  const paginationEnd =
    dashboard.pagination.totalCases === 0
      ? 0
      : Math.min(
          dashboard.pagination.totalCases,
          paginationStart + dashboard.tests.length - 1,
        )
  const paginationSummary =
    dashboard.pagination.totalCases === 0
      ? 'No cases'
      : dashboard.pagination.isEstimated
        ? `Showing ${paginationStart}-${paginationEnd}`
        : `Showing ${paginationStart}-${paginationEnd} of ${dashboard.pagination.totalCases} cases`
  const paginationPageSummary = `Page ${dashboard.pagination.page} of ${dashboard.pagination.totalPages}`
  const tableScopeCountLabel =
    dashboard.pagination.isEstimated
      ? `${paginationEnd}+ cases`
      : dashboard.pagination.totalCases === 1
      ? '1 case'
      : `${dashboard.pagination.totalCases} cases`
  const repositoryTreeTotalCases =
    dashboard.stats.activeCases > 0
      ? dashboard.stats.activeCases
      : dashboard.pagination.totalCases
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
  const importReadyToCreate =
    importPreview !== null && importPreview.errorRows === 0
  const importReadyToContinue =
    importReadyToCreate && !isImportMappingDirty
  const importReviewMessage =
    importPreview === null
      ? ''
      : importPreview.errorRows > 0
        ? `${importPreview.errorRows} rows are blocked by validation errors.`
        : isImportMappingDirty
          ? 'Column mapping changed. Apply mapping before continuing.'
        : importPreview.warningRows > 0
          ? `${importPreview.warningRows} rows have warnings but can be imported.`
          : 'CSV is ready to import.'
  const importWizardStep =
    importResult !== null
      ? 4
      : isImportConfirming
        ? 3
        : importPreview !== null
          ? 2
          : 1
  const importVisiblePreviewRows =
    importPreview?.previewRows.filter((row) => {
      if (importPreviewFilter === 'valid') {
        return row.errors.length === 0 && row.warnings.length === 0
      }

      if (importPreviewFilter === 'warnings') {
        return row.warnings.length > 0
      }

      if (importPreviewFilter === 'errors') {
        return row.errors.length > 0
      }

      if (importPreviewFilter === 'duplicates') {
        return row.duplicate !== 'none'
      }

      return true
    }) ?? []
  const importPreviewFilterCounts: Record<RepositoryImportPreviewFilter, number> = {
    all: importPreview?.previewRows.length ?? 0,
    valid:
      importPreview?.previewRows.filter(
        (row) => row.errors.length === 0 && row.warnings.length === 0,
      ).length ?? 0,
    warnings:
      importPreview?.previewRows.filter((row) => row.warnings.length > 0).length ??
      0,
    errors:
      importPreview?.previewRows.filter((row) => row.errors.length > 0).length ?? 0,
    duplicates:
      importPreview?.previewRows.filter((row) => row.duplicate !== 'none').length ??
      0,
  }
  const importConfirmSummary = importPreview
    ? [
        {
          label: t('Cases to create'),
          value: importPreview.validRows,
          tone: 'ready',
        },
        {
          label: t('Blocked rows'),
          value: importPreview.errorRows,
          tone: importPreview.errorRows > 0 ? 'danger' : 'muted',
        },
        {
          label: t('Warnings'),
          value: importPreview.warningRows,
          tone: importPreview.warningRows > 0 ? 'warning' : 'muted',
        },
        {
          label: t('Duplicate warnings'),
          value: importPreview.duplicateRows,
          tone: importPreview.duplicateRows > 0 ? 'warning' : 'muted',
        },
        {
          label: t('Suites to create'),
          value: createMissingImportSuites ? importPreview.missingSuites.length : 0,
          tone:
            createMissingImportSuites && importPreview.missingSuites.length > 0
              ? 'ready'
              : 'muted',
        },
      ]
    : []
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
  const shouldShowSplitPreview =
    isSplitPreviewViewport && previewDrawerTest !== null
  const splitPreviewTest = shouldShowSplitPreview ? previewDrawerTest : null
  const previewIndex =
    previewTestId === null
      ? -1
      : dashboard.tests.findIndex((test) => test.id === previewTestId)
  const previousPreviewTest = previewIndex > 0 ? dashboard.tests[previewIndex - 1] : null
  const nextPreviewTest =
    previewIndex >= 0 && previewIndex < dashboard.tests.length - 1
      ? dashboard.tests[previewIndex + 1]
      : null
  const selectedSuite =
    suiteFilterId === ALL_SUITES_FILTER
      ? null
      : dashboard.sections.find((section) => section.id.toString() === suiteFilterId) ??
        null

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1180px)')
    const updatePreviewViewport = () => setIsSplitPreviewViewport(query.matches)

    updatePreviewViewport()
    query.addEventListener('change', updatePreviewViewport)

    return () => query.removeEventListener('change', updatePreviewViewport)
  }, [])

  useEffect(() => {
    if (!previewTest) {
      return
    }

    function handleKeyDown(event: KeyboardEvent): void {
      const target = event.target
      const isTypingTarget =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (isTypingTarget) {
        return
      }

      if (event.key === 'Escape') {
        closeCasePreview()
        return
      }

      if (event.key === 'ArrowUp') {
        if (!previousPreviewTest) {
          return
        }

        event.preventDefault()
        openCasePreview(previousPreviewTest.id)
        return
      }

      if (event.key === 'ArrowDown') {
        if (!nextPreviewTest) {
          return
        }

        event.preventDefault()
        openCasePreview(nextPreviewTest.id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextPreviewTest, previewTest, previousPreviewTest])

  useEffect(() => {
    let isCancelled = false

    if (previewTestId === null) {
      setIsLoadingPreviewDetail(false)
      setPreviewDetailErrorMessage(null)
      return
    }

    const cachedPreviewDetail = previewDetailsById[previewTestId]

    if (isRepositoryPreviewDetailFresh(cachedPreviewDetail, previewTest)) {
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

        rememberPreviewDetail(detail)
      })
      .catch((error) => {
        if (isCancelled) {
          return
        }

        setPreviewDetailErrorMessage(
          getErrorMessage(error, 'Failed to load test case content.'),
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
  }, [previewDetailsById, previewTest, previewTestId])

  useEffect(() => {
    if (!previewTestDetail) {
      setIsEditingPreviewContent(false)
      setPreviewPreconditionsValue('')
      setPreviewDescriptionValue('')
      setPreviewStepsValue([])
      return
    }

    if (!isEditingPreviewContent) {
      const content = caseContentForEditing(
        previewTestDetail.steps,
        previewTestDetail.expected,
      )
      setPreviewPreconditionsValue(previewTestDetail.preconditions ?? '')
      setPreviewDescriptionValue(content.description)
      setPreviewStepsValue(content.steps)
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
    void navigate({
      to: '.',
      search: (current) => ({
        ...current,
        previewId: testId,
      }),
      replace: true,
    })
  }

  function prefetchCasePreview(testId: number): void {
    if (
      previewDetailsById[testId] ||
      prefetchingPreviewIdsRef.current.has(testId)
    ) {
      return
    }

    prefetchingPreviewIdsRef.current.add(testId)

    void getTestDetail({
      data: {
        id: testId,
      },
    })
      .then((detail) => {
        rememberPreviewDetail(detail)
      })
      .catch(() => {
        // Prefetch should stay quiet; the selected preview handles visible errors.
      })
      .finally(() => {
        prefetchingPreviewIdsRef.current.delete(testId)
      })
  }

  function closeCasePreview(): void {
    setPreviewTestId(null)
    setIsEditingPreviewContent(false)
    void navigate({
      to: '.',
      search: (current) => ({
        ...current,
        previewId: undefined,
      }),
      replace: true,
    })
  }

  function openAdjacentPreview(direction: 'previous' | 'next'): void {
    const target =
      direction === 'previous' ? previousPreviewTest : nextPreviewTest

    if (!target) {
      return
    }

    openCasePreview(target.id)
  }

  async function copyPreviewLink(testId: number): Promise<void> {
    const url = `${window.location.origin}/test/${testId}`

    try {
      await navigator.clipboard.writeText(url)
      setCopiedPreviewLinkId(testId)
      window.setTimeout(() => {
        setCopiedPreviewLinkId((current) => (current === testId ? null : current))
      }, 1800)
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to copy test case link.'),
      )
    }
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
    const content = caseContentForEditing(
      previewTestDetail.steps,
      previewTestDetail.expected,
    )
    setPreviewPreconditionsValue(previewTestDetail.preconditions ?? '')
    setPreviewDescriptionValue(content.description)
    setPreviewStepsValue(content.steps)
    setIsEditingPreviewContent(true)
  }

  function cancelPreviewContentEdit(): void {
    setIsEditingPreviewContent(false)
    const content = caseContentForEditing(
      previewTestDetail?.steps,
      previewTestDetail?.expected,
    )
    setPreviewPreconditionsValue(previewTestDetail?.preconditions ?? '')
    setPreviewDescriptionValue(content.description)
    setPreviewStepsValue(content.steps)
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

    const serializedSteps = serializeCaseContent(
      previewDescriptionValue,
      previewStepsValue,
    )

    try {
      await updateTestContent({
        data: {
          id: previewTestDetail.id,
          steps: serializedSteps,
          expected: '',
          preconditions: previewPreconditionsValue,
        },
      })

      const updatedAt = new Date().toISOString()

      rememberPreviewDetail({
        ...previewTestDetail,
        steps: serializedSteps,
        expected: '',
        preconditions: previewPreconditionsValue,
        updatedAt,
      })
      updateRepositoryTests([previewTestDetail.id], (test) => ({
        ...test,
        updatedAt,
      }))
      setIsEditingPreviewContent(false)
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to update test content.'),
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
      updatePreviewDetails(statusUpdateIds, (detail) => ({
        ...detail,
        status,
        archivedFromStatus:
          status === 'Archived'
            ? detail.status === 'Ready' || detail.status === 'Draft'
              ? detail.status
              : detail.archivedFromStatus ?? 'Draft'
            : null,
        updatedAt,
      }))
      pruneTestsFromViewIfFiltered(statusUpdateIds)
      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
    } catch (error) {
      setBulkActionErrorMessage(
        getErrorMessage(error, 'Failed to update selected test cases.'),
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
      updatePreviewDetails(selectedTestIds, (detail) => ({
        ...detail,
        priority: metadata.priority ?? detail.priority,
        caseType: metadata.caseType ?? detail.caseType,
        updatedAt,
      }))
      setSelectedTestIds([])
    } catch (error) {
      setBulkActionErrorMessage(
        getErrorMessage(error, 'Failed to update selected test case metadata.'),
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
      updatePreviewDetail(testId, (detail) => ({
        ...detail,
        priority: metadata.priority ?? detail.priority,
        caseType: metadata.caseType ?? detail.caseType,
        updatedAt,
      }))
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to update test case metadata.'),
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
      updatePreviewDetail(testId, (detail) => ({
        ...detail,
        status,
        archivedFromStatus:
          status === 'Archived'
            ? detail.status === 'Ready' || detail.status === 'Draft'
              ? detail.status
              : detail.archivedFromStatus ?? 'Draft'
            : null,
        updatedAt,
      }))

      pruneTestFromViewIfFiltered(testId)
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to update test case status.'),
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

      const updatedAt = new Date().toISOString()
      updateRepositoryTests([testId], (test) => ({
        ...test,
        title: nextTitle,
        updatedAt,
      }))
      updatePreviewDetail(testId, (detail) => ({
        ...detail,
        title: nextTitle,
        updatedAt,
      }))
      cancelCaseTitleEdit()
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to update test case title.'),
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
        (test.archivedFromStatus ?? 'Draft') as CaseStatusValue,
      )
      const updatedAt = new Date().toISOString()
      updateRepositoryTests(selectedTestIds, (test) => ({
        ...test,
        status: test.archivedFromStatus ?? 'Draft',
        archivedFromStatus: null,
        updatedAt,
      }))
      updatePreviewDetails(selectedTestIds, (detail) => ({
        ...detail,
        status: detail.archivedFromStatus ?? 'Draft',
        archivedFromStatus: null,
        updatedAt,
      }))
      pruneTestsFromViewIfFiltered(selectedTestIds)
      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
    } catch (error) {
      setBulkActionErrorMessage(
        getErrorMessage(error, 'Failed to restore selected test cases.'),
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

      const deletedTestIds = selectedArchivedTests.map((test) => test.id)
      removeRepositoryTests(deletedTestIds)
      removePreviewDetails(deletedTestIds)
      setSelectedTestIds([])
      setIsBulkArchiveConfirming(false)
      setIsBulkDeleteConfirming(false)
    } catch (error) {
      setBulkActionErrorMessage(
        getErrorMessage(error, 'Failed to delete selected test cases permanently.'),
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
      updatePreviewDetails(testIds, (detail) => {
        const targetSuite = dashboard.sections.find(
          (section) => section.id === targetSuiteId,
        )

        return {
          ...detail,
          sectionId: targetSuiteId,
          sectionName: targetSuite?.name ?? detail.sectionName,
          updatedAt: new Date().toISOString(),
        }
      })
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        getErrorMessage(error, 'Failed to move test cases.'),
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
      updatePreviewDetails(testIds, (detail) => {
        const targetSuite = dashboard.sections.find(
          (section) => section.id === targetSuiteId,
        )

        return {
          ...detail,
          sectionId: targetSuiteId,
          sectionName: targetSuite?.name ?? detail.sectionName,
          updatedAt: new Date().toISOString(),
        }
      })
      await router.invalidate()
    } catch (error) {
      setBulkActionErrorMessage(
        getErrorMessage(error, 'Failed to move and reorder test cases.'),
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
        getErrorMessage(error, 'Failed to export test cases.')

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
    await previewImportWithMapping(
      importColumnMappings.length > 0 ? importColumnMappings : undefined,
    )
  }

  async function previewImportWithMapping(
    columnMappings?: RepositoryImportColumnMapping[],
  ): Promise<void> {
    if (!importFile) {
      setImportErrorMessage('Choose a CSV file first.')
      return
    }

    setImportErrorMessage(null)
    setImportPreview(null)
    setImportResult(null)
    setIsImportConfirming(false)
    setImportPreviewFilter('all')
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
      if (columnMappings && columnMappings.length > 0) {
        formData.append('columnMappings', JSON.stringify(columnMappings))
      }

      const result = await previewRepositoryImportCsv({
        data: formData,
      })

      setImportPreview(result)
      setImportColumnMappings(result.columnMappings)
      setIsImportMappingDirty(false)
    } catch (error) {
      setImportErrorMessage(
        getErrorMessage(error, 'Failed to preview CSV import.'),
      )
    } finally {
      setIsParsingImport(false)
    }
  }

  function handleImportFileSelection(file: File | null): void {
    setImportFile(file)
    setImportPreview(null)
    setImportColumnMappings([])
    setIsImportMappingDirty(false)
    setImportResult(null)
    setIsImportConfirming(false)
    setImportPreviewFilter('all')
    setImportErrorMessage(null)
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

    if (isImportMappingDirty) {
      setImportErrorMessage('Apply column mapping before importing.')
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
      if (importColumnMappings.length > 0) {
        formData.append('columnMappings', JSON.stringify(importColumnMappings))
      }

      const result = await importRepositoryCsv({
        data: formData,
      })

      setImportResult(result)
      setIsImportConfirming(false)
      setImportPreview(null)
      setImportColumnMappings([])
      setIsImportMappingDirty(false)
      setImportFile(null)
      await router.invalidate()
    } catch (error) {
      setImportErrorMessage(
        getErrorMessage(error, 'Failed to import CSV.'),
      )
    } finally {
      setIsImportingCsv(false)
    }
  }

  function handleImportMappingChange(field: string, sourceColumn: string): void {
    setImportColumnMappings((currentMappings) =>
      currentMappings.map((mapping) =>
        mapping.field === field
          ? {
              ...mapping,
              sourceColumn: sourceColumn || null,
            }
          : mapping,
      ),
    )
    setIsImportMappingDirty(true)
    setIsImportConfirming(false)
    setImportErrorMessage(null)
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

    const draggedTests = dashboard.tests.filter((test) => ids.includes(test.id))
    const isCrossSuiteMove = draggedTests.some(
      (test) => (test.sectionId ?? 0) !== suiteId,
    )

    if (isCrossSuiteMove) {
      const targetSuiteName =
        dashboard.sections.find((section) => section.id === suiteId)?.name ??
        'this suite'
      const sourceSuiteNames = Array.from(
        new Set(
          draggedTests
            .filter((test) => (test.sectionId ?? 0) !== suiteId)
            .map(
              (test) =>
                dashboard.sections.find(
                  (section) => section.id === test.sectionId,
                )?.name ?? 'Unknown suite',
            ),
        ),
      )

      setDraggedTestIds([])
      setDragOverTestDrop(null)
      setPendingCrossSuiteMove({
        testIds: ids,
        orderedIds,
        targetSuiteId: suiteId,
        targetSuiteName,
        sourceSuiteNames,
      })
      return
    }

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
      const updatedAt = new Date().toISOString()
      updateRepositoryTests([testId], (test) => ({
        ...test,
        status: 'Archived',
        archivedFromStatus:
          test.status === 'Ready' || test.status === 'Draft'
            ? test.status
            : test.archivedFromStatus ?? 'Draft',
        updatedAt,
      }))
      updatePreviewDetail(testId, (detail) => ({
        ...detail,
        status: 'Archived',
        archivedFromStatus:
          detail.status === 'Ready' || detail.status === 'Draft'
            ? detail.status
            : detail.archivedFromStatus ?? 'Draft',
        updatedAt,
      }))

      pruneTestFromViewIfFiltered(testId)
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to archive test case.'),
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
        (test.archivedFromStatus ?? 'Draft') as CaseStatusValue,
      )
      const updatedAt = new Date().toISOString()
      updateRepositoryTests([testId], (test) => ({
        ...test,
        status: test.archivedFromStatus ?? 'Draft',
        archivedFromStatus: null,
        updatedAt,
      }))
      updatePreviewDetail(testId, (detail) => ({
        ...detail,
        status: detail.archivedFromStatus ?? 'Draft',
        archivedFromStatus: null,
        updatedAt,
      }))

      pruneTestFromViewIfFiltered(testId)
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to restore test case.'),
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
      removePreviewDetails([testId])
    } catch (error) {
      setCaseActionErrorMessage(
        getErrorMessage(error, 'Failed to delete test case permanently.'),
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
        getErrorMessage(error, 'Failed to duplicate test case.'),
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

    const trimmedSuiteName = suiteName.trim()

    if (!trimmedSuiteName) {
      setSuiteErrorMessage('Enter a suite name.')
      return
    }

    setIsSubmittingSuite(true)

    try {
      const result = await createSuite({
        data: {
          projectId: project.id,
          name: trimmedSuiteName,
        },
      })

      addRepositorySuite({
        id: result.id,
        name: trimmedSuiteName,
        projectId: project.id,
      })
      setSuiteName('')
      setActiveComposer(null)
    } catch (error) {
      setSuiteErrorMessage(getErrorMessage(error, 'Failed to create suite.'))
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
        getErrorMessage(error, 'Failed to rename suite.'),
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
        getErrorMessage(error, 'Failed to delete suite.'),
      )
    } finally {
      setPendingSuiteActionById((current) => {
        const nextState = { ...current }
        delete nextState[suiteId]
        return nextState
      })
    }
  }

  async function handleCreateShortcutStory(): Promise<void> {
    setIsCreatingShortcutStory(true)
    setShortcutStoryErrorMessage(null)
    setShortcutStoryResult(null)

    try {
      const result = await createShortcutRepositoryStory({
        data: {
          projectId: project.id,
        },
      })

      setShortcutStoryResult({
        name: result.name,
        url: result.url,
      })
      window.open(result.url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setShortcutStoryErrorMessage(
        getErrorMessage(error, 'Failed to create Shortcut story.'),
      )
    } finally {
      setIsCreatingShortcutStory(false)
    }
  }

  return (
    <main className="workspace-view repository-workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            eyebrow={null}
            actions={
              <>
                <Button
                  onClick={() =>
                    setActiveComposer((current) => (current === 'suite' ? null : 'suite'))
                  }
                  variant="secondary"
                >{t('+ Suite')}</Button>
                <PopoverMenu
                  isOpen={isMoreMenuOpen}
                  onClose={() => setIsMoreMenuOpen(false)}
                  onOpenChange={setIsMoreMenuOpen}
                  align="right"
                  trigger={
                    <Button
                      type="button"
                      variant="secondary"
                      aria-expanded={isMoreMenuOpen}
                    >{t('More')}</Button>
                  }
                >
                  <PopoverMenuItem
                    disabled={isCreatingShortcutStory}
                    onClick={() => {
                      setIsMoreMenuOpen(false)
                      void handleCreateShortcutStory()
                    }}
                  >
                    {isCreatingShortcutStory
                      ? t('Creating story...')
                      : t('Create Shortcut story')}
                  </PopoverMenuItem>
                  <PopoverMenuSeparator />
                  <PopoverMenuItem
                    onClick={() => {
                      setIsMoreMenuOpen(false)
                      setIsImportPanelOpen((current) => !current)
                      setImportErrorMessage(null)
                      setImportResult(null)
                      setIsImportConfirming(false)
                    }}
                  >{t('Import CSV')}</PopoverMenuItem>
                  <PopoverMenuItem
                    disabled={
                      isExportingCsv || dashboard.pagination.totalCases === 0
                    }
                    onClick={() => {
                      setIsMoreMenuOpen(false)
                      void handleExportCsv('filtered')
                    }}
                  >
                    {isExportingCsv ? t('Exporting...') : t('Export CSV')}
                  </PopoverMenuItem>
                </PopoverMenu>
                <LinkButton
                  to="/create-test"
                  search={{ projectId: project.id }}
                  variant="primary"
                >{t('+ Test case')}</LinkButton>
              </>
            }
          />

          {shortcutStoryResult ? (
            <Alert
              variant="success"
              density="compact"
              className="mb-4"
              action={
                <a
                  href={shortcutStoryResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="tms-button tms-button-secondary no-underline"
                >{t('Open ticket')}</a>
              }
            >{t('Created Shortcut story: {name}', { name: shortcutStoryResult.name })}</Alert>
          ) : null}

          {shortcutStoryErrorMessage ? (
            <Alert variant="danger" density="compact" className="mb-4">
              {shortcutStoryErrorMessage}
            </Alert>
          ) : null}

          <Modal
            open={activeComposer === 'suite'}
            title={t('Create suite')}
            onClose={() => {
              setActiveComposer(null)
              setSuiteName('')
              setSuiteErrorMessage(null)
            }}
          >
            <form className="grid gap-4" onSubmit={handleCreateSuite}>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--tms-text)]">{t('Suite name')}</span>
                <Input
                  autoFocus
                  value={suiteName}
                  onChange={(event) => setSuiteName(event.target.value)}
                  placeholder={t('e.g. Checkout smoke')}
                />
                <span className="text-xs text-[var(--tms-text-muted)]">{t('A suite is a folder that groups related test cases.')}</span>
              </label>

              {suiteErrorMessage ? (
                <Alert variant="danger">{suiteErrorMessage}</Alert>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isSubmittingSuite}
                  onClick={() => {
                    setActiveComposer(null)
                    setSuiteName('')
                    setSuiteErrorMessage(null)
                  }}
                >{t('Cancel')}</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isSubmittingSuite ||
                    !dashboard.databaseConfigured ||
                    !suiteName.trim()
                  }
                >
                  {isSubmittingSuite ? t('Creating...') : t('Create suite')}
                </Button>
              </div>
            </form>
          </Modal>

          {isImportPanelOpen ? (
            <section className="repository-import-panel tms-panel mb-6 px-4 py-4 sm:px-5">
              <form
                className="repository-import-form"
                onSubmit={(event) => {
                  void handleImportPreview(event)
                }}
              >
                <div className="repository-import-form__header">
                  <div>
                    <div className="text-base font-semibold text-[var(--tms-text)]">{t('Import CSV')}</div>
                    <div className="mt-1 text-sm text-[var(--tms-text-muted)]">{t('Upload, preview, validate, then confirm before anything is written to the repository.')}</div>
                  </div>
                  {importFile ? (
                    <span className="tms-chip">
                      {importFile.name}
                    </span>
                  ) : null}
                </div>

                <div
                  className="repository-import-steps"
                  aria-label={t('CSV import progress')}
                >
                  {[
                    { step: 1, label: t('Upload') },
                    { step: 2, label: t('Preview') },
                    { step: 3, label: t('Confirm') },
                    { step: 4, label: t('Done') },
                  ].map((item) => (
                    <span
                      key={item.step}
                      className={`repository-import-step ${
                        importWizardStep === item.step
                          ? 'is-active'
                          : importWizardStep > item.step
                            ? 'is-complete'
                            : ''
                      }`}
                    >
                      <span>{item.step}</span>
                      {item.label}
                    </span>
                  ))}
                </div>

                <div className="repository-import-form__upload">
                  <CsvUploadDropzone
                    file={importFile}
                    onFileChange={handleImportFileSelection}
                  />
                </div>

                <div className="repository-import-form__settings">
                  <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">{t('Source')}<SelectMenu
                      value={importSource}
                      onValueChange={(value) => {
                        setImportSource(value as RepositoryImportPanelSource)
                        setImportPreview(null)
                        setImportColumnMappings([])
                        setIsImportMappingDirty(false)
                        setImportResult(null)
                        setIsImportConfirming(false)
                        setImportPreviewFilter('all')
                      }}
                      options={[
                        { value: 'auto', label: t('Auto detect') },
                        { value: 'native', label: t('TMS CSV') },
                        { value: 'testmo', label: t('Testmo CSV') },
                      ]}
                      aria-label={t('Import source')}
                    />
                  </label>
                  <label className="repository-import-form__checkbox">
                    <Checkbox
                      checked={createMissingImportSuites}
                      onChange={(event) => {
                        setCreateMissingImportSuites(event.currentTarget.checked)
                        setImportPreview(null)
                        setImportColumnMappings([])
                        setIsImportMappingDirty(false)
                        setImportResult(null)
                        setIsImportConfirming(false)
                      }}
                    />
                    <span>{t('Create missing suites')}<small>{t('Required for importing Testmo folder trees.')}</small>
                    </span>
                  </label>
                  <Button
                    type="submit"
                    disabled={isParsingImport || !importFile}
                    variant="primary"
                  >
                    {isParsingImport ? t('Parsing...') : t('Preview import')}
                  </Button>
                </div>
              </form>

              {importErrorMessage ? (
                <Alert variant="danger" className="mt-3">
                  {importErrorMessage}
                </Alert>
              ) : null}

              {importResult ? (
                <div className="repository-import-result">
                  <div className="repository-import-result__header">
                    <div>
                      <span className="repository-import-result__eyebrow">{t('Import complete')}</span>
                      <strong>
                        {importResult.failedRows.length > 0
                          ? t('Import finished with row-level issues')
                          : t('CSV import finished successfully')}
                      </strong>
                      <p>{t('Review what was created before continuing work in the repository.')}</p>
                    </div>
                    <div className="repository-import-result__actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setImportFile(null)
                          setImportPreview(null)
                          setImportColumnMappings([])
                          setIsImportMappingDirty(false)
                          setImportResult(null)
                          setIsImportConfirming(false)
                          setImportPreviewFilter('all')
                          setImportErrorMessage(null)
                        }}
                      >{t('Start new import')}</Button>
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => {
                          setIsImportPanelOpen(false)
                          setImportResult(null)
                        }}
                      >{t('Back to repository')}</Button>
                    </div>
                  </div>
                  <div className="repository-import-result__metrics">
                    <div className="repository-import-result__metric is-ready">
                      <span>{t('Created cases')}</span>
                      <strong>{importResult.importedCases}</strong>
                    </div>
                    <div className="repository-import-result__metric">
                      <span>{t('Created suites')}</span>
                      <strong>{importResult.createdSuites}</strong>
                    </div>
                    <div
                      className={`repository-import-result__metric ${
                        importResult.warningRows > 0 ? 'is-warning' : ''
                      }`}
                    >
                      <span>{t('Warnings')}</span>
                      <strong>{importResult.warningRows}</strong>
                    </div>
                    <div
                      className={`repository-import-result__metric ${
                        importResult.duplicateRows > 0 ? 'is-warning' : ''
                      }`}
                    >
                      <span>{t('Duplicate warnings')}</span>
                      <strong>{importResult.duplicateRows}</strong>
                    </div>
                    <div
                      className={`repository-import-result__metric ${
                        importResult.failedRows.length > 0 ? 'is-danger' : ''
                      }`}
                    >
                      <span>{t('Failed rows')}</span>
                      <strong>{importResult.failedRows.length}</strong>
                    </div>
                  </div>
                  {importResult.createdSuitesList.length > 0 ? (
                    <div className="repository-import-result__section">
                      <strong>{t('Suites created')}</strong>
                      <div className="repository-import-result__chips">
                        {importResult.createdSuitesList.slice(0, 12).map((suite) => (
                          <span key={suite} className="tms-chip">
                            {suite}
                          </span>
                        ))}
                        {importResult.createdSuitesList.length > 12 ? (
                          <span className="tms-chip">{t('+{v1} more', { v1: importResult.createdSuitesList.length - 12 })}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {importResult.createdCases.length > 0 ? (
                    <div className="repository-import-result__section">
                      <strong>{t('Created cases')}</strong>
                      <div className="repository-import-result-table">
                        <div className="repository-import-result-row repository-import-result-row--head">
                          <span>{t('ID')}</span>
                          <span>{t('Title')}</span>
                          <span>{t('Suite')}</span>
                          <span>{t('Status')}</span>
                          <span>{t('Open')}</span>
                        </div>
                        {importResult.createdCases.map((test) => (
                          <div
                            key={test.id}
                            className="repository-import-result-row"
                          >
                            <span>#{test.id}</span>
                            <span className="min-w-0 truncate font-semibold">
                              {test.title}
                            </span>
                            <span className="min-w-0 truncate">{test.suite}</span>
                            <span>{t(test.status)}</span>
                            <LinkButton
                              to="/test/$testId"
                              params={{ testId: test.id.toString() }}
                              variant="secondary"
                              size="sm"
                            >{t('Open')}</LinkButton>
                          </div>
                        ))}
                      </div>
                      {importResult.importedCases > importResult.createdCases.length ? (
                        <p className="repository-import-result__note">{t('Showing first {length} created cases.', { length: importResult.createdCases.length })}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {importResult.failedRows.length > 0 ? (
                    <div className="repository-import-result__section">
                      <strong>{t('Rows needing attention')}</strong>
                      <div className="repository-import-result-table">
                        <div className="repository-import-result-row repository-import-result-row--head repository-import-result-row--failed">
                          <span>{t('Row')}</span>
                          <span>{t('Title')}</span>
                          <span>{t('Reason')}</span>
                        </div>
                        {importResult.failedRows.map((row) => (
                          <div
                            key={`${row.rowNumber}-${row.title}`}
                            className="repository-import-result-row repository-import-result-row--failed"
                          >
                            <span>{row.rowNumber}</span>
                            <span className="min-w-0 truncate font-semibold">
                              {row.title}
                            </span>
                            <span className="min-w-0 truncate">{row.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {importPreview ? (
                <div className="mt-4 grid gap-3">
                  <div className="repository-import-summary">
                    <div className="repository-import-summary__item">
                      <span>{t('Rows')}</span>
                      <strong>{importPreview.totalRows}</strong>
                    </div>
                    <div className="repository-import-summary__item is-ready">
                      <span>{t('Valid')}</span>
                      <strong>{importPreview.validRows}</strong>
                    </div>
                    <div className="repository-import-summary__item is-warning">
                      <span>{t('Warnings')}</span>
                      <strong>{importPreview.warningRows}</strong>
                    </div>
                    <div className="repository-import-summary__item is-danger">
                      <span>{t('Errors')}</span>
                      <strong>{importPreview.errorRows}</strong>
                    </div>
                    <div className="repository-import-summary__item">
                      <span>{t('Duplicates')}</span>
                      <strong>{importPreview.duplicateRows}</strong>
                    </div>
                    <div className="repository-import-summary__item">
                      <span>{t('Detected')}</span>
                      <strong>
                        {importPreview.detectedSource === 'testmo'
                          ? t('Testmo')
                          : t('TMS')}
                      </strong>
                    </div>
                  </div>
                  <div className="repository-import-mapping">
                    <div className="repository-import-mapping__header">
                      <div>
                        <strong>{t('Column mapping')}</strong>
                        <span>{t('Match CSV columns to TMS fields before confirmation.')}</span>
                      </div>
                      <div className="repository-import-mapping__actions">
                        <Badge variant={isImportMappingDirty ? 'warning' : 'default'}>
                          {isImportMappingDirty
                            ? t('Mapping changed')
                            : importPreview.detectedSource === 'testmo'
                              ? t('Testmo mapping')
                              : t('TMS mapping')}
                        </Badge>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={!isImportMappingDirty || isParsingImport}
                          onClick={() => {
                            void previewImportWithMapping(importColumnMappings)
                          }}
                        >
                          {isParsingImport ? t('Applying...') : t('Apply mapping')}
                        </Button>
                      </div>
                    </div>
                    <div className="repository-import-mapping__grid">
                      {importColumnMappings.map((mapping) => (
                        <div
                          key={mapping.field}
                          className={`repository-import-mapping__item ${
                            !mapping.sourceColumn && mapping.required
                              ? 'is-missing'
                              : ''
                          }`}
                        >
                          <div>
                            <span>{mapping.field}</span>
                            {mapping.required ? <small>{t('Required')}</small> : null}
                          </div>
                          <SelectMenu
                            value={mapping.sourceColumn ?? '__none__'}
                            onValueChange={(value) =>
                              handleImportMappingChange(
                                mapping.field,
                                value === '__none__' ? '' : value,
                              )
                            }
                            options={[
                              {
                                value: '__none__',
                                label: mapping.fallback
                                  ? `Use default: ${mapping.fallback}`
                                  : t('Do not map'),
                              },
                              ...importPreview.availableColumns.map((column) => ({
                                value: column,
                                label: column,
                              })),
                            ]}
                            aria-label={t('{field} CSV column', { field: mapping.field })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="repository-import-preview-toolbar">
                    <div className="repository-import-preview-toolbar__title">{t('Preview rows')}<span>{t('Showing')}{' '}{importVisiblePreviewRows.length}{' '}{t('of')}{' '}
                        {importPreview.previewRows.length}{' '}{t('previewed rows')}</span>
                    </div>
                    <div className="repository-import-preview-filters">
                      {IMPORT_PREVIEW_FILTERS.map((filter) => (
                        <button
                          key={filter.value}
                          type="button"
                          className={`repository-import-preview-filter ${
                            importPreviewFilter === filter.value ? 'is-active' : ''
                          }`}
                          onClick={() => setImportPreviewFilter(filter.value)}
                        >
                          {t(filter.label)}
                          <span>{importPreviewFilterCounts[filter.value]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <Alert variant={importReadyToCreate ? 'info' : 'warning'}>
                    {importReviewMessage}
                    {importPreview.duplicateRows > 0
                      ? t(' Duplicate rows are warnings and will still create new cases if confirmed.')
                      : ''}
                  </Alert>
                  {importPreview.missingSuites.length > 0 ? (
                    <Alert
                      variant={
                        createMissingImportSuites
                          ? 'info'
                          : 'warning'
                      }
                    >{t('Missing suites:')}{' '}{importMissingSuitesSummary}.
                      {createMissingImportSuites
                        ? t(' They will be created during import.')
                        : t(' Enable suite creation or create them manually before import.')}
                    </Alert>
                  ) : null}
                  <div className="overflow-x-auto rounded-[var(--tms-radius-md)] border border-[var(--tms-border-subtle)]">
                    <div className="repository-import-preview-row repository-import-preview-row--head">
                      <span>{t('Row')}</span>
                      <span>{t('Title')}</span>
                      <span>{t('Suite')}</span>
                      <span>{t('Status')}</span>
                      <span>{t('Priority')}</span>
                      <span>{t('Type')}</span>
                      <span>{t('Notes')}</span>
                    </div>
                    {importVisiblePreviewRows.map((row) => (
                      <div
                        key={row.rowNumber}
                        className={`repository-import-preview-row ${
                          row.errors.length > 0
                            ? 'repository-import-preview-row--error'
                            : row.warnings.length > 0
                              ? 'repository-import-preview-row--warning'
                              : ''
                        }`}
                      >
                        <span className="text-[var(--tms-text-muted)]">
                          {row.rowNumber}
                        </span>
                        <span className="min-w-0 truncate font-semibold">
                          {row.title || '-'}
                        </span>
                        <span className="min-w-0 truncate">{row.suite || '-'}</span>
                        <span>{t(row.status)}</span>
                        <span>{t(row.priority)}</span>
                        <span>{t(row.caseType)}</span>
                        <span className="repository-import-preview-row__notes">
                          {row.errors.length > 0 ? (
                            <span className="tms-chip tms-chip-danger">{t('Error')}</span>
                          ) : row.warnings.length > 0 ? (
                            <span className="tms-chip tms-chip-warning">{t('Warning')}</span>
                          ) : (
                            <span className="tms-chip tms-chip-success">{t('OK')}</span>
                          )}
                          <span className="min-w-0 truncate">
                            {[
                              ...row.errors,
                              ...row.warnings,
                              row.duplicate !== 'none'
                                ? `Duplicate: ${row.duplicate}`
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ') || t('Ready')}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                  {importVisiblePreviewRows.length === 0 ? (
                    <div className="repository-import-empty-preview">{t('No rows match this preview filter.')}</div>
                  ) : null}
                  {importPreview.totalRows > importPreview.previewRows.length ? (
                    <div className="text-xs text-[var(--tms-text-muted)]">{t('Showing first {length} rows only.', { length: importPreview.previewRows.length })}</div>
                  ) : null}
                  <div className="repository-import-confirm">
                    <div>
                      <div className="repository-import-confirm__title">
                        {isImportConfirming ? t('Confirm import') : t('Ready for review')}
                      </div>
                      <div className="repository-import-confirm__copy">
                        {importPreview.errorRows > 0
                          ? t('Import is blocked until CSV errors are resolved.')
                          : isImportConfirming
                            ? t('This action will create new repository cases from the reviewed rows.')
                            : isImportMappingDirty
                              ? t('Apply the updated column mapping to refresh validation.')
                              : t('Review mapping, warnings, and duplicates before creating test cases.')}
                      </div>
                      <div className="repository-import-confirm__metrics">
                        {importConfirmSummary.map((item) => (
                          <span
                            key={item.label}
                            className={`repository-import-confirm__metric is-${item.tone}`}
                          >
                            <strong>{item.value}</strong>
                            {item.label}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isImportConfirming ? (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isImportingCsv}
                            onClick={() => setIsImportConfirming(false)}
                          >{t('Cancel')}</Button>
                          <Button
                            type="button"
                            variant="primary"
                            disabled={isImportingCsv}
                            onClick={() => {
                              void handleImportConfirm()
                            }}
                          >
                            {isImportingCsv ? t('Importing...') : t('Confirm import')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="primary"
                          disabled={!importReadyToContinue || isImportingCsv}
                          onClick={() => setIsImportConfirming(true)}
                        >{t('Continue to import')}</Button>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <RepositoryPanel
            className={`repository-workspace-panel transition-opacity${
              isRepositoryReloading ? ' opacity-60' : ''
            }`}
          >
            <RepositoryToolbar
              searchValue={searchValue}
              priorityFilter={priorityFilter}
              caseTypeFilter={caseTypeFilter}
              caseFilter={caseFilter}
              priorityOptions={PRIORITY_OPTIONS}
              caseTypeOptions={CASE_TYPE_OPTIONS}
              visibleColumns={visibleColumns}
              onSearchChange={(value) => {
                setSearchValue(value)

                if (value === '' && search.q) {
                  submitRepositorySearch('')
                }
              }}
              onSearchSubmit={() => submitRepositorySearch()}
              onToggleColumn={toggleRepositoryColumn}
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
            />

            {activeTag ? (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-[var(--tms-text-muted)]">{t('Filtered by tag:')}</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--tms-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--tms-primary)]">
                  {activeTag}
                  <button
                    type="button"
                    aria-label={t('Clear tag filter')}
                    className="leading-none hover:opacity-70"
                    onClick={() => {
                      clearBulkConfirmations()
                      updateRepositorySearch({ tag: undefined })
                    }}
                  >
                    ✕
                  </button>
                </span>
              </div>
            ) : null}

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

            <div
              className={`repository-browser ${
                shouldShowSplitPreview ? 'repository-browser--with-preview' : ''
              }`}
            >
              <RepositorySuiteTree
                sections={dashboard.sections}
                suiteStats={dashboard.suiteStats}
                selectedSuiteId={suiteFilterId}
                allSuitesFilter={ALL_SUITES_FILTER}
                totalActiveCases={repositoryTreeTotalCases}
                caseFilter={caseFilter}
                isLoadingCounts={isLoadingRepositorySummary}
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
                      {selectedSuite ? t('Suite') : t('Repository')}
                    </div>
                    <div className="repository-browser-table__title">
                      <span>{selectedSuite?.name ?? t('All test cases')}</span>
                      <span className="repository-browser-table__title-count">
                        {tableScopeCountLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="repository-browser-table__scroll">
                  <div
                    className="tms-table-head repository-case-grid repository-browser-table__sticky-head px-3 py-1.5 sm:px-4"
                    style={repositoryGridStyle}
                  >
                    <span />
                    <span>{t('ID')}</span>
                    <span>{t('Title')}</span>
                    {visibleColumns.priority ? <span>{t('Priority')}</span> : null}
                    {visibleColumns.type ? <span>{t('Type')}</span> : null}
                    {visibleColumns.created ? <span>{t('Created')}</span> : null}
                    {visibleColumns.updated ? <span>{t('Updated')}</span> : null}
                    {visibleColumns.status ? <span>{t('Status')}</span> : null}
                    <span>{t('Actions')}</span>
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
                          isPreviewActive={previewTestId === test.id}
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
                          formatDate={formatRepositoryDate}
                          onToggleSelection={() => toggleTestSelection(test.id)}
                          onDragStart={(event) =>
                            handleCaseDragStart(event, test.id)
                          }
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
                          onPrefetchPreview={() => prefetchCasePreview(test.id)}
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
                </div>
                {dashboard.pagination.totalCases > 0 ? (
                  <div className="repository-browser-table__pagination">
                    <div className="repository-browser-table__pagination-copy">
                      <strong>{paginationSummary}</strong>
                    </div>
                    <div className="repository-browser-table__pagination-controls">
                      <span className="repository-browser-table__page-copy">
                        {paginationPageSummary}
                      </span>
                      <label className="repository-browser-table__page-size">
                        <span>{t('Rows')}</span>
                        <SelectMenu
                          value={String(selectedPageSize)}
                          onValueChange={(value) =>
                            updateRepositorySearch({
                              pageSize: normalizeRepositoryPageSize(Number(value)),
                              page: 1,
                            })
                          }
                          options={REPOSITORY_PAGE_SIZE_OPTIONS.map((size) => ({
                            value: String(size),
                            label: `${size} per page`,
                          }))}
                          className="repository-browser-table__page-size-select"
                          aria-label={t('Rows per page')}
                        />
                      </label>
                      {dashboard.pagination.totalPages > 1 ? (
                        <div className="repository-browser-table__pagination-actions">
                        <Button
                          variant="secondary"
                          disabled={dashboard.pagination.page <= 1}
                          onClick={() =>
                            updateRepositorySearch({
                              page: Math.max(1, dashboard.pagination.page - 1),
                            })
                          }
                        >{t('Previous')}</Button>
                        <Button
                          variant="secondary"
                          disabled={
                            dashboard.pagination.page >=
                            dashboard.pagination.totalPages
                          }
                          onClick={() =>
                            updateRepositorySearch({
                              page: Math.min(
                                dashboard.pagination.totalPages,
                                dashboard.pagination.page + 1,
                              ),
                            })
                          }
                        >{t('Next')}</Button>
                      </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>

              {splitPreviewTest ? (
                <aside
                  className="repository-preview-panel"
                  aria-label={t('Test case preview')}
                >
                  <div className="repository-preview-panel__header">
                    <div className="repository-preview-panel__copy">
                      <p className="tms-kicker m-0">{t('Case #{id}', { id: splitPreviewTest.id })}</p>
                      <h2 className="repository-preview-panel__title">
                        {splitPreviewTest.title}
                      </h2>
                      <p className="repository-preview-panel__subtitle">{t('Updated')}{' '}
                        {formatRepositoryDateTime(
                          splitPreviewTest.updatedAt ?? splitPreviewTest.createdAt,
                        )}
                      </p>
                      <div className="mt-2">
                        <CaseTags
                          tags={splitPreviewTest.tags}
                          onSelect={(tag) => {
                            clearBulkConfirmations()
                            updateRepositorySearch({ tag, page: 1 })
                          }}
                        />
                      </div>
                    </div>
                    <div className="repository-preview-panel__header-actions">
                      <div className="repository-preview-panel__nav">
                        <button
                          type="button"
                          className="case-actions-trigger"
                          disabled={!previousPreviewTest}
                          onClick={() => openAdjacentPreview('previous')}
                          aria-label={t('Preview previous test case')}
                          title={t('Previous case')}
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="case-actions-trigger"
                          disabled={!nextPreviewTest}
                          onClick={() => openAdjacentPreview('next')}
                          aria-label={t('Preview next test case')}
                          title={t('Next case')}
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                      <span className="repository-preview-panel__nav-divider" />
                      <button
                        type="button"
                        className="case-actions-trigger"
                        onClick={closeCasePreview}
                        aria-label={t('Close preview')}
                        title={t('Close')}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="repository-preview-panel__metadata">
                    <Badge variant="primary">
                      {previewSuite?.name ?? t('No suite')}
                    </Badge>
                    <Badge
                      variant={
                        (splitPreviewTest.status ?? 'Draft') === 'Ready'
                          ? 'statusReady'
                          : (splitPreviewTest.status ?? 'Draft') === 'Archived'
                            ? 'statusArchived'
                            : 'statusDraft'
                      }
                    >
                      {splitPreviewTest.status ?? t('Draft')}
                    </Badge>
                    <Badge
                      variant={
                        (splitPreviewTest.priority ?? 'Medium') === 'Critical'
                          ? 'priorityCritical'
                          : (splitPreviewTest.priority ?? 'Medium') === 'High'
                            ? 'priorityHigh'
                            : (splitPreviewTest.priority ?? 'Medium') === 'Low'
                              ? 'priorityLow'
                              : 'priorityMedium'
                      }
                    >
                      {splitPreviewTest.priority ?? t('Medium')}
                    </Badge>
                    <Badge>{splitPreviewTest.caseType ?? t('Functional')}</Badge>
                  </div>

                  <div className="repository-preview-panel__actions">
                    {isEditingPreviewContent ? (
                      <>
                        <Button
                          type="button"
                          disabled={
                            isSavingPreviewContent || isUploadingPreviewMedia
                          }
                          onClick={() => {
                            void savePreviewContent()
                          }}
                          variant="primary"
                        >
                          {isSavingPreviewContent ? t('Saving...') : t('Save')}
                        </Button>
                        <Button
                          type="button"
                          disabled={isSavingPreviewContent}
                          onClick={cancelPreviewContentEdit}
                          variant="secondary"
                        >{t('Cancel')}</Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          disabled={
                            isLoadingPreviewDetail ||
                            Boolean(previewDetailErrorMessage)
                          }
                          onClick={startPreviewContentEdit}
                          variant="primary"
                        >{t('Edit content')}</Button>
                        <LinkButton
                          to="/test/$testId"
                          params={{ testId: splitPreviewTest.id.toString() }}
                          variant="secondary"
                        >{t('Open')}</LinkButton>
                        <button
                          type="button"
                          className="case-actions-trigger"
                          disabled={pendingCaseActionId === splitPreviewTest.id}
                          onClick={() => {
                            void copyPreviewLink(splitPreviewTest.id)
                          }}
                          aria-label={t('Copy link to this case')}
                          title={
                            copiedPreviewLinkId === splitPreviewTest.id
                              ? t('Copied')
                              : t('Copy link')
                          }
                        >
                          {copiedPreviewLinkId === splitPreviewTest.id ? (
                            <Check
                              className="h-4 w-4 text-[var(--tms-success)]"
                              aria-hidden="true"
                            />
                          ) : (
                            <Link2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </button>
                        <PopoverMenu
                          isOpen={isPreviewActionsMenuOpen}
                          onClose={() => setIsPreviewActionsMenuOpen(false)}
                          onOpenChange={setIsPreviewActionsMenuOpen}
                          align="right"
                          className="min-w-[184px] text-left"
                          trigger={
                            <button
                              type="button"
                              className="case-actions-trigger"
                              aria-label={t('More case actions')}
                              aria-haspopup="menu"
                              aria-expanded={isPreviewActionsMenuOpen}
                            >
                              <MoreHorizontal
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </button>
                          }
                        >
                          <Link
                            to="/edit-test/$testId"
                            params={{ testId: splitPreviewTest.id.toString() }}
                            className="tms-menu-item no-underline"
                          >{t('Full editor')}</Link>
                          <PopoverMenuItem
                            disabled={pendingCaseActionId === splitPreviewTest.id}
                            onClick={() => {
                              setIsPreviewActionsMenuOpen(false)
                              void handleCaseDuplicate(splitPreviewTest.id)
                            }}
                          >{t('Duplicate')}</PopoverMenuItem>
                          <PopoverMenuSeparator />
                          {(splitPreviewTest.status ?? 'Draft') === 'Archived' ? (
                            <PopoverMenuItem
                              tone="success"
                              disabled={
                                pendingCaseActionId === splitPreviewTest.id
                              }
                              onClick={() => {
                                setIsPreviewActionsMenuOpen(false)
                                void handleCaseRestore(splitPreviewTest.id)
                              }}
                            >{t('Restore')}</PopoverMenuItem>
                          ) : (
                            <PopoverMenuItem
                              tone="warning"
                              disabled={
                                pendingCaseActionId === splitPreviewTest.id
                              }
                              onClick={() => {
                                setIsPreviewActionsMenuOpen(false)
                                void handleCaseArchive(splitPreviewTest.id)
                              }}
                            >{t('Archive')}</PopoverMenuItem>
                          )}
                        </PopoverMenu>
                      </>
                    )}
                  </div>

                  <div className="repository-preview-panel__body">
                    {isEditingPreviewContent ? (
                      <StepsEditor
                        preconditions={previewPreconditionsValue}
                        onPreconditionsChange={setPreviewPreconditionsValue}
                        description={previewDescriptionValue}
                        steps={previewStepsValue}
                        onDescriptionChange={setPreviewDescriptionValue}
                        onStepsChange={setPreviewStepsValue}
                        onUploadMedia={uploadPreviewMedia}
                        isUploadingMedia={isUploadingPreviewMedia}
                      />
                    ) : isLoadingPreviewDetail ? (
                      <div className="repository-preview-panel__skeleton">
                        <strong>{t('Loading preview')}</strong>
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : previewDetailErrorMessage ? (
                      <div className="repository-preview-panel__state repository-preview-panel__state--danger">
                        <strong>{t('Preview could not load')}</strong>
                        <span>{previewDetailErrorMessage}</span>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            removePreviewDetails([splitPreviewTest.id])
                            setPreviewTestId(splitPreviewTest.id)
                          }}
                        >{t('Retry')}</Button>
                      </div>
                    ) : (
                      <>
                        <section className="repository-preview-panel__section">
                          <PreconditionsBlock
                            html={
                              'preconditions' in splitPreviewTest
                                ? splitPreviewTest.preconditions
                                : null
                            }
                            onMediaClick={handleRichContentClick}
                          />
                          <StepsView
                            steps={splitPreviewTest.steps ?? null}
                            expected={splitPreviewTest.expected ?? null}
                            onMediaClick={handleRichContentClick}
                          />
                          <CaseRefsList
                            refs={
                              'refs' in splitPreviewTest
                                ? splitPreviewTest.refs
                                : null
                            }
                          />
                        </section>
                        <section className="repository-preview-panel__section">
                          <h3>{t('Activity')}</h3>
                          {previewActivities.length === 0 ? (
                            <p className="repository-preview-panel__muted">{t('No activity recorded yet.')}</p>
                          ) : (
                            <div className="repository-preview-panel__activity">
                              {previewActivities.map((activity) => (
                                <div
                                  key={activity.id}
                                  className="repository-preview-panel__activity-item"
                                >
                                  <span>{activity.summary}</span>
                                  <small>
                                    {formatRepositoryDateTime(activity.createdAt)}
                                  </small>
                                </div>
                              ))}
                            </div>
                          )}
                        </section>
                      </>
                    )}
                  </div>
                </aside>
              ) : null}
            </div>
          </RepositoryPanel>

          {previewDrawerTest && !shouldShowSplitPreview ? (
            <CasePreviewDrawer
              test={previewDrawerTest}
              suite={previewSuite}
              activities={previewActivities}
              isLoadingContent={isLoadingPreviewDetail}
              errorMessage={previewDetailErrorMessage}
              isEditingContent={isEditingPreviewContent}
              preconditionsValue={previewPreconditionsValue}
              descriptionValue={previewDescriptionValue}
              stepsValue={previewStepsValue}
              isSavingContent={isSavingPreviewContent}
              isUploadingMedia={isUploadingPreviewMedia}
              isPendingAction={pendingCaseActionId === previewDrawerTest.id}
              onClose={closeCasePreview}
              onStartEdit={startPreviewContentEdit}
              onCancelEdit={cancelPreviewContentEdit}
              onSaveContent={() => {
                void savePreviewContent()
              }}
              onPreconditionsChange={setPreviewPreconditionsValue}
              onDescriptionChange={setPreviewDescriptionValue}
              onStepsChange={setPreviewStepsValue}
              onUploadMedia={uploadPreviewMedia}
              onRichContentClick={handleRichContentClick}
              onRestore={() => {
                void handleCaseRestore(previewDrawerTest.id)
              }}
              onArchive={() => {
                void handleCaseArchive(previewDrawerTest.id)
              }}
              onSelectTag={(tag) => {
                clearBulkConfirmations()
                updateRepositorySearch({ tag, page: 1 })
              }}
              formatDateTime={formatRepositoryDateTime}
            />
          ) : null}

          <ConfirmDialog
            open={pendingCrossSuiteMove !== null}
            title={t('Move to a different suite?')}
            description={
              pendingCrossSuiteMove ? (
                <>
                  {pendingCrossSuiteMove.testIds.length === 1
                    ? t('This test case is')
                    : t('These {length} test cases are', { length: pendingCrossSuiteMove.testIds.length })}{' '}{t('currently in')}{' '}
                  <strong className="text-[var(--tms-text)]">
                    {pendingCrossSuiteMove.sourceSuiteNames.join(', ')}
                  </strong>{t('. Dropping here will move')}{' '}
                  {pendingCrossSuiteMove.testIds.length === 1 ? 'it' : 'them'}{' '}{t('into')}{' '}
                  <strong className="text-[var(--tms-text)]">
                    {pendingCrossSuiteMove.targetSuiteName}
                  </strong>{' '}{t('instead of just reordering.')}</>
              ) : null
            }
            confirmLabel={t('Move test case(s)')}
            confirmVariant="primary"
            isPending={isApplyingBulkAction}
            pendingLabel={t('Moving...')}
            onConfirm={() => {
              if (!pendingCrossSuiteMove) {
                return
              }

              const { testIds, targetSuiteId, orderedIds } =
                pendingCrossSuiteMove

              void handleMoveAndReorderTestCases({
                testIds,
                targetSuiteId,
                orderedIds,
              }).then(() => setPendingCrossSuiteMove(null))
            }}
            onCancel={() => setPendingCrossSuiteMove(null)}
          />
        </div>
      </div>
    </main>
  )
}
