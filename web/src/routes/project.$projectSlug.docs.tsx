import { createFileRoute, notFound, redirect, useRouter } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import { TableHead, TableRow, TableShell } from '../components/ui/TableShell'
import { createProjectDoc, getProjectDocs } from '../features/docs/server'
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

  return new Date(value).toLocaleDateString()
}

function ProjectDocsPage() {
  const { project, docs } = Route.useLoaderData()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const projectSlug = project.slug ?? project.id.toString()

  const filteredDocs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return docs
    }

    return docs.filter((doc) =>
      `${doc.title} ${doc.category ?? ''}`.toLowerCase().includes(normalizedQuery),
    )
  }, [docs, query])

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

      await router.navigate({
        to: '/project/$projectSlug/docs/$docId',
        params: {
          projectSlug,
          docId: result.id.toString(),
        },
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to create article.',
      )
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
                meta={<Badge>{docs.length} articles</Badge>}
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
                    className="items-center"
                  >
                    <div className="min-w-0">
                      <LinkButton
                        to="/project/$projectSlug/docs/$docId"
                        params={{ projectSlug, docId: doc.id.toString() }}
                        variant="ghost"
                        size="sm"
                        className="docs-title-link"
                      >
                        {doc.title}
                      </LinkButton>
                    </div>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {doc.category ?? 'General'}
                    </span>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {formatDate(doc.updatedAt)}
                    </span>
                    <div className="text-right">
                      <LinkButton
                        to="/project/$projectSlug/docs/$docId"
                        params={{ projectSlug, docId: doc.id.toString() }}
                        variant="secondary"
                        size="sm"
                      >
                        Open
                      </LinkButton>
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
