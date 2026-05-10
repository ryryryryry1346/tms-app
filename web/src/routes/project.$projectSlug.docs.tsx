import {
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import {
  createProjectDoc,
  getProjectDocs,
  type ProjectDoc,
} from '../features/docs/server'
import { getDashboardState } from '../features/tests/server'

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

function ProjectDocsPage() {
  const { project, docs } = Route.useLoaderData()
  const location = useLocation()
  const [articleDocs, setArticleDocs] = useState(docs)
  const [query, setQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const projectSlug = project.slug ?? project.id.toString()

  if (location.pathname.includes('/docs/')) {
    return <Outlet />
  }

  const filteredDocs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return articleDocs
    }

    return articleDocs.filter((doc) =>
      `${doc.title} ${doc.category ?? ''}`.toLowerCase().includes(normalizedQuery),
    )
  }, [articleDocs, query])

  function getDocUrl(docId: number): string {
    return `/project/${projectSlug}/docs/${docId}`
  }

  function openDoc(docId: number): void {
    window.location.assign(getDocUrl(docId))
  }

  async function handleCreateArticle(): Promise<void> {
    setErrorMessage(null)
    setIsCreating(true)

    try {
      const result = await createProjectDoc({
        data: {
          projectId: project.id,
          title: 'Untitled article',
          category: 'General',
          content: '',
        },
      })

      if (!Number.isInteger(result.id) || result.id <= 0) {
        throw new Error('Created article id is missing.')
      }

      const timestamp = new Date().toISOString()
      const createdDoc: ProjectDoc = {
        id: result.id,
        projectId: project.id,
        title: 'Untitled article',
        category: 'General',
        content: '',
        status: 'Published',
        createdAt: timestamp,
        updatedAt: timestamp,
      }

      setArticleDocs((current) => {
        if (current.some((doc) => doc.id === createdDoc.id)) {
          return current
        }

        return [createdDoc, ...current]
      })

      openDoc(result.id)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create article.',
      )
    } finally {
      setIsCreating(false)
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
              <Button
                onClick={() => {
                  void handleCreateArticle()
                }}
                disabled={isCreating}
                variant="primary"
              >
                {isCreating ? 'Creating...' : '+ Article'}
              </Button>
            }
          />

          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <Panel className="p-4">
            <div className="docs-index-header">
              <WorkspaceSectionHeader
                dense
                title="Docs"
                description="Reusable project knowledge. Open an article to read or edit it on its own page."
                meta={<Badge>{articleDocs.length} articles</Badge>}
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search articles"
                size="sm"
                className="docs-index-search"
              />
            </div>

            {filteredDocs.length === 0 ? (
              <EmptyState
                title="No articles"
                description="Create the first project article."
              />
            ) : (
              <TableShell surface="panel" className="docs-table mt-4">
                <TableHead
                  columns="minmax(260px, 1.6fr) minmax(120px, 0.45fr) minmax(120px, 0.45fr) minmax(90px, 0.28fr)"
                  padding="sm"
                >
                  <span>Article</span>
                  <span>Category</span>
                  <span>Updated</span>
                  <span className="text-right">Open</span>
                </TableHead>
                {filteredDocs.map((doc) => (
                  <TableRow
                    key={doc.id}
                    columns="minmax(260px, 1.6fr) minmax(120px, 0.45fr) minmax(120px, 0.45fr) minmax(90px, 0.28fr)"
                    padding="sm"
                    className="docs-clickable-row items-center"
                    role="link"
                    tabIndex={0}
                    onClick={() => openDoc(doc.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openDoc(doc.id)
                      }
                    }}
                  >
                    <div className="min-w-0">
                      <span className="docs-title-text">
                        {doc.title}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {doc.category ?? 'General'}
                    </span>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {formatDate(doc.updatedAt)}
                    </span>
                    <div className="text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation()
                          openDoc(doc.id)
                        }}
                      >
                        Open
                      </Button>
                    </div>
                  </TableRow>
                ))}
              </TableShell>
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
