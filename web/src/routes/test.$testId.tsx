import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { sanitizeHtml } from '../lib/sanitize-html'
import { EditingFieldGroup, EditingSurfaceSection } from '../components/layout/EditingSurface'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmActionAlert } from '../components/ui/ConfirmActionAlert'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuSeparator,
} from '../components/ui/PopoverMenu'
import { SelectMenu } from '../components/ui/SelectMenu'
import {
  getAutomationHistoryForTestCase,
  type AutomationTestCaseHistory,
} from '../features/automation/server'
import { uploadTestMedia } from '../features/media/server'
import { markRepositoryPreviewDetailStale } from '../lib/repositoryPreviewCache'
import {
  archiveTestCase,
  bulkMoveTestCases,
  bulkUpdateTestMetadata,
  deleteArchivedTestCase,
  duplicateTestCase,
  getTestDetail,
  restoreTestCase,
  updateTestContent,
  updateTestStatus,
  updateTestTitle,
} from '../features/tests/server'

export const Route = createFileRoute('/test/$testId')({
  loader: async ({ params }) => {
    const testId = Number(params.testId)

    if (!Number.isInteger(testId) || testId <= 0) {
      throw notFound()
    }

    const test = await getTestDetail({
      data: {
        id: testId,
      },
    })

    const automationHistory =
      test.projectId === null
        ? null
        : (
            await getAutomationHistoryForTestCase({
              data: {
                projectId: test.projectId,
                testId: test.id,
              },
            })
          ).history

    return {
      ...test,
      automationHistory,
    }
  },
  component: TestDetailPage,
})

const CASE_STATUS_OPTIONS = ['Draft', 'Ready', 'Archived'] as const
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'] as const
const CASE_TYPE_OPTIONS = [
  'Functional',
  'Regression',
  'Smoke',
  'E2E',
  'UI',
  'API',
] as const
const TEST_DETAIL_VISIBLE_AUTOMATION_LIMIT = 3
const TEST_DETAIL_VISIBLE_ACTIVITY_LIMIT = 5

type CaseStatusValue = (typeof CASE_STATUS_OPTIONS)[number]
type PriorityValue = (typeof PRIORITY_OPTIONS)[number]
type CaseTypeValue = (typeof CASE_TYPE_OPTIONS)[number]
type PendingMetadataField = 'title' | 'status' | 'priority' | 'caseType' | 'suite'

