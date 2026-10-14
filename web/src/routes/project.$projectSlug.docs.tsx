import {
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
} from '@tanstack/react-router'
import {
  LayoutGrid,
  MessageSquare,
  MoreHorizontal,
  Pin,
  Search,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { CategoryChip, getCategoryIcon } from '../components/docs/CategoryChip'
import {
  CategoryDialog,
  type CategoryFormValues,
} from '../components/docs/CategoryDialog'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { preloadRichTextEditor } from '../components/RichTextEditor.lazy'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import {
  PopoverMenu,
  PopoverMenuItem,
} from '../components/ui/PopoverMenu'
import {
  createDocCategory,
  createProjectDoc,
  deleteDocCategory,
  getDocCategories,
  getProjectDocs,
  setProjectDocPinned,
  updateDocCategory,
  type DocCategory,
  type ProjectDoc,
} from '../features/docs/server'
import { getDashboardState } from '../features/tests/server'
import {
  DOC_CATEGORY_COLORS,
  GENERAL_DOC_CATEGORY,
} from '../lib/docCategories'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

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
      categories: docsState.categories,
      canEdit: docsState.canEdit,
      commentCounts: docsState.commentCounts,
    }
  },
  component: ProjectDocsPage,
})

const ALL_CATEGORIES = 'all'

type CategoryFilter = typeof ALL_CATEGORIES | number

type CategoryDialogState =
  | { mode: 'create' }
  | { mode: 'edit'; category: DocCategory }

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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function truncateAtWordBoundary(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  const truncated = value.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  return `${lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated}…`
}

function getDocPreview(content: string | null): string {
  if (!content?.trim()) {
    return 'No content yet.'
  }

  const withoutStyleScript = content
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')

  // Read block by block instead of stripping every tag in one pass and
  // gluing the whole document into one run-on line: a heading followed by
  // its paragraph should not read as a single sentence, and an unedited
  // template (all headings, one per section) should not turn into word
  // soup. Prefer the first real paragraph/list item; fall back to the
  // first heading only if there is no body text at all.
  const blocks = withoutStyleScript
    .split(/<\/(?:p|li|h[1-6]|blockquote)\s*>/gi)
    .map((block) => ({
      isHeading: /<h[1-6][^>]*>/i.test(block),
      text: decodeHtmlEntities(block.replace(/<[^>]+>/g, ' '))
        .replace(/\s+/g, ' ')
        .trim(),
    }))
    .filter((block) => block.text.length > 0)

  const firstParagraph = blocks.find((block) => !block.isHeading)
  const preview = firstParagraph?.text ?? blocks[0]?.text ?? ''

  if (!preview) {
    return 'No content yet.'
  }

  return truncateAtWordBoundary(preview, 180)
}

/** Docs store the category by name; unknown or empty names fall back to General. */
function resolveDocCategory(
  doc: ProjectDoc,
  categories: DocCategory[],
): DocCategory | null {
  const name = (doc.category?.trim() || GENERAL_DOC_CATEGORY).toLowerCase()

  return (
    categories.find((item) => item.name.toLowerCase() === name) ??
    categories.find((item) => item.name === GENERAL_DOC_CATEGORY) ??
    null
  )
}

type DocCardProps = {
  doc: ProjectDoc
  category: DocCategory | null
  preview: string
  commentCount: number
  canPin: boolean
  onOpen: () => void
  onTogglePin: () => void
}

