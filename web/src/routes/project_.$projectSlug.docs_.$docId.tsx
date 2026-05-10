import { createFileRoute, notFound, redirect, useNavigate, useRouter } from '@tanstack/react-router'
import { lazy, Suspense, useMemo, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import {
  deleteProjectDoc,
  getProjectDocDetail,
  updateProjectDoc,
} from '../features/docs/server'
import { uploadTestMedia } from '../features/media/server'

const RichTextEditor = lazy(() =>
  import('../components/RichTextEditor').then((module) => ({
    default: module.RichTextEditor,
  })),
)

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
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            eyebrow="Project docs"
            projectName={title}
            description={`${project.name} knowledge doc.`}
            actions={
              <LinkButton
                to="/project/$projectSlug/docs"
                params={{ projectSlug }}
                variant="secondary"
              >
                Back to docs
              </LinkButton>
            }
          />

          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <Panel className="p-4">
            <div className="docs-editor-header">
              <WorkspaceSectionHeader
                dense
                title={isEditing ? 'Edit doc' : 'Doc'}
                description={
                  isEditing
                    ? 'Edit the doc content, metadata, and attachments.'
                    : 'Read project knowledge without loading the full editor.'
                }
                meta={<Badge>Updated {formatDate(doc.updatedAt)}</Badge>}
              />
              <div className="flex flex-wrap items-center gap-2">
                {isConfirmingDelete ? (
                  <>
                    <Button
                      onClick={() => setIsConfirmingDelete(false)}
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
                ) : (
                  <Button
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={isSaving}
                    variant="secondary"
                    size="sm"
                  >
                    Delete
                  </Button>
                )}
                {isEditing ? (
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
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="primary"
                    size="sm"
                  >
                    Edit doc
                  </Button>
                )}
              </div>
            </div>

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
                  <RichTextEditor
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
                <div className="docs-content-view__meta">
                  <Badge>{category}</Badge>
                </div>
                {content.trim().length > 0 ? (
                  <div
                    className="docs-content-view__body"
                    dangerouslySetInnerHTML={{ __html: readableContentHtml }}
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
