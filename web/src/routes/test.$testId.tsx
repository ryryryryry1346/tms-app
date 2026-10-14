import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { ChevronDown, MoreHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { StepsEditor } from '../components/repository/StepsEditor'
import { StepsView } from '../components/repository/StepsView'
import {
  CaseRefsList,
  CaseTags,
  PreconditionsBlock,
} from '../components/repository/CaseFieldsView'
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
import { parseRefs } from '../lib/caseFields'
import { markRepositoryPreviewDetailStale } from '../lib/repositoryPreviewCache'
import {
  caseContentForEditing,
  serializeCaseContent,
  type CaseStep,
} from '../lib/caseContent'
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
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

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
  flush = false,
}: {
  history: AutomationTestCaseHistory | null
  projectSlug: string | null
  flush?: boolean
}) {
  const t = useT()

  const recentResults = history?.results.slice(
    0,
    TEST_DETAIL_VISIBLE_AUTOMATION_LIMIT,
  ) ?? []
  const hiddenResultsCount = Math.max(
    0,
    (history?.results.length ?? 0) - recentResults.length,
  )

  return (
    <section
      className={
        flush
          ? ''
          : 'mt-6 border-t border-[var(--tms-border-subtle)] pt-5'
      }
    >
      <div className="test-detail-section-heading">
        <WorkspaceSectionHeader
          dense
          title={t('Automation')}
          className="mb-0"
        />
        {projectSlug && history && history.totalResults > 0 ? (
          <Link
            to="/project/$projectSlug/automation/runs"
            params={{ projectSlug }}
            className="test-detail-section-link"
          >{t('Runs')}</Link>
        ) : null}
      </div>
      {!history || history.totalResults === 0 ? (
        <p className="m-0 text-sm text-[var(--tms-text-muted)]">{t('No automation results linked yet.')}</p>
      ) : (
        <div className="test-detail-automation">
          <div className="test-detail-automation-summary">
            <div className="test-detail-automation-summary__latest">
              <span>{t('Latest')}</span>
              <Badge variant={getAutomationStatusVariant(history.latestStatus)}>
                {t(formatAutomationStatus(history.latestStatus))}
              </Badge>
            </div>
            <div className="test-detail-automation-summary__metric">
              <span>{t('Pass rate')}</span>
              <strong>
                {history.passRate}%
              </strong>
            </div>
            <div className="test-detail-automation-summary__metric">
              <span>{t('Results')}</span>
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
                    {t(formatAutomationStatus(result.status))}
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
              <div className="test-detail-activity-muted">{t('{hiddenResultsCount} older automation results hidden.', { hiddenResultsCount })}</div>
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
  const t = useT()

  const test = Route.useLoaderData()
  const router = useRouter()
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isEditingContent, setIsEditingContent] = useState(false)
  const initialEditContent = caseContentForEditing(test.steps, test.expected)
  const [descriptionValue, setDescriptionValue] = useState(
    initialEditContent.description,
  )
  const [stepsValue, setStepsValue] = useState<CaseStep[]>(
    initialEditContent.steps,
  )
  const [preconditionsValue, setPreconditionsValue] = useState(
    test.preconditions ?? '',
  )
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
  const [showSavedFlash, setShowSavedFlash] = useState(false)
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flashSaved(): void {
    if (savedFlashTimer.current) {
      clearTimeout(savedFlashTimer.current)
    }

    setShowSavedFlash(true)
    savedFlashTimer.current = setTimeout(() => {
      setShowSavedFlash(false)
    }, 1800)
  }

  useEffect(() => {
    return () => {
      if (savedFlashTimer.current) {
        clearTimeout(savedFlashTimer.current)
      }
    }
  }, [])

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
        getErrorMessage(error, 'Failed to archive test case.'),
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
        getErrorMessage(error, 'Failed to restore test case.'),
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

      await router.navigate({
        to: '/test/$testId',
        params: { testId: result.id.toString() },
      })
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to duplicate test case.'),
      )
    } finally {
      setIsDuplicating(false)
    }
  }

  function startContentEdit(): void {
    setActionError(null)
    const content = caseContentForEditing(test.steps, test.expected)
    setDescriptionValue(content.description)
    setStepsValue(content.steps)
    setPreconditionsValue(test.preconditions ?? '')
    setIsEditingContent(true)
  }

  function cancelContentEdit(): void {
    const content = caseContentForEditing(test.steps, test.expected)
    setDescriptionValue(content.description)
    setStepsValue(content.steps)
    setPreconditionsValue(test.preconditions ?? '')
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
          steps: serializeCaseContent(descriptionValue, stepsValue),
          expected: '',
          preconditions: preconditionsValue,
        },
      })

      markRepositoryPreviewDetailStale(test.id)
      setIsEditingContent(false)
      flashSaved()
      await router.invalidate()
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to update test content.'),
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
      flashSaved()
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to update test title.'),
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
      flashSaved()
      await router.invalidate()
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to update status.'),
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
      flashSaved()
      await router.invalidate()
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to update priority.'),
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
      flashSaved()
      await router.invalidate()
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to update type.'),
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
      flashSaved()
      await router.invalidate()
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to move test case.'),
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

      if (test.projectSlug) {
        await router.navigate({
          to: '/project/$projectSlug/repository',
          params: { projectSlug: test.projectSlug },
        })
      } else {
        await router.navigate({ to: '/' })
      }
    } catch (error) {
      setActionError(
        getErrorMessage(error, 'Failed to delete archived test case.'),
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
            <Link to="/" className="no-underline text-[var(--tms-primary)]">{t('Workspace')}</Link>
            <span>/</span>
            {test.projectSlug ? (
              <Link
                to="/project/$projectSlug"
                params={{ projectSlug: test.projectSlug }}
                className="no-underline text-[var(--tms-primary)]"
              >
                {test.projectName ?? t('Project')}
              </Link>
            ) : (
              <span>{test.projectName ?? t('Project')}</span>
            )}
            <span>/</span>
            <span>{test.sectionName ?? t('No suite')}</span>
          </div>

          {repositoryLink ? (
            <Link
              to={repositoryLink.to}
              params={repositoryLink.params}
              className="tms-button tms-button-secondary test-detail-back-link no-underline"
            >{t('Back to repository')}</Link>
          ) : (
            <Link
              to="/"
              className="tms-button tms-button-secondary test-detail-back-link no-underline"
            >{t('Back to workspace')}</Link>
          )}
        </div>

        <div className="grid gap-4">
        <Panel className="test-detail-header-panel">
          <div className="test-detail-header-body">
            <div className="test-detail-header-layout">
              <div className="test-detail-heading">
                <div className="test-detail-meta-line">
                  <span>{t('Case #{id}', { id: test.id })}</span>
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
                      aria-label={t('Edit test case title')}
                    />
                  ) : (
                    <h1 className="test-detail-title">
                      {caseTitle}
                    </h1>
                  )}
                </div>
                <div className="test-detail-tags">
                  <CaseTags tags={test.tags} />
                </div>
              </div>

              <div className="test-detail-main-actions">
                {isEditingTitle ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => {
                        void saveTitleEdit()
                      }}
                      disabled={pendingMetadataField === 'title'}
                      variant="primary"
                      size="sm"
                    >
                      {pendingMetadataField === 'title' ? t('Saving...') : t('Save')}
                    </Button>
                    <Button
                      type="button"
                      onClick={cancelTitleEdit}
                      disabled={pendingMetadataField === 'title'}
                      variant="secondary"
                      size="sm"
                    >{t('Cancel')}</Button>
                  </>
                ) : isEditingContent ? (
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
                      {isSavingContent ? t('Saving...') : t('Save content')}
                    </Button>
                    <Button
                      type="button"
                      onClick={cancelContentEdit}
                      disabled={isSavingContent}
                      variant="secondary"
                      size="sm"
                    >{t('Cancel')}</Button>
                  </>
                ) : (
                  <>
                  <Button
                    type="button"
                    onClick={startContentEdit}
                    variant="primary"
                    size="sm"
                  >{t('Edit content')}</Button>
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
                      aria-label={t('More test case actions')}
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
                  >{t('Rename')}</PopoverMenuItem>
                  <PopoverMenuSeparator />
                  <Link
                    to="/edit-test/$testId"
                    params={{ testId: test.id.toString() }}
                    className="tms-menu-item no-underline"
                    onClick={() => setIsMoreActionsOpen(false)}
                  >{t('Full editor')}</Link>
                  <PopoverMenuSeparator />
                  <PopoverMenuItem
                    onClick={() => {
                      setIsMoreActionsOpen(false)
                      void handleDuplicate()
                    }}
                    disabled={isDuplicating || isDeleting}
                  >
                    {isDuplicating ? t('Duplicating...') : t('Duplicate')}
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
                      {isArchiving ? t('Restoring...') : t('Restore')}
                    </PopoverMenuItem>
                  ) : (
                    <PopoverMenuItem
                      onClick={() => {
                        setIsMoreActionsOpen(false)
                        setShowArchiveConfirm(true)
                      }}
                      disabled={isArchiving || isDeleting}
                      tone="warning"
                    >{t('Archive')}</PopoverMenuItem>
                  )}
                </PopoverMenu>
                  </>
                )}
              </div>
            </div>

            {showArchiveConfirm ? (
              <ConfirmActionAlert
                className="mt-4"
                title={t('Archive this test case?')}
                description={t('The case will leave the active repository and can be restored later from the Archived filter.')}
                confirmLabel={t('Archive test case')}
                pendingLabel={t('Archiving...')}
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

          <div className="test-detail-props">
                  <EditingFieldGroup label={t('Suite')} className="test-detail-meta-item">
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
                            ? [{ value: '', label: t('No suite') }]
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
                        aria-label={t('Change suite')}
                      />
                  </EditingFieldGroup>
                  <div className="test-detail-meta-controls">
                  <EditingFieldGroup label={t('Status')} className="test-detail-meta-item">
                      <SelectMenu
                        value={test.status ?? 'Draft'}
                        onValueChange={(value) => {
                          void handleStatusChange(value as CaseStatusValue)
                        }}
                        options={CASE_STATUS_OPTIONS.map((status) => ({
                          value: status,
                          label: t(status),
                        }))}
                        disabled={pendingMetadataField !== null}
                        className="test-detail-meta-select"
                        aria-label={t('Change status')}
                      />
                  </EditingFieldGroup>
                  <EditingFieldGroup label={t('Priority')} className="test-detail-meta-item">
                      <SelectMenu
                        value={test.priority ?? 'Medium'}
                        onValueChange={(value) => {
                          void handlePriorityChange(value as PriorityValue)
                        }}
                        options={PRIORITY_OPTIONS.map((priority) => ({
                          value: priority,
                          label: t(priority),
                        }))}
                        disabled={pendingMetadataField !== null}
                        className="test-detail-meta-select"
                        aria-label={t('Change priority')}
                      />
                  </EditingFieldGroup>
                  <EditingFieldGroup label={t('Type')} className="test-detail-meta-item">
                      <SelectMenu
                        value={test.caseType ?? 'Functional'}
                        onValueChange={(value) => {
                          void handleCaseTypeChange(value as CaseTypeValue)
                        }}
                        options={CASE_TYPE_OPTIONS.map((caseType) => ({
                          value: caseType,
                          label: t(caseType),
                        }))}
                        disabled={pendingMetadataField !== null}
                        className="test-detail-meta-select"
                        aria-label={t('Change type')}
                      />
                  </EditingFieldGroup>
                  </div>
                  <div className="test-detail-meta-dates">
                    <div className="test-detail-meta-date">
                      <span>{t('Created')}</span>
                      <strong title={formatDetailDate(test.createdAt)}>
                        {formatCompactDetailDate(test.createdAt)}
                      </strong>
                    </div>
                    <div className="test-detail-meta-date">
                      <span>{t('Updated')}</span>
                      <strong
                        title={formatDetailDate(test.updatedAt ?? test.createdAt)}
                      >
                        {formatCompactDetailDate(
                          test.updatedAt ?? test.createdAt,
                        )}
                      </strong>
                    </div>
                  </div>
            {showSavedFlash ? (
              <span className="test-detail-saved-flash">{t('Saved')}</span>
            ) : null}
          </div>
        </Panel>

          <div className="grid items-start gap-4">
            <Panel className="test-detail-content-panel">
              <EditingSurfaceSection
                title={t('Content')}
                bodyClassName="test-detail-content-stack"
              >
                {isEditingContent ? (
                  <StepsEditor
                    preconditions={preconditionsValue}
                    onPreconditionsChange={setPreconditionsValue}
                    description={descriptionValue}
                    steps={stepsValue}
                    onDescriptionChange={setDescriptionValue}
                    onStepsChange={setStepsValue}
                    onUploadMedia={uploadInlineMedia}
                    isUploadingMedia={isUploadingMedia}
                  />
                ) : (
                  <>
                    <PreconditionsBlock
                      html={test.preconditions}
                      onMediaClick={handleRichContentClick}
                    />
                    <StepsView
                      steps={test.steps}
                      expected={test.expected}
                      onMediaClick={handleRichContentClick}
                    />
                  </>
                )}
              </EditingSurfaceSection>
            </Panel>

            <div className="test-detail-secondary grid gap-3">

            <Panel className="test-detail-secondary-panel">
              <details className="test-detail-collapsible">
                <summary>
                  <span>{t('Activity')}</span>
                  <span className="test-detail-count-pill">
                    {test.activities.length}
                  </span>
                  <ChevronDown
                    className="test-detail-collapsible__chevron"
                    size={16}
                    strokeWidth={2}
                    aria-hidden="true"
                  />
                </summary>
                <div className="test-detail-collapsible__body">
                {test.activities.length === 0 ? (
                  <p className="m-0 text-sm text-[var(--tms-text-muted)]">{t('No activity recorded yet.')}</p>
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
                      <div className="test-detail-activity-muted">{t('{hiddenActivityCount} older activities hidden.', { hiddenActivityCount })}</div>
                    ) : null}
                  </div>
                )}
                  {test.activities.length > TEST_DETAIL_VISIBLE_ACTIVITY_LIMIT ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setIsActivityExpanded((value) => !value)}
                    >
                      {isActivityExpanded
                        ? t('Show recent')
                        : t('Show all {length}', { length: test.activities.length })}
                    </Button>
                  ) : null}
                </div>
              </details>
            </Panel>

            {test.automationHistory && test.automationHistory.totalResults > 0 ? (
              <Panel className="test-detail-secondary-panel test-detail-secondary-panel--padded">
                <AutomationHistoryBlock
                  history={test.automationHistory}
                  projectSlug={test.projectSlug}
                  flush
                />
              </Panel>
            ) : (
              <Panel className="test-detail-empty-line">
                <strong>{t('Automation')}</strong>
                <span>{t('No automation results linked yet.')}</span>
              </Panel>
            )}

            {parseRefs(test.refs).length > 0 ? (
              <Panel className="test-detail-secondary-panel test-detail-secondary-panel--padded">
                <CaseRefsList refs={test.refs} />
              </Panel>
            ) : null}

            {test.status === 'Archived' ? (
              <Panel className="test-detail-secondary-panel test-detail-secondary-panel--padded">
                  {showDeleteConfirm ? (
                    <ConfirmActionAlert
                      className="p-3"
                      title={t('Delete this archived test case permanently?')}
                      description={t('This action cannot be undone and will remove the test case from the repository.')}
                      confirmLabel={t('Delete permanently')}
                      pendingLabel={t('Deleting...')}
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
                    >{t('Delete permanently')}</Button>
                  )}
              </Panel>
            ) : null}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
