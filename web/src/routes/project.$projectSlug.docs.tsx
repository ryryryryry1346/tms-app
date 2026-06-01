import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { preloadRichTextEditor } from '../components/RichTextEditor.lazy'
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

const ALL_DOCS_FILTER = 'All'
const DOCS_TABLE_COLUMNS =
  'minmax(280px, 1.7fr) minmax(120px, 0.35fr) minmax(120px, 0.35fr)'

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

function getDocCategory(doc: ProjectDoc): string {
  return doc.category?.trim() || 'General'
}

function getDocPreview(content: string | null): string {
  if (!content?.trim()) {
    return 'No content yet.'
  }

  return content
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180)
}

function ProjectDocsPage() {
  const { project, docs } = Route.useLoaderData()
  const navigate = useNavigate()
  const [articleDocs, setArticleDocs] = useState(docs)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(ALL_DOCS_FILTER)
  const [isCreating, setIsCreating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const projectSlug = project.slug ?? project.id.toString()

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      void preloadRichTextEditor()
    }, 900)

    return () => window.clearTimeout(preloadTimer)
  }, [])

  const categoryFilters = useMemo(() => {
    const categories = new Set<string>()

    for (const doc of articleDocs) {
      categories.add(getDocCategory(doc))
    }

    return [
      ALL_DOCS_FILTER,
      ...Array.from(categories).sort((a, b) => a.localeCompare(b)),
    ]
  }, [articleDocs])

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>([[ALL_DOCS_FILTER, articleDocs.length]])

    for (const doc of articleDocs) {
      const category = getDocCategory(doc)
      counts.set(category, (counts.get(category) ?? 0) + 1)
    }

    return counts
  }, [articleDocs])

  useEffect(() => {
    if (!categoryFilters.includes(activeCategory)) {
      setActiveCategory(ALL_DOCS_FILTER)
    }
  }, [activeCategory, categoryFilters])

  const filteredDocs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const categoryDocs =
      activeCategory === ALL_DOCS_FILTER
        ? articleDocs
        : articleDocs.filter((doc) => getDocCategory(doc) === activeCategory)

    if (!normalizedQuery) {
      return categoryDocs
    }

    return categoryDocs.filter((doc) =>
      `${doc.title} ${getDocCategory(doc)} ${getDocPreview(doc.content)}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [activeCategory, articleDocs, query])

  function openDoc(docId: number): void {
    void preloadRichTextEditor()
    void navigate({
      to: '/project/$projectSlug/docs/$docId',
      params: {
        projectSlug,
        docId: docId.toString(),
      },
    })
  }

  async function handleCreateArticle(): Promise<void> {
    setErrorMessage(null)
    setIsCreating(true)
    void preloadRichTextEditor()

    try {
      const result = await createProjectDoc({
        data: {
          projectId: project.id,
          title: 'Untitled doc',
          category: 'General',
          content: '',
        },
      })

      if (!Number.isInteger(result.id) || result.id <= 0) {
        throw new Error('Created doc id is missing.')
      }

      const timestamp = new Date().toISOString()
      const createdDoc: ProjectDoc = {
        id: result.id,
        projectId: project.id,
        title: 'Untitled doc',
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
        error instanceof Error ? error.message : 'Failed to create doc.',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <Panel className="docs-cockpit-panel p-4">
            <div className="docs-cockpit-header">
              <WorkspaceSectionHeader
                dense
                title="Docs"
                description={`${project.name} knowledge base for runbooks, endpoint notes, support instructions, and test data.`}
                meta={<Badge>{articleDocs.length} docs</Badge>}
              />
              <Button
                onClick={() => {
                  void handleCreateArticle()
                }}
                disabled={isCreating}
                variant="primary"
                size="sm"
              >
                {isCreating ? 'Creating...' : '+ Doc'}
              </Button>
            </div>

            <div className="docs-cockpit-toolbar">
              <div
                className="docs-category-filters"
                role="group"
                aria-label="Filter docs by category"
              >
                {categoryFilters.map((category) => {
                  const isActive = category === activeCategory

                  return (
                    <button
                      key={category}
                      type="button"
                      aria-pressed={isActive}
                      className={`docs-category-filter${
                        isActive ? ' is-active' : ''
                      }`}
                      onClick={() => setActiveCategory(category)}
                    >
                      <span>{category}</span>
                      <strong>{categoryCounts.get(category) ?? 0}</strong>
                    </button>
                  )
                })}
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search docs"
                size="sm"
                className="docs-index-search"
              />
            </div>

            {filteredDocs.length === 0 ? (
              <EmptyState
                title="No docs"
                description={
                  articleDocs.length === 0
                    ? 'Create the first project doc.'
                    : 'Try another category or search query.'
                }
              />
            ) : (
              <TableShell surface="panel" className="docs-table mt-3">
                <TableHead
                  columns={DOCS_TABLE_COLUMNS}
                  minWidth="44rem"
                  padding="sm"
                >
                  <span>Doc</span>
                  <span>Category</span>
                  <span>Updated</span>
                </TableHead>
                {filteredDocs.map((doc) => (
                  <TableRow
                    key={doc.id}
                    columns={DOCS_TABLE_COLUMNS}
                    minWidth="44rem"
                    padding="sm"
                    className="docs-clickable-row"
                    role="link"
                    tabIndex={0}
                    aria-label={`Open ${doc.title}`}
                    onClick={() => openDoc(doc.id)}
                    onPointerEnter={() => {
                      void preloadRichTextEditor()
                    }}
                    onFocus={() => {
                      void preloadRichTextEditor()
                    }}
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
                      <span className="docs-preview-text">
                        {getDocPreview(doc.content)}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {getDocCategory(doc)}
                    </span>
                    <span className="text-sm text-[var(--tms-text-muted)]">
                      {formatDate(doc.updatedAt)}
                    </span>
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
