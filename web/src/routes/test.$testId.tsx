import {
  Link,
  createFileRoute,
  notFound,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { Select } from '../components/ui/Select'
import { uploadTestMedia } from '../features/media/server'
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

    return getTestDetail({
      data: {
        id: testId,
      },
    })
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
  const [titleValue, setTitleValue] = useState(test.title)
  const [pendingMetadataField, setPendingMetadataField] =
    useState<PendingMetadataField | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const repositoryLink = test.projectSlug
    ? {
        to: '/project/$projectSlug/repository' as const,
        params: { projectSlug: test.projectSlug },
      }
    : null

  async function handleArchive(): Promise<void> {
    setActionError(null)
    setIsArchiving(true)

    try {
      await archiveTestCase({
        data: {
          id: test.id,
        },
      })

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
      const result = await uploadTestMedia({
        data: {
          file,
        },
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
    setTitleValue(test.title)
    setIsEditingTitle(true)
  }

  function cancelTitleEdit(): void {
    setTitleValue(test.title)
    setIsEditingTitle(false)
  }

  async function saveTitleEdit(): Promise<void> {
    const nextTitle = titleValue.trim()

    if (!nextTitle) {
      setActionError('Test case title cannot be empty.')
      return
    }

    if (nextTitle === test.title) {
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

      setIsEditingTitle(false)
      await router.invalidate()
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
    <main className="page-wrap px-4 py-10">
      <div className="mx-auto max-w-[1240px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--tms-text-muted)]">
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
            <span>/</span>
            <span>Case #{test.id}</span>
          </div>

          {repositoryLink ? (
            <Link
              to={repositoryLink.to}
              params={repositoryLink.params}
              className="tms-button no-underline hover:text-[var(--tms-primary)]"
            >
              Back to repository
            </Link>
          ) : (
            <Link
              to="/"
              className="tms-button no-underline hover:text-[var(--tms-primary)]"
            >
              Back to workspace
            </Link>
          )}
        </div>

        <Panel className="overflow-hidden">
          <div className="border-b border-[var(--tms-border-subtle)] px-6 py-6">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--tms-text-soft)]">
                  Test case
                </p>
                {isEditingTitle ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
                      className="min-w-[280px] flex-1 rounded-xl border-[var(--tms-primary-border)] px-3 py-2 text-3xl font-bold leading-tight text-[var(--tms-text)]"
                      aria-label="Edit test case title"
                    />
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
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-start gap-3">
                    <h1 className="m-0 text-4xl font-bold leading-tight text-[var(--tms-text)]">
                      {test.title}
                    </h1>
                    <Button
                      type="button"
                      onClick={startTitleEdit}
                      className="mt-1 hover:text-[var(--tms-primary)]"
                    >
                      Edit title
                    </Button>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
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

              <div className="flex flex-wrap justify-end gap-2">
                <Link
                  to="/edit-test/$testId"
                  params={{ testId: test.id.toString() }}
                  className="tms-button tms-button-primary no-underline"
                >
                  Full editor
                </Link>
                {isEditingContent ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => {
                        void saveContentEdit()
                      }}
                      disabled={isSavingContent || isUploadingMedia}
                      variant="primary"
                    >
                      {isSavingContent ? 'Saving...' : 'Save content'}
                    </Button>
                    <Button
                      type="button"
                      onClick={cancelContentEdit}
                      disabled={isSavingContent}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={startContentEdit}
                    variant="primary"
                  >
                    Edit content
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => {
                    void handleDuplicate()
                  }}
                  disabled={isDuplicating || isDeleting}
                >
                  {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                </Button>
                {test.status === 'Archived' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      void handleRestore()
                    }}
                    disabled={isArchiving || isDeleting}
                    variant="success"
                  >
                    {isArchiving ? 'Restoring...' : 'Restore'}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => {
                      void handleArchive()
                    }}
                    disabled={isArchiving || isDeleting}
                    variant="warning"
                  >
                    {isArchiving ? 'Archiving...' : 'Archive'}
                  </Button>
                )}
              </div>
            </div>

            {actionError ? (
              <Alert variant="danger" className="mt-4">
                {actionError}
              </Alert>
            ) : null}
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-6 px-6 py-6">
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
                  <section>
                    <h2 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[var(--tms-text-soft)]">
                      Steps
                    </h2>
                    <div
                      className="rich-output prose prose-sm mt-3 max-w-none rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-4 text-[var(--tms-text)]"
                      onClick={handleRichContentClick}
                      dangerouslySetInnerHTML={{
                        __html: test.steps || '<p>-</p>',
                      }}
                    />
                  </section>

                  <section>
                    <h2 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[var(--tms-text-soft)]">
                      Expected result
                    </h2>
                    <div
                      className="rich-output prose prose-sm mt-3 max-w-none rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-4 text-[var(--tms-text)]"
                      onClick={handleRichContentClick}
                      dangerouslySetInnerHTML={{
                        __html: test.expected || '<p>-</p>',
                      }}
                    />
                  </section>
                </>
              )}
            </div>

            <aside className="border-t border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-6 py-6 lg:border-l lg:border-t-0">
              <section>
                <h2 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[var(--tms-text-soft)]">
                  Metadata
                </h2>
                <dl className="mt-4 grid gap-3 text-sm">
                  <div>
                    <dt className="font-semibold text-[var(--tms-text-soft)]">Project</dt>
                    <dd className="m-0 mt-1 font-semibold text-[var(--tms-text)]">
                      {test.projectName ?? '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--tms-text-soft)]">Suite</dt>
                    <dd className="m-0 mt-1">
                      <Select
                        value={test.sectionId ?? ''}
                        onChange={(event) => {
                          const sectionId = Number(event.target.value)

                          if (Number.isInteger(sectionId) && sectionId > 0) {
                            void handleSuiteChange(sectionId)
                          }
                        }}
                        disabled={
                          pendingMetadataField !== null ||
                          test.sections.length === 0
                        }
                        className="w-full text-sm font-semibold text-[var(--tms-text)]"
                        aria-label="Change suite"
                      >
                        {test.sectionId === null ? (
                          <option value="">No suite</option>
                        ) : null}
                        {test.sections.map((section) => (
                          <option key={section.id} value={section.id}>
                            {section.name}
                          </option>
                        ))}
                      </Select>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--tms-text-soft)]">Status</dt>
                    <dd className="m-0 mt-1">
                      <Select
                        value={test.status ?? 'Draft'}
                        onChange={(event) => {
                          void handleStatusChange(
                            event.target.value as CaseStatusValue,
                          )
                        }}
                        disabled={pendingMetadataField !== null}
                        className="w-full text-sm font-semibold text-[var(--tms-text)]"
                        aria-label="Change status"
                      >
                        {CASE_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Select>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--tms-text-soft)]">Priority</dt>
                    <dd className="m-0 mt-1">
                      <Select
                        value={test.priority ?? 'Medium'}
                        onChange={(event) => {
                          void handlePriorityChange(
                            event.target.value as PriorityValue,
                          )
                        }}
                        disabled={pendingMetadataField !== null}
                        className="w-full text-sm font-semibold text-[var(--tms-text)]"
                        aria-label="Change priority"
                      >
                        {PRIORITY_OPTIONS.map((priority) => (
                          <option key={priority} value={priority}>
                            {priority}
                          </option>
                        ))}
                      </Select>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--tms-text-soft)]">Type</dt>
                    <dd className="m-0 mt-1">
                      <Select
                        value={test.caseType ?? 'Functional'}
                        onChange={(event) => {
                          void handleCaseTypeChange(
                            event.target.value as CaseTypeValue,
                          )
                        }}
                        disabled={pendingMetadataField !== null}
                        className="w-full text-sm font-semibold text-[var(--tms-text)]"
                        aria-label="Change type"
                      >
                        {CASE_TYPE_OPTIONS.map((caseType) => (
                          <option key={caseType} value={caseType}>
                            {caseType}
                          </option>
                        ))}
                      </Select>
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--tms-text-soft)]">Created</dt>
                    <dd className="m-0 mt-1 font-semibold text-[var(--tms-text)]">
                      {formatDetailDate(test.createdAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-[var(--tms-text-soft)]">Updated</dt>
                    <dd className="m-0 mt-1 font-semibold text-[var(--tms-text)]">
                      {formatDetailDate(test.updatedAt ?? test.createdAt)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="mt-6 border-t border-[var(--tms-border-subtle)] pt-5">
                <h2 className="m-0 text-sm font-bold uppercase tracking-[0.08em] text-[var(--tms-text-soft)]">
                  Activity
                </h2>
                {test.activities.length === 0 ? (
                  <p className="m-0 mt-3 text-sm text-[var(--tms-text-muted)]">
                    No activity recorded yet.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {test.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface)] px-3 py-2"
                      >
                        <div className="text-sm font-semibold text-[var(--tms-text)]">
                          {activity.summary}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[var(--tms-text-muted)]">
                          {activity.actorName ?? 'system'} -{' '}
                          {activity.action.replaceAll('_', ' ')}
                        </div>
                        <div className="mt-1 text-xs text-[var(--tms-text-soft)]">
                          {formatDetailDate(activity.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {test.status === 'Archived' ? (
                <section className="mt-6 border-t border-[var(--tms-border-subtle)] pt-5">
                  {showDeleteConfirm ? (
                    <Alert variant="danger" className="p-3">
                      <p className="m-0 font-semibold">
                        Delete this archived test case permanently?
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          onClick={() => {
                            void handleDeletePermanently()
                          }}
                          disabled={isDeleting}
                          variant="danger"
                        >
                          {isDeleting ? 'Deleting...' : 'Confirm delete'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isDeleting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Alert>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={isDeleting || isArchiving}
                      variant="danger"
                      className="w-full"
                    >
                      Delete permanently
                    </Button>
                  )}
                </section>
              ) : null}
            </aside>
          </div>
        </Panel>
      </div>
    </main>
  )
}
