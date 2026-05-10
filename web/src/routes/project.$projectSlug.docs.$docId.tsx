import { createFileRoute, notFound, redirect, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import { SelectMenu } from '../components/ui/SelectMenu'
import {
  archiveProjectDoc,
  getProjectDoc,
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

export const Route = createFileRoute('/project/$projectSlug/docs/$docId')({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()
    const docId = Number(params.docId)

    if (!projectSlug || !Number.isInteger(docId) || docId <= 0) {
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
          to: '/project/$projectSlug/docs/$docId',
          params: {
            projectSlug: legacyProject.slug,
            docId: params.docId,
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

    const docsState = await getProjectDoc({
      data: {
        docId,
      },
    })

    if (docsState.doc.projectId !== selectedProjectId) {
      throw notFound()
    }

    return {
      project,
      doc: docsState.doc,
    }
  },
  component: ProjectDocDetailPage,
})

function formatDate(value: string | null): string {
  if (!value) {
    return 'Never'
  }

  return new Date(value).toLocaleDateString()
}

function ProjectDocDetailPage() {
  const { project, doc } = Route.useLoaderData()
  const router = useRouter()
  const projectSlug = project.slug ?? project.id.toString()
  const [title, setTitle] = useState(doc.title)
  const [category, setCategory] = useState(doc.category ?? 'General')
  const [content, setContent] = useState(doc.content ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

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
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to save documentation.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleArchive(): Promise<void> {
    setErrorMessage(null)
    setIsSaving(true)

    try {
      await archiveProjectDoc({
        data: {
          docId: doc.id,
        },
      })

      await router.navigate({
        to: '/project/$projectSlug/docs',
        params: {
          projectSlug,
        },
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to archive documentation.',
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
            description={`${project.name} knowledge article.`}
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
                title="Article"
                description="Edit the article content, metadata, and attachments."
                meta={<Badge>Updated {formatDate(doc.updatedAt)}</Badge>}
              />
              <div className="flex flex-wrap items-center gap-2">
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
          </Panel>
        </div>
      </div>
    </main>
  )
}