function DocCard({
  doc,
  category,
  preview,
  commentCount,
  canPin,
  onOpen,
  onTogglePin,
}: DocCardProps) {
  const t = useT()

  const isPinned = doc.pinnedAt !== null

  return (
    <div
      className="doc-card"
      role="link"
      tabIndex={0}
      aria-label={t('Open {title}', { title: doc.title })}
      onClick={onOpen}
      onPointerEnter={() => {
        void preloadRichTextEditor()
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === 'Enter') {
          event.preventDefault()
          onOpen()
        }
      }}
    >
      <div className="doc-card__top">
        <CategoryChip
          name={category?.name ?? doc.category ?? GENERAL_DOC_CATEGORY}
          color={category?.color}
          icon={category?.icon}
        />
      </div>

      {canPin ? (
        <button
          type="button"
          className={`doc-card__pin${isPinned ? ' is-pinned' : ''}`}
          aria-label={isPinned ? t('Unpin doc') : t('Pin doc')}
          aria-pressed={isPinned}
          onClick={(event) => {
            event.stopPropagation()
            onTogglePin()
          }}
        >
          <Pin size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      ) : isPinned ? (
        <span className="doc-card__pin is-pinned" aria-label={t('Pinned')}>
          <Pin size={15} strokeWidth={2} aria-hidden="true" />
        </span>
      ) : null}

      <h3 className="doc-card__title">{doc.title}</h3>
      <p className="doc-card__preview">{preview}</p>

      <div className="doc-card__meta">
        <span className="doc-card__updated">{t('Updated {v1}', { v1: formatDate(doc.updatedAt) })}</span>
        {doc.updatedByName ? (
          <span className="doc-card__author" title={doc.updatedByName}>
            · {doc.updatedByName}
          </span>
        ) : null}
        {commentCount > 0 ? (
          <span
            className="doc-card__comments"
            aria-label={t('{commentCount} comments', { commentCount })}
          >
            <MessageSquare size={13} strokeWidth={2} aria-hidden="true" />
            {commentCount}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function ProjectDocsPage() {
  const t = useT()

  const {
    project,
    docs,
    categories: loadedCategories,
    canEdit,
    commentCounts,
  } = Route.useLoaderData()
  const navigate = useNavigate()
  const [articleDocs, setArticleDocs] = useState(docs)
  const [categories, setCategories] = useState(loadedCategories)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>(ALL_CATEGORIES)
  const [isCreatingDoc, setIsCreatingDoc] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [categoryDialog, setCategoryDialog] =
    useState<CategoryDialogState | null>(null)
  const [categoryDialogError, setCategoryDialogError] = useState<string | null>(
    null,
  )
  const [isSavingCategory, setIsSavingCategory] = useState(false)
  const [menuCategoryId, setMenuCategoryId] = useState<number | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<DocCategory | null>(
    null,
  )
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const projectSlug = project.slug ?? project.id.toString()

  useEffect(() => {
    const preloadTimer = window.setTimeout(() => {
      void preloadRichTextEditor()
    }, 900)

    return () => window.clearTimeout(preloadTimer)
  }, [])

  const docEntries = useMemo(
    () =>
      articleDocs.map((doc) => ({
        doc,
        category: resolveDocCategory(doc, categories),
        preview: getDocPreview(doc.content),
      })),
    [articleDocs, categories],
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map<number, number>()

    for (const entry of docEntries) {
      if (entry.category) {
        counts.set(entry.category.id, (counts.get(entry.category.id) ?? 0) + 1)
      }
    }

    return counts
  }, [docEntries])

  const activeCategoryItem =
    activeCategory === ALL_CATEGORIES
      ? null
      : (categories.find((item) => item.id === activeCategory) ?? null)
  const normalizedQuery = query.trim().toLowerCase()
  const isSearching = normalizedQuery.length > 0

  const visibleEntries = useMemo(() => {
    return docEntries.filter((entry) => {
      if (
        activeCategory !== ALL_CATEGORIES &&
        entry.category?.id !== activeCategory
      ) {
        return false
      }

      if (!normalizedQuery) {
        return true
      }

      return `${entry.doc.title} ${entry.category?.name ?? ''} ${entry.preview}`
        .toLowerCase()
        .includes(normalizedQuery)
    })
  }, [activeCategory, docEntries, normalizedQuery])

  const pinnedEntries = useMemo(
    () =>
      visibleEntries
        .filter((entry) => entry.doc.pinnedAt !== null)
        .sort((a, b) =>
          (b.doc.pinnedAt ?? '').localeCompare(a.doc.pinnedAt ?? ''),
        ),
    [visibleEntries],
  )
  const otherEntries = useMemo(
    () => visibleEntries.filter((entry) => entry.doc.pinnedAt === null),
    [visibleEntries],
  )
  // While searching there is a single "Results" list, pinned docs first.
  const showPinnedSection = !isSearching && pinnedEntries.length > 0
  const mainEntries = isSearching
    ? [...pinnedEntries, ...otherEntries]
    : otherEntries
  const mainTitle = isSearching
    ? `Results (${mainEntries.length})`
    : showPinnedSection
      ? 'Recently updated'
      : (activeCategoryItem?.name ?? 'All docs')

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

  async function handleCreateBlankDoc(): Promise<void> {
    setErrorMessage(null)
    setIsCreatingDoc(true)
    void preloadRichTextEditor()

    try {
      const result = await createProjectDoc({
        data: {
          projectId: project.id,
          title: t('Untitled doc'),
          category: activeCategoryItem?.name,
        },
      })

      if (!Number.isInteger(result.id) || result.id <= 0) {
        throw new Error('Created doc id is missing.')
      }

      openDoc(result.id)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Failed to create doc.'),
      )
    } finally {
      setIsCreatingDoc(false)
    }
  }

  async function handleTogglePin(doc: ProjectDoc): Promise<void> {
    setErrorMessage(null)
    const nextPinned = doc.pinnedAt === null

    try {
      await setProjectDocPinned({
        data: {
          docId: doc.id,
          pinned: nextPinned,
        },
      })

      setArticleDocs((current) =>
        current.map((item) =>
          item.id === doc.id
            ? { ...item, pinnedAt: nextPinned ? new Date().toISOString() : null }
            : item,
        ),
      )
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Failed to update pin.'),
      )
    }
  }

  async function refreshCategories(): Promise<void> {
    const state = await getDocCategories({ data: { projectId: project.id } })

    setCategories(state.categories)
  }

  function closeCategoryDialog(): void {
    setCategoryDialog(null)
    setCategoryDialogError(null)
  }

  async function handleSaveCategory(values: CategoryFormValues): Promise<void> {
    if (!categoryDialog) {
      return
    }

    setCategoryDialogError(null)
    setIsSavingCategory(true)

    try {
      if (categoryDialog.mode === 'create') {
        const created = await createDocCategory({
          data: { projectId: project.id, ...values },
        })

        await refreshCategories()
        setActiveCategory(created.id)
      } else {
        const previous = categoryDialog.category

        await updateDocCategory({
          data: { categoryId: previous.id, ...values },
        })

        if (previous.name !== values.name) {
          const previousName = previous.name.toLowerCase()

          setArticleDocs((current) =>
            current.map((doc) =>
              (doc.category ?? '').trim().toLowerCase() === previousName
                ? { ...doc, category: values.name }
                : doc,
            ),
          )
        }

        await refreshCategories()
      }

      closeCategoryDialog()
    } catch (error) {
      setCategoryDialogError(
        getErrorMessage(error, 'Failed to save category.'),
      )
    } finally {
      setIsSavingCategory(false)
    }
  }

  async function handleDeleteCategory(): Promise<void> {
    if (!categoryToDelete) {
      return
    }

    setErrorMessage(null)
    setIsDeletingCategory(true)

    try {
      await deleteDocCategory({ data: { categoryId: categoryToDelete.id } })

      const deletedName = categoryToDelete.name.toLowerCase()

      setArticleDocs((current) =>
        current.map((doc) =>
          (doc.category ?? '').trim().toLowerCase() === deletedName
            ? { ...doc, category: GENERAL_DOC_CATEGORY }
            : doc,
        ),
      )

      if (activeCategory === categoryToDelete.id) {
        setActiveCategory(ALL_CATEGORIES)
      }

      await refreshCategories()
      setCategoryToDelete(null)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Failed to delete category.'),
      )
      setCategoryToDelete(null)
    } finally {
      setIsDeletingCategory(false)
    }
  }

  function renderCards(entries: typeof docEntries) {
    return (
      <div className="docs-hub-grid">
        {entries.map(({ doc, category, preview }) => (
          <DocCard
            key={doc.id}
            doc={doc}
            category={category}
            preview={preview}
            commentCount={commentCounts[doc.id] ?? 0}
            canPin={canEdit}
            onOpen={() => openDoc(doc.id)}
            onTogglePin={() => {
              void handleTogglePin(doc)
            }}
          />
        ))}
      </div>
    )
  }

  const deleteCount = categoryToDelete
    ? (categoryCounts.get(categoryToDelete.id) ?? 0)
    : 0

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <Panel className="docs-cockpit-panel p-4">
            <div className="docs-cockpit-header">
              <WorkspaceSectionHeader
                dense
                title={t('Docs')}
                description={t('Project knowledge base: guides, endpoints, test data, release checklists.')}
                meta={<Badge>{t('{length} docs', { length: articleDocs.length })}</Badge>}
              />
              {canEdit ? (
                <Button
                  type="button"
                  disabled={isCreatingDoc}
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    void handleCreateBlankDoc()
                  }}
                >
                  {isCreatingDoc ? t('Creating...') : t('+ Doc')}
                </Button>
              ) : null}
            </div>

            <div className="docs-hub-search">
              <Search size={18} strokeWidth={2} aria-hidden="true" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('Search by title and content')}
                size="lg"
                aria-label={t('Search docs')}
              />
            </div>

            <div className="docs-hub-body">
              <nav className="docs-rail" aria-label={t('Doc categories')}>
                <div className="docs-rail__caption">{t('Categories')}</div>

                <div className="docs-rail__row">
                  <button
                    type="button"
                    className={`docs-rail__item${
                      activeCategory === ALL_CATEGORIES ? ' is-active' : ''
                    }`}
                    aria-pressed={activeCategory === ALL_CATEGORIES}
                    onClick={() => setActiveCategory(ALL_CATEGORIES)}
                  >
                    <LayoutGrid size={15} strokeWidth={2} aria-hidden="true" />
                    <span className="docs-rail__name">{t('All docs')}</span>
                    <span className="docs-rail__count">
                      {articleDocs.length}
                    </span>
                  </button>
                </div>

                {categories.map((item) => {
                  const Icon = getCategoryIcon(item.icon)
                  const isManageable =
                    canEdit && item.name !== GENERAL_DOC_CATEGORY

                  return (
                    <div
                      key={item.id}
                      className={`docs-rail__row${
                        isManageable ? ' docs-rail__row--manageable' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className={`docs-rail__item${
                          activeCategory === item.id ? ' is-active' : ''
                        }`}
                        aria-pressed={activeCategory === item.id}
                        onClick={() => setActiveCategory(item.id)}
                      >
                        <Icon
                          size={15}
                          strokeWidth={2}
                          color={item.color}
                          aria-hidden="true"
                        />
                        <span className="docs-rail__name">{item.name}</span>
                        <span className="docs-rail__count">
                          {categoryCounts.get(item.id) ?? 0}
                        </span>
                      </button>

                      {isManageable ? (
                        <PopoverMenu
                          isOpen={menuCategoryId === item.id}
                          onClose={() => setMenuCategoryId(null)}
                          onOpenChange={(isOpen) =>
                            setMenuCategoryId(isOpen ? item.id : null)
                          }
                          align="right"
                          trigger={
                            <button
                              type="button"
                              className="docs-rail__more"
                              aria-label={t('Manage {name}', { name: item.name })}
                              aria-expanded={menuCategoryId === item.id}
                            >
                              <MoreHorizontal
                                size={15}
                                strokeWidth={2}
                                aria-hidden="true"
                              />
                            </button>
                          }
                        >
                          <PopoverMenuItem
                            onClick={() => {
                              setMenuCategoryId(null)
                              setCategoryDialogError(null)
                              setCategoryDialog({
                                mode: 'edit',
                                category: item,
                              })
                            }}
                          >{t('Edit category')}</PopoverMenuItem>
                          <PopoverMenuItem
                            tone="danger"
                            onClick={() => {
                              setMenuCategoryId(null)
                              setCategoryToDelete(item)
                            }}
                          >{t('Delete category')}</PopoverMenuItem>
                        </PopoverMenu>
                      ) : null}
                    </div>
                  )
                })}

                {canEdit ? (
                  <button
                    type="button"
                    className="docs-rail__add"
                    onClick={() => {
                      setCategoryDialogError(null)
                      setCategoryDialog({ mode: 'create' })
                    }}
                  >{t('+ New category')}</button>
                ) : null}
              </nav>

              <div className="docs-hub-main">
                {visibleEntries.length === 0 ? (
                  <EmptyState
                    title={t('No docs')}
                    description={
                      articleDocs.length === 0
                        ? t('Create the first project doc.')
                        : t('Try another category or search query.')
                    }
                  />
                ) : (
                  <>
                    {showPinnedSection ? (
                      <section>
                        <h2 className="docs-hub-section-title">
                          <Pin size={14} strokeWidth={2} aria-hidden="true" />{t('Pinned')}</h2>
                        {renderCards(pinnedEntries)}
                      </section>
                    ) : null}

                    {mainEntries.length > 0 ? (
                      <section>
                        <h2 className="docs-hub-section-title">{mainTitle}</h2>
                        {renderCards(mainEntries)}
                      </section>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {categoryDialog ? (
        <CategoryDialog
          key={
            categoryDialog.mode === 'edit' ? categoryDialog.category.id : 'new'
          }
          mode={categoryDialog.mode}
          initial={
            categoryDialog.mode === 'edit'
              ? {
                  name: categoryDialog.category.name,
                  color: categoryDialog.category
                    .color as CategoryFormValues['color'],
                  icon: categoryDialog.category
                    .icon as CategoryFormValues['icon'],
                }
              : {
                  name: '',
                  color:
                    DOC_CATEGORY_COLORS[
                      categories.length % DOC_CATEGORY_COLORS.length
                    ],
                  icon: 'doc',
                }
          }
          isPending={isSavingCategory}
          errorMessage={categoryDialogError}
          onSubmit={(values) => {
            void handleSaveCategory(values)
          }}
          onClose={closeCategoryDialog}
        />
      ) : null}

      <ConfirmDialog
        open={categoryToDelete !== null}
        title={t('Delete category?')}
        description={
          categoryToDelete
            ? deleteCount > 0
              ? `"${categoryToDelete.name}" will be removed. Its ${deleteCount} ${
                  deleteCount === 1 ? 'doc moves' : 'docs move'
                } to General; nothing is deleted.`
              : t('"{name}" will be removed.', { name: categoryToDelete.name })
            : ''
        }
        confirmLabel={t('Delete category')}
        confirmVariant="danger"
        isPending={isDeletingCategory}
        pendingLabel={t('Deleting...')}
        onConfirm={() => {
          void handleDeleteCategory()
        }}
        onCancel={() => setCategoryToDelete(null)}
      />
    </main>
  )
}
