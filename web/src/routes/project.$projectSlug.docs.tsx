import { createFileRoute, notFound, redirect, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import { SelectMenu } from '../components/ui/SelectMenu'
import {
  archiveProjectDoc,
  createProjectDoc,
  getProjectDocs,
  updateProjectDoc,
} from '../features/docs/server'
import { uploadTestMedia } from '../features/media/server'
import { getDashboardState } from '../features/tests/server'

const DOC_CATEGORIES = [
  'General',
  'Runbook',
  'API',
  'Support',
  'AWS',
  'Release',
]

export const Route = createFileRoute('/project/$projectSlug/docs')({
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
          to: '/project/$projectSlug/docs',
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

    const docsState = await getProjectDocs({
      data: {
        projectId: selectedProjectId,
      },
    })

    return {
      project,
      docs: docsState.docs,
    }
  },
  component: ProjectDocsPage,
})

function ProjectDocsPage() {
  const { project, docs } = Route.useLoaderData()
  const router = useRouter()
  const [selectedDocId, setSelectedDocId] = useState<number | null>(
    docs[0]?.id ?? null,
  )
  const [isCreating, setIsCreating] = useState(docs.length === 0)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('General')
  const [content, setContent] = useState('')
  const [query, setQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const projectSlug = project.slug ?? project.id.toString()
  const selectedDoc = docs.find((doc) => doc.id === selectedDocId) ?? null

  const filteredDocs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return docs
    }

    return docs.filter((doc) =>
      `${doc.title} ${doc.category ?? ''}`.toLowerCase().includes(normalizedQuery),
    )
  }, [docs, query])

  useEffect(() => {
    if (selectedDoc) {
      setTitle(selectedDoc.title)
      setCategory(selectedDoc.category ?? 'General')
      setContent(selectedDoc.content ?? '')
      setIsCreating(false)
      return
    }

    if (docs[0] && !isCreating) {
      setSelectedDocId(docs[0].id)
    }
  }, [docs, isCreating, selectedDoc])

  function startNewDoc(): void {
    setSelectedDocId(null)
    setTitle('')
    setCategory('General')
    setContent('')
    setErrorMessage(null)
    setIsCreating(true)
  }

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
      if (isCreating) {
        const result = await createProjectDoc({
          data: {
            projectId: project.id,
            title,
            category,
            content,
          },
        })

        setSelectedDocId(result.id)
        setIsCreating(false)
      } else if (selectedDoc) {
        await updateProjectDoc({
          data: {
            docId: selectedDoc.id,
            title,
            category,
            content,
          },
        })
      }

      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save documentation.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleArchive(): Promise<void> {
    if (!selectedDoc) {
      return
    }

    setErrorMessage(null)
    setIsSaving(true)

    try {
      await archiveProjectDoc({
        data: {
          docId: selectedDoc.id,
        },
      })
      setSelectedDocId(null)
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to archive documentation.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            description="Project knowledge base for runbooks, support instructions, endpoint notes, and internal operating guides."
            actions={
              <Button onClick={startNewDoc} variant="primary">
                + Article
              </Button>
            }
          />

          {errorMessage ? (
            <Alert variant="danger">
              {errorMessage}
            </Alert>
          ) : null}

          <section className="docs-layout">
            <Panel className="docs-sidebar p-3">
              <WorkspaceSectionHeader
                dense
                title="Docs"
                description="Reusable project knowledge."
                meta={<Badge>{docs.length} articles</Badge>}
                className="mb-3"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search articles"
                size="sm"
                className="mb-3 w-full"
              />

              {filteredDocs.length === 0 ? (
                <EmptyState
                  title="No articles"
                  description="Create the first project article."
                />
              ) : (
                <div className="docs-list">
                  {filteredDocs.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className={`docs-list-item ${
                        selectedDocId === doc.id ? 'is-active' : ''
                      }`}
                      onClick={() => setSelectedDocId(doc.id)}
                    >
                      <span className="docs-list-item__title">{doc.title}</span>
                      <span className="docs-list-item__meta">
                        {doc.category ?? 'General'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Panel>

            <Panel className="docs-editor-panel p-4">
              <div className="docs-editor-header">
                <WorkspaceSectionHeader
                  dense
                  title={isCreating ? 'New article' : 'Article'}
                  description="Write concise internal instructions with rich content and attachments."
                  meta={
                    selectedDoc?.updatedAt ? (
                      <Badge>Updated {new Date(selectedDoc.updatedAt).toLocaleDateString()}</Badge>
                    ) : null
                  }
                />
                <div className="flex flex-wrap items-center gap-2">
                  {!isCreating && selectedDoc ? (
                    <Button
                      onClick={() => {
                        void handleArchive()
                      }}
                      disabled={isSaving}
                      variant="warning"
                      size="sm"
                    >
                      Archive
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
                    {isSaving ? 'Saving...' : 'Save article'}
                  </Button>
                </div>
              </div>

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
                  <SelectMenu
                    value={category}
                    options={DOC_CATEGORIES.map((item) => ({
                      value: item,
                      label: item,
                    }))}
                    onValueChange={setCategory}
                  />
                </label>
              </div>

              <RichTextEditor
                label="Content"
                placeholder="Add steps, commands, links, endpoint notes, screenshots, or support instructions..."
                value={content}
                onChange={setContent}
                onUploadMedia={uploadMedia}
                isUploading={isUploading}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--tms-text-muted)]">
                <span>
                  Tip: keep article titles action-oriented, for example “Restart worker in AWS”.
                </span>
                <LinkButton
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug }}
                  variant="secondary"
                  size="sm"
                >
                  Back to repository
                </LinkButton>
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </main>
  )
}
