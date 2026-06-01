import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { MoreHorizontal } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuLabel,
} from '../components/ui/PopoverMenu'
import {
  LazyRichTextEditor,
  preloadRichTextEditor,
} from '../components/RichTextEditor.lazy'
import {
  deleteProjectDoc,
  getProjectDocDetail,
  updateProjectDoc,
} from '../features/docs/server'
import { uploadTestMedia } from '../features/media/server'
import { sanitizeHtml } from '../lib/sanitize-html'

const SelectMenu = lazy(() =>
  import('../components/ui/SelectMenu').then((module) => ({
    default: module.SelectMenu,
  })),
)

const DOC_CATEGORIES = [
  'General',
  'Runbook',
  'API',
  'Support',
  'Test data',
  'AWS',
  'Release',
]

export const Route = createFileRoute('/project_/$projectSlug/docs_/$docId')({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()
    const docId = Number(params.docId)

    if (!projectSlug || !Number.isInteger(docId) || docId <= 0) {
      throw notFound()
    }

    const docsState = await getProjectDocDetail({
      data: {
        projectSlug,
        docId,
      },
    })

    if (docsState.project.slug && docsState.project.slug !== projectSlug) {
      throw redirect({
        to: '/project/$projectSlug/docs/$docId',
        params: {
          projectSlug: docsState.project.slug,
          docId: params.docId,
        },
        replace: true,
      })
    }

    return {
      project: docsState.project,
      doc: docsState.doc,
    }
  },
  component: ProjectDocDetailPage,
})

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  const [year, month, day] = value.slice(0, 10).split('-')

  if (!year || !month || !day) {
    return value.slice(0, 10)
  }

  return `${day}.${month}.${year}`
}

function prepareDocContentHtml(content: string): string {
  return content
    .replace(/<img(?![^>]*\bloading=)([^>]*)>/gi, '<img loading="lazy"$1>')
    .replace(/<img(?![^>]*\bdecoding=)([^>]*)>/gi, '<img decoding="async"$1>')
    .replace(/<video(?![^>]*\bpreload=)([^>]*)>/gi, '<video preload="metadata"$1>')
    .replace(/<iframe(?![^>]*\bloading=)([^>]*)>/gi, '<iframe loading="lazy"$1>')
}