function formatDetailDate(value: string | null | undefined): string {
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

function formatCompactDetailDate(value: string | null | undefined): string {
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
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getStatusVariant(
  status: string | null,
): 'statusReady' | 'statusArchived' | 'statusDraft' {
  if (status === 'Ready') {
    return 'statusReady'
  }

  if (status === 'Archived') {
    return 'statusArchived'
  }

  return 'statusDraft'
}

function getPriorityVariant(
  priority: string | null,
):
  | 'priorityLow'
  | 'priorityMedium'
  | 'priorityHigh'
  | 'priorityCritical' {
  if (priority === 'Critical') {
    return 'priorityCritical'
  }

  if (priority === 'High') {
    return 'priorityHigh'
  }

  if (priority === 'Low') {
    return 'priorityLow'
  }

  return 'priorityMedium'
}

function getAutomationStatusVariant(
  status: string | null,
): 'runPassed' | 'runFailed' | 'runBlocked' | 'runNotRun' | 'primary' {
  if (status === 'passed') {
    return 'runPassed'
  }

  if (status === 'failed' || status === 'needs_review') {
    return 'runFailed'
  }

  if (status === 'blocked') {
    return 'runBlocked'
  }

  if (status === 'skipped' || status === 'unknown') {
    return 'runNotRun'
  }

  return 'primary'
}

function formatAutomationStatus(status: string | null): string {
  if (!status) {
    return 'No runs'
  }

  return status
    .replaceAll('_', ' ')
    .replace(/^\w/, (letter) => letter.toUpperCase())
}

function formatAutomationDuration(durationMs: number): string {
  if (durationMs <= 0) {
    return '0s'
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  const seconds = Math.round(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes === 0) {
    return `${seconds}s`
  }

  return `${minutes}m ${remainingSeconds}s`
}

function AutomationHistoryBlock({
  history,
  projectSlug,
}: {
  history: AutomationTestCaseHistory | null
  projectSlug: string | null
}) {
  const recentResults = history?.results.slice(
    0,
    TEST_DETAIL_VISIBLE_AUTOMATION_LIMIT,
  ) ?? []
  const hiddenResultsCount = Math.max(
    0,
    (history?.results.length ?? 0) - recentResults.length,
  )

  return (
    <section className="mt-6 border-t border-[var(--tms-border-subtle)] pt-5">
      <div className="test-detail-section-heading">
        <WorkspaceSectionHeader
          dense
          title="Automation"
          className="mb-0"
        />
        {projectSlug && history && history.totalResults > 0 ? (
          <Link
            to="/project/$projectSlug/automation/runs"
            params={{ projectSlug }}
            className="test-detail-section-link"
          >
            Runs
          </Link>
        ) : null}
      </div>
      {!history || history.totalResults === 0 ? (
        <p className="m-0 text-sm text-[var(--tms-text-muted)]">
          No automation results linked yet.
        </p>
      ) : (
        <div className="test-detail-automation">
          <div className="test-detail-automation-summary">
            <div className="test-detail-automation-summary__latest">
              <span>Latest</span>
              <Badge variant={getAutomationStatusVariant(history.latestStatus)}>
                {formatAutomationStatus(history.latestStatus)}
              </Badge>
            </div>
            <div className="test-detail-automation-summary__metric">
              <span>Pass rate</span>
              <strong>
                {history.passRate}%
              </strong>
            </div>
            <div className="test-detail-automation-summary__metric">
              <span>Results</span>
              <strong>
                {history.totalResults}
              </strong>
            </div>
          </div>

          <div className="test-detail-automation-list">
            {recentResults.map((result) => (
              <div
                key={result.id}
                className="test-detail-automation-item"
              >
                <div className="test-detail-automation-item__header">
                  {projectSlug ? (
                    <Link
                      to="/project/$projectSlug/automation/runs/$runId"
                      params={{
                        projectSlug,
                        runId: result.runId.toString(),
                      }}
                      className="test-detail-automation-item__title"
                    >
                      {result.runName}
                    </Link>
                  ) : (
                    <div className="test-detail-automation-item__title">
                      {result.runName}
                    </div>
                  )}
                  <Badge variant={getAutomationStatusVariant(result.status)}>
                    {formatAutomationStatus(result.status)}
                  </Badge>
                </div>
                <div className="test-detail-automation-item__meta">
                  <span>{formatAutomationDuration(result.durationMs)}</span>
                  <span>{formatDetailDate(result.startedAt ?? result.runCreatedAt)}</span>
                  {result.environment ? <span>{result.environment}</span> : null}
                  {result.branch ? <span>{result.branch}</span> : null}
                </div>
                {result.errorMessage ? (
                  <div className="test-detail-automation-item__error">
                    {result.errorMessage}
                  </div>
                ) : null}
              </div>
            ))}
            {hiddenResultsCount > 0 ? (
              <div className="test-detail-activity-muted">
                {hiddenResultsCount} older automation results hidden.
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  )
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

function TestDetailPage() {
  const test = Route.useLoaderData()
  const router = useRouter()
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const [stepsValue, setStepsValue] = useState(test.steps ?? '')
  const [expectedValue, setExpectedValue] = useState(test.expected ?? '')
  const [isSavingContent, setIsSavingContent] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [caseTitle, setCaseTitle] = useState(test.title)
  const [titleValue, setTitleValue] = useState(test.title)
  const [pendingMetadataField, setPendingMetadataField] =
    useState<PendingMetadataField | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)
  const [isActivityExpanded, setIsActivityExpanded] = useState(false)

  const repositoryLink = test.projectSlug
    ? {
        to: '/project/$projectSlug/repository' as const,
        params: { projectSlug: test.projectSlug },
      }
    : null
  const visibleActivities = isActivityExpanded
    ? test.activities
    : test.activities.slice(0, TEST_DETAIL_VISIBLE_ACTIVITY_LIMIT)
  const hiddenActivityCount = Math.max(
    0,
    test.activities.length - visibleActivities.length,
  )

  async function handleArchive(): Promise<void> {
    setActionError(null)
    setIsArchiving(true)

    try {
      await archiveTestCase({
        data: {
          id: test.id,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to archive test case.',
      )
    } finally {
      setIsArchiving(false)
    }
  }

  async function handleRestore(): Promise<void> {
    setActionError(null)
    setIsArchiving(true)

    try {
      await restoreTestCase({
        data: {
          id: test.id,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to restore test case.',
      )
    } finally {
      setIsArchiving(false)
    }
  }

  async function handleDuplicate(): Promise<void> {
    setActionError(null)
    setIsDuplicating(true)

    try {
      const result = await duplicateTestCase({
        data: {
          id: test.id,
        },
      })

      window.location.href = `/test/${result.id}`
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to duplicate test case.',
      )
    } finally {
      setIsDuplicating(false)
    }
  }

  function startContentEdit(): void {
    setActionError(null)
    setStepsValue(test.steps ?? '')
    setExpectedValue(test.expected ?? '')
    setIsEditingContent(true)
  }

  function cancelContentEdit(): void {
    setStepsValue(test.steps ?? '')
    setExpectedValue(test.expected ?? '')
    setIsEditingContent(false)
  }

  async function uploadInlineMedia(file: File): Promise<string> {
    setIsUploadingMedia(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadTestMedia({
        data: formData,
      })

      return result.url
    } finally {
      setIsUploadingMedia(false)
    }
  }

  async function saveContentEdit(): Promise<void> {
    setActionError(null)
    setIsSavingContent(true)

    try {
      await updateTestContent({
        data: {
          id: test.id,
          steps: stepsValue,
          expected: expectedValue,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      setIsEditingContent(false)
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to update test content.',
      )
    } finally {
      setIsSavingContent(false)
    }
  }

  function startTitleEdit(): void {
    setActionError(null)
    setTitleValue(caseTitle)
    setIsEditingTitle(true)
  }

  function cancelTitleEdit(): void {
    setTitleValue(caseTitle)
    setIsEditingTitle(false)
  }

  async function saveTitleEdit(): Promise<void> {
    const nextTitle = titleValue.trim()

    if (!nextTitle) {
      setActionError('Test case title cannot be empty.')
      return
    }

    if (nextTitle === caseTitle) {
      cancelTitleEdit()
      return
    }

    setActionError(null)
    setPendingMetadataField('title')

    try {
      await updateTestTitle({
        data: {
          id: test.id,
          title: nextTitle,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      setCaseTitle(nextTitle)
      setTitleValue(nextTitle)
      setIsEditingTitle(false)
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to update test title.',
      )
    } finally {
      setPendingMetadataField(null)
    }
  }

  async function handleStatusChange(status: CaseStatusValue): Promise<void> {
    if (status === (test.status ?? 'Draft')) {
      return
    }

    setActionError(null)
    setPendingMetadataField('status')

    try {
      await updateTestStatus({
        data: {
          id: test.id,
          status,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to update status.',
      )
    } finally {
      setPendingMetadataField(null)
    }
  }

  async function handlePriorityChange(priority: PriorityValue): Promise<void> {
    if (priority === (test.priority ?? 'Medium')) {
      return
    }

    setActionError(null)
    setPendingMetadataField('priority')

    try {
      await bulkUpdateTestMetadata({
        data: {
          ids: [test.id],
          priority,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to update priority.',
      )
    } finally {
      setPendingMetadataField(null)
    }
  }

  async function handleCaseTypeChange(caseType: CaseTypeValue): Promise<void> {
    if (caseType === (test.caseType ?? 'Functional')) {
      return
    }

    setActionError(null)
    setPendingMetadataField('caseType')

    try {
      await bulkUpdateTestMetadata({
        data: {
          ids: [test.id],
          caseType,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to update type.',
      )
    } finally {
      setPendingMetadataField(null)
    }
  }

  async function handleSuiteChange(sectionId: number): Promise<void> {
    if (sectionId === test.sectionId) {
      return
    }

    setActionError(null)
    setPendingMetadataField('suite')

    try {
      await bulkMoveTestCases({
        data: {
          ids: [test.id],
          sectionId,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Failed to move test case.',
      )
    } finally {
      setPendingMetadataField(null)
    }
  }

  async function handleDeletePermanently(): Promise<void> {
    setActionError(null)
    setIsDeleting(true)

    try {
      await deleteArchivedTestCase({
        data: {
          id: test.id,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      window.location.href = test.projectSlug
        ? `/project/${test.projectSlug}/repository`
        : '/'
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Failed to delete archived test case.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <main className="page-wrap test-detail-page px-4 py-4 sm:py-6">
      <div className="mx-auto max-w-[1240px]">
        <div className="test-detail-top-nav">
          <div className="test-detail-breadcrumb">
            <Link to="/" className="no-underline text-[var(--tms-primary)]">
              Workspace
            </Link>
            <span>/</span>
            {test.projectSlug ? (
              <Link
                to="/project/$projectSlug"
                params={{ projectSlug: test.projectSlug }}
                className="no-underline text-[var(--tms-primary)]"
              >
                {test.projectName ?? 'Project'}
              </Link>
            ) : (
              <span>{test.projectName ?? 'Project'}</span>
            )}
            <span>/</span>
            <span>{test.sectionName ?? 'No suite'}</span>
          </div>

          {repositoryLink ? (
            <Link
              to={repositoryLink.to}
              params={repositoryLink.params}
              className="tms-button tms-button-secondary test-detail-back-link no-underline"
            >
              Back to repository
            </Link>
          ) : (
            <Link
              to="/"
              className="tms-button tms-button-secondary test-detail-back-link no-underline"
            >
              Back to workspace
            </Link>
          )}
        </div>

        <div className="grid gap-4">
        <Panel className="test-detail-header-panel">
          <div className="test-detail-header-body">
            <div className="test-detail-header-layout">
              <div className="test-detail-heading">
                <div className="test-detail-meta-line">
                  <span>Case #{test.id}</span>
                  <span>{test.sectionName ?? 'No suite'}</span>
                  <span>Updated {formatDetailDate(test.updatedAt ?? test.createdAt)}</span>
                </div>
                <div className="test-detail-title-row">
                  {isEditingTitle ? (
                    <Input
                      value={titleValue}
                      onChange={(event) => setTitleValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void saveTitleEdit()
                        }

                        if (event.key === 'Escape') {
                          event.preventDefault()
                          cancelTitleEdit()
                        }
                      }}
                      disabled={pendingMetadataField === 'title'}
                      autoFocus
                      className="test-detail-title-input"
                      aria-label="Edit test case title"
                    />
                  ) : (
                    <h1 className="test-detail-title">
                      {caseTitle}
                    </h1>
                  )}
                  <div className="test-detail-title-actions">
                    {isEditingTitle ? (
                      <>
                      <Button
                        type="button"
                        onClick={() => {
                          void saveTitleEdit()
                        }}
                        disabled={pendingMetadataField === 'title'}
                        variant="primary"
                      >
                        Save title
                      </Button>
                      <Button
                        type="button"
                        onClick={cancelTitleEdit}
                        disabled={pendingMetadataField === 'title'}
                      >
                        Cancel
                      </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <div className="test-detail-badges">
                  <Badge variant={getStatusVariant(test.status)}>
                    {test.status ?? 'Draft'}
                  </Badge>
                  <Badge variant={getPriorityVariant(test.priority)}>
                    {test.priority ?? 'Medium'}
                  </Badge>
                  <Badge variant="draft">
                    {test.caseType ?? 'Functional'}
                  </Badge>
                </div>
              </div>

              <div className="test-detail-main-actions">
                {isEditingContent ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => {
                        void saveContentEdit()
                      }}
                      disabled={isSavingContent || isUploadingMedia}
                      variant="primary"
                      size="sm"
                    >
                      {isSavingContent ? 'Saving...' : 'Save content'}
                    </Button>
                    <Button
                      type="button"
                      onClick={cancelContentEdit}
                      disabled={isSavingContent}
                      variant="secondary"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={startContentEdit}
                    variant="primary"
                    size="sm"
                  >
                    Edit content
                  </Button>
                )}
                <PopoverMenu
                  isOpen={isMoreActionsOpen}
                  onClose={() => setIsMoreActionsOpen(false)}
                  onOpenChange={setIsMoreActionsOpen}
                  align="right"
                  trigger={
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      aria-label="More test case actions"
                      aria-expanded={isMoreActionsOpen}
                    >
                      <MoreHorizontal
                        size={16}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </Button>
                  }
                >
                  <PopoverMenuItem
                    onClick={() => {
                      setIsMoreActionsOpen(false)
                      startTitleEdit()
                    }}
                  >
                    Rename
                  </PopoverMenuItem>
                  <PopoverMenuSeparator />
                  <Link
                    to="/edit-test/$testId"
                    params={{ testId: test.id.toString() }}
                    className="tms-menu-item no-underline"
                    onClick={() => setIsMoreActionsOpen(false)}
                  >
                    Full editor
                  </Link>
                  <PopoverMenuSeparator />
                  <PopoverMenuItem
                    onClick={() => {
                      setIsMoreActionsOpen(false)
                      void handleDuplicate()
                    }}
                    disabled={isDuplicating || isDeleting}
                  >
                    {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                  </PopoverMenuItem>
                  <PopoverMenuSeparator />
                  {test.status === 'Archived' ? (
                    <PopoverMenuItem
                      onClick={() => {
                        setIsMoreActionsOpen(false)
                        void handleRestore()
                      }}
                      disabled={isArchiving || isDeleting}
                      tone="success"
                    >
                      {isArchiving ? 'Restoring...' : 'Restore'}
                    </PopoverMenuItem>
                  ) : (
                    <PopoverMenuItem
                      onClick={() => {
                        setIsMoreActionsOpen(false)
                        setShowArchiveConfirm(true)
                      }}
                      disabled={isArchiving || isDeleting}
                      tone="warning"
                    >
                      Archive
                    </PopoverMenuItem>
                  )}
                </PopoverMenu>
              </div>
            </div>

            {showArchiveConfirm ? (
              <ConfirmActionAlert
                className="mt-4"
                title="Archive this test case?"
                description="The case will leave the active repository and can be restored later from the Archived filter."
                confirmLabel="Archive test case"
                pendingLabel="Archiving..."
                confirmVariant="primary"
                isPending={isArchiving}
                onCancel={() => setShowArchiveConfirm(false)}
                onConfirm={() => {
                  void (async () => {
                    await handleArchive()
                    setShowArchiveConfirm(false)
                  })()
                }}
              />
            ) : null}

            {actionError ? (
              <Alert variant="danger" className="mt-4">
                {actionError}
              </Alert>
            ) : null}
          </div>

        </Panel>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Panel className="test-detail-content-panel">
              <EditingSurfaceSection
                title="Content"
                bodyClassName="test-detail-content-stack"
              >
                {isEditingContent ? (
                  <>
                    <RichTextEditor
                      label="Steps"
                      placeholder="Describe the test steps"
                      value={stepsValue}
                      onChange={setStepsValue}
                      onUploadMedia={uploadInlineMedia}
                      isUploading={isUploadingMedia}
                    />
                    <RichTextEditor
                      label="Expected result"
                      placeholder="Describe the expected result"
                      value={expectedValue}
                      onChange={setExpectedValue}
                      onUploadMedia={uploadInlineMedia}
                      isUploading={isUploadingMedia}
                    />
                  </>
                ) : (
                  <>
                    <section className="test-detail-rich-block">
                      <WorkspaceSectionHeader
                        dense
                        title="Steps"
                        className="test-detail-rich-block__header"
                      />
                      <div
                        className="test-detail-rich-block__body rich-output prose prose-sm max-w-none text-[var(--tms-text)]"
                        onClick={handleRichContentClick}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(test.steps || '<p>-</p>'),
                        }}
                      />
                    </section>

                    <section className="test-detail-rich-block">
                      <WorkspaceSectionHeader
                        dense
                        title="Expected result"
                        className="test-detail-rich-block__header"
                      />
                      <div
                        className="test-detail-rich-block__body rich-output prose prose-sm max-w-none text-[var(--tms-text)]"
                        onClick={handleRichContentClick}
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(test.expected || '<p>-</p>'),
                        }}
                      />
                    </section>
                  </>
                )}
              </EditingSurfaceSection>
            </Panel>

            <Panel className="test-detail-side-panel bg-[var(--tms-surface-soft)] px-4 py-5 sm:px-6 sm:py-6">
              <EditingSurfaceSection
                dense
                title="Details"
                bodyClassName="test-detail-meta-grid"
              >
                  <div className="test-detail-meta-item">
                    <div className="test-detail-meta-item__label">Project</div>
                    <div className="test-detail-meta-item__value">
                      {test.projectName ?? '-'}
                    </div>
                  </div>
                  <EditingFieldGroup label="Suite" className="test-detail-meta-item">
                      <SelectMenu
                        value={test.sectionId?.toString() ?? ''}
                        onValueChange={(value) => {
                          const sectionId = Number(value)

                          if (Number.isInteger(sectionId) && sectionId > 0) {
                            void handleSuiteChange(sectionId)
                          }
                        }}
                        options={[
                          ...(test.sectionId === null
                            ? [{ value: '', label: 'No suite' }]
                            : []),
                          ...test.sections.map((section) => ({
                            value: section.id.toString(),
                            label: section.name,
                          })),
                        ]}
                        disabled={
                          pendingMetadataField !== null ||
                          test.sections.length === 0
                        }
                        className="test-detail-meta-select"
                        aria-label="Change suite"
                      />
                  </EditingFieldGroup>
                  <div className="test-detail-meta-controls">
                  <EditingFieldGroup label="Status" className="test-detail-meta-item">
                      <SelectMenu
                        value={test.status ?? 'Draft'}
                        onValueChange={(value) => {
                          void handleStatusChange(value as CaseStatusValue)
                        }}
                        options={CASE_STATUS_OPTIONS.map((status) => ({
                          value: status,
                          label: status,
                        }))}
                        disabled={pendingMetadataField !== null}
                        className="test-detail-meta-select"
                        aria-label="Change status"
                      />
                  </EditingFieldGroup>
                  <EditingFieldGroup label="Priority" className="test-detail-meta-item">
                      <SelectMenu
                        value={test.priority ?? 'Medium'}
                        onValueChange={(value) => {
                          void handlePriorityChange(value as PriorityValue)
                        }}
                        options={PRIORITY_OPTIONS.map((priority) => ({
                          value: priority,
                          label: priority,
                        }))}
                        disabled={pendingMetadataField !== null}
                        className="test-detail-meta-select"
                        aria-label="Change priority"
                      />
                  </EditingFieldGroup>
                  <EditingFieldGroup label="Type" className="test-detail-meta-item">
                      <SelectMenu
                        value={test.caseType ?? 'Functional'}
                        onValueChange={(value) => {
                          void handleCaseTypeChange(value as CaseTypeValue)
                        }}
                        options={CASE_TYPE_OPTIONS.map((caseType) => ({
                          value: caseType,
                          label: caseType,
                        }))}
                        disabled={pendingMetadataField !== null}
                        className="test-detail-meta-select"
                        aria-label="Change type"
                      />
                  </EditingFieldGroup>
                  </div>
                  <div className="test-detail-meta-dates">
                    <div className="test-detail-meta-date">
                      <span>Created</span>
                      <strong title={formatDetailDate(test.createdAt)}>
                        {formatCompactDetailDate(test.createdAt)}
                      </strong>
                    </div>
                    <div className="test-detail-meta-date">
                      <span>Updated</span>
                      <strong
                        title={formatDetailDate(test.updatedAt ?? test.createdAt)}
                      >
                        {formatCompactDetailDate(
                          test.updatedAt ?? test.createdAt,
                        )}
                      </strong>
                    </div>
                  </div>
              </EditingSurfaceSection>

              <AutomationHistoryBlock
                history={test.automationHistory}
                projectSlug={test.projectSlug}
              />

              <section className="mt-6 border-t border-[var(--tms-border-subtle)] pt-5">
                <div className="test-detail-section-heading">
                  <WorkspaceSectionHeader
                    dense
                    title="Activity"
                    className="mb-0"
                  />
                  {test.activities.length > TEST_DETAIL_VISIBLE_ACTIVITY_LIMIT ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsActivityExpanded((value) => !value)}
                    >
                      {isActivityExpanded
                        ? 'Show recent'
                        : `Show all ${test.activities.length}`}
                    </Button>
                  ) : null}
                </div>
                {test.activities.length === 0 ? (
                  <p className="m-0 text-sm text-[var(--tms-text-muted)]">
                    No activity recorded yet.
                  </p>
                ) : (
                  <div
                    className={`test-detail-activity-list ${
                      isActivityExpanded
                        ? 'test-detail-activity-list--expanded'
                        : ''
                    }`}
                  >
                    {visibleActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="test-detail-activity-item"
                      >
                        <div className="test-detail-activity-summary">
                          {activity.summary}
                        </div>
                        <div className="test-detail-activity-meta">
                          {activity.actorName ?? 'system'} -{' '}
                          {activity.action.replaceAll('_', ' ')}
                        </div>
                        <div className="test-detail-activity-date">
                          {formatDetailDate(activity.createdAt)}
                        </div>
                      </div>
                    ))}
                    {hiddenActivityCount > 0 ? (
                      <div className="test-detail-activity-muted">
                        {hiddenActivityCount} older activities hidden.
                      </div>
                    ) : null}
                  </div>
                )}
              </section>

              {test.status === 'Archived' ? (
                <section className="mt-6 border-t border-[var(--tms-border-subtle)] pt-5">
                  {showDeleteConfirm ? (
                    <ConfirmActionAlert
                      className="p-3"
                      title="Delete this archived test case permanently?"
                      description="This action cannot be undone and will remove the test case from the repository."
                      confirmLabel="Delete permanently"
                      pendingLabel="Deleting..."
                      confirmVariant="danger"
                      isPending={isDeleting}
                      onCancel={() => setShowDeleteConfirm(false)}
                      onConfirm={() => {
                        void handleDeletePermanently()
                      }}
                    />
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting || isArchiving}
                      variant="secondary"
                      className="w-full"
                    >
                      Delete permanently
                    </Button>
                  )}
                </section>
              ) : null}
            </Panel>
          </div>
        </div>
      </div>
    </main>
  )
}