function ProjectDocDetailPage() {
  const { project, doc } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const projectSlug = project.slug ?? project.id.toString()
  const isNewArticle =
    (doc.title === 'Untitled article' || doc.title === 'Untitled doc') &&
    !doc.content
  const [title, setTitle] = useState(doc.title)
  const [category, setCategory] = useState(doc.category ?? 'General')
  const [content, setContent] = useState(doc.content ?? '')
  const [isEditing, setIsEditing] = useState(isNewArticle)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const readableContentHtml = useMemo(
    () => prepareDocContentHtml(content),
    [content],
  )

  async function uploadMedia(file: File): Promise<string> {
    setErrorMessage(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadTestMedia({
        data: formData,
      })

      return result.url
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to upload media.',
      )
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSave(): Promise<void> {
    setErrorMessage(null)
    setIsSaving(true)

    try {
      await updateProjectDoc({
        data: {
          docId: doc.id,
          title,
          category,
          content,
        },
      })

      await router.invalidate()
      setIsEditing(false)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save documentation.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(): Promise<void> {
    setErrorMessage(null)
    setIsSaving(true)

    try {
      await deleteProjectDoc({
        data: {
          docId: doc.id,
        },
      })

      await navigate({
        to: '/project/$projectSlug/docs',
        params: {
          projectSlug,
        },
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to delete documentation.',
      )
      setIsSaving(false)
    }
  }

  return (
    <main className="workspace-view docs-detail-page">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <div className="docs-detail-top-nav">
            <div className="docs-detail-breadcrumb">
              <Link
                to="/project/$projectSlug/docs"
                params={{ projectSlug }}
                className="no-underline text-[var(--tms-primary)]"
              >
                Docs
              </Link>
              <span>/</span>
              <span>{category || 'General'}</span>
            </div>

            <LinkButton
              to="/project/$projectSlug/docs"
              params={{ projectSlug }}
              variant="secondary"
              size="sm"
              className="docs-detail-back-link"
            >
              Back to docs
            </LinkButton>
          </div>

          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <Panel className="docs-detail-header-panel">
            <div className="docs-detail-header-body">
              <div className="docs-detail-header-layout">
                <div className="docs-detail-heading">
                  <div className="docs-detail-meta-line">
                    <span>Project docs</span>
                    <span>{project.name}</span>
                    <span>Updated {formatDate(doc.updatedAt)}</span>
                  </div>
                  <h1 className="docs-detail-title">{title}</h1>
                  <div className="docs-detail-badges">
                    <Badge>{category || 'General'}</Badge>
                  </div>
                </div>

                <div className="docs-detail-actions">
                  {isConfirmingDelete ? (
                  <>
                    <Button
                      onClick={() => {
                        setIsConfirmingDelete(false)
                      }}
                      disabled={isSaving}
                      variant="secondary"
                      size="sm"
                    >
                      Cancel delete
                    </Button>
                    <Button
                      onClick={() => {
                        void handleDelete()
                      }}
                      disabled={isSaving}
                      variant="danger"
                      size="sm"
                    >
                      {isSaving ? 'Deleting...' : 'Confirm delete'}
                    </Button>
                  </>
                ) : isEditing ? (
                  <>
                    {!isNewArticle ? (
                      <Button
                        onClick={() => {
                          setTitle(doc.title)
                          setCategory(doc.category ?? 'General')
                          setContent(doc.content ?? '')
                          setIsEditing(false)
                        }}
                        disabled={isSaving}
                        variant="secondary"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => {
                        void handleSave()
                      }}
                      disabled={isSaving || title.trim().length === 0}
                      variant="primary"
                      size="sm"
                    >
                      {isSaving ? 'Saving...' : 'Save doc'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => {
                        void preloadRichTextEditor()
                        setIsEditing(true)
                      }}
                      variant="primary"
                      size="sm"
                    >
                      Edit doc
                    </Button>
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
                          aria-label="More doc actions"
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
                      <PopoverMenuLabel>Actions</PopoverMenuLabel>
                      <PopoverMenuItem
                        tone="danger"
                        onClick={() => {
                          setIsMoreActionsOpen(false)
                          setIsConfirmingDelete(true)
                        }}
                      >
                        Delete doc
                      </PopoverMenuItem>
                    </PopoverMenu>
                  </>
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="docs-detail-content-panel">
            {isEditing ? (
              <>
                <div className="docs-fields">
                  <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">
                    Title
                    <Input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Endpoints for monolith"
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">
                    Category
                    <Suspense fallback={<Input value={category} readOnly />}>
                      <SelectMenu
                        value={category}
                        options={DOC_CATEGORIES.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                        onValueChange={setCategory}
                      />
                    </Suspense>
                  </label>
                </div>

                <Suspense
                  fallback={
                    <div className="docs-content-view__empty">
                      Loading editor...
                    </div>
                  }
                >
                  <LazyRichTextEditor
                    label="Content"
                    placeholder="Add steps, commands, links, endpoint notes, screenshots, or support instructions..."
                    value={content}
                    onChange={setContent}
                    onUploadMedia={uploadMedia}
                    isUploading={isUploading}
                  />
                </Suspense>
              </>
            ) : (
              <article className="docs-content-view">
                {content.trim().length > 0 ? (
                  <div
                    className="docs-content-view__body"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(readableContentHtml),
                    }}
                  />
                ) : (
                  <div className="docs-content-view__empty">
                    This doc does not have content yet.
                  </div>
                )}
              </article>
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
