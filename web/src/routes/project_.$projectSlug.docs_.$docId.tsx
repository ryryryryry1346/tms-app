import {
  Link,
  createFileRoute,
  notFound,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { Check, Link2, MoreHorizontal, Pin, PinOff } from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import {
  PopoverMenu,
  PopoverMenuItem,
} from '../components/ui/PopoverMenu'
import {
  LazyRichTextEditor,
  preloadRichTextEditor,
} from '../components/RichTextEditor.lazy'
import { CategoryChip } from '../components/docs/CategoryChip'
import {
  deleteProjectDoc,
  getProjectDocDetail,
  setProjectDocPinned,
  updateProjectDoc,
} from '../features/docs/server'
import { CommentsSection } from '../components/comments/CommentsSection'
import { uploadTestMedia } from '../features/media/server'
import { buildDocToc, estimateReadingMinutes } from '../lib/docToc'
import { sanitizeHtml } from '../lib/sanitize-html'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

const SelectMenu = lazy(() =>
  import('../components/ui/SelectMenu').then((module) => ({
    default: module.SelectMenu,
  })),
)

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
      categories: docsState.categories,
      canEdit: docsState.canEdit,
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

// Opens an inline image/video in a new tab when it is clicked in the
// read-only doc view (the editor has its own handler for edit mode).
function handleDocMediaClick(event: React.MouseEvent<HTMLElement>): void {
  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return
  }

  const mediaElement = target.closest<HTMLElement>(
    '[data-media-url], img[src], video[src]',
  )
  const url = mediaElement?.dataset.mediaUrl ?? mediaElement?.getAttribute('src')

  if (!url) {
    return
  }

  event.preventDefault()
  window.open(url, '_blank', 'noopener,noreferrer')
}

function ProjectDocDetailPage() {
  const t = useT()

  const { project, doc, categories, canEdit } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const projectSlug = project.slug ?? project.id.toString()
  const isNewArticle =
    (doc.title === 'Untitled article' || doc.title === 'Untitled doc') &&
    !doc.content
  const [title, setTitle] = useState(doc.title)
  const [category, setCategory] = useState(doc.category ?? 'General')
  const [content, setContent] = useState(doc.content ?? '')
  const [isEditing, setIsEditing] = useState(isNewArticle && canEdit)
  const [isSaving, setIsSaving] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)
  const [isLinkCopied, setIsLinkCopied] = useState(false)
  const [activeTocId, setActiveTocId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isPinned = doc.pinnedAt !== null
  const savedCategoryName = doc.category ?? 'General'
  const activeCategory = categories.find((item) => item.name === category)
  const categoryOptions = useMemo(() => {
    const names = categories.map((item) => item.name)

    // A doc can still point at a category that was removed meanwhile.
    if (!names.includes(category)) {
      names.push(category)
    }

    return names.map((name) => ({ value: name, label: name }))
  }, [categories, category])
  const readable = useMemo(() => {
    const toc = buildDocToc(prepareDocContentHtml(content))

    return {
      html: sanitizeHtml(toc.html),
      tocItems: toc.items,
      readingMinutes: estimateReadingMinutes(content),
    }
  }, [content])
  const tocItems = readable.tocItems

  useEffect(() => {
    if (isEditing || tocItems.length === 0) {
      return undefined
    }

    // Capture phase so scrolling inside any app-shell container counts too.
    function updateActiveHeading(): void {
      let currentId = tocItems[0].id

      for (const item of tocItems) {
        const element = document.getElementById(item.id)

        if (element && element.getBoundingClientRect().top <= 120) {
          currentId = item.id
        }
      }

      setActiveTocId(currentId)
    }

    updateActiveHeading()
    window.addEventListener('scroll', updateActiveHeading, {
      passive: true,
      capture: true,
    })

    return () => {
      window.removeEventListener('scroll', updateActiveHeading, true)
    }
  }, [isEditing, tocItems])

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
        getErrorMessage(error, 'Failed to upload media.'),
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
        getErrorMessage(error, 'Failed to save documentation.'),
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTogglePin(): Promise<void> {
    setErrorMessage(null)
    setIsPinning(true)

    try {
      await setProjectDocPinned({
        data: {
          docId: doc.id,
          pinned: !isPinned,
        },
      })

      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Failed to update pin.'),
      )
    } finally {
      setIsPinning(false)
    }
  }

  async function handleCopyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsLinkCopied(true)
      window.setTimeout(() => setIsLinkCopied(false), 1800)
    } catch {
      setErrorMessage('Could not copy the link.')
    }
  }

  function handleTocClick(
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ): void {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    setActiveTocId(id)
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
        getErrorMessage(error, 'Failed to delete documentation.'),
      )
      setIsSaving(false)
    }
  }

  const actions = isConfirmingDelete ? (
    <>
      <Button
        onClick={() => {
          setIsConfirmingDelete(false)
        }}
        disabled={isSaving}
        variant="secondary"
        size="sm"
      >{t('Cancel delete')}</Button>
      <Button
        onClick={() => {
          void handleDelete()
        }}
        disabled={isSaving}
        variant="danger"
        size="sm"
      >
        {isSaving ? t('Deleting...') : t('Confirm delete')}
      </Button>
    </>
  ) : isEditing ? (
    <>
      {!isNewArticle ? (
        <Button
          onClick={() => {
            setTitle(doc.title)
            setCategory(savedCategoryName)
            setContent(doc.content ?? '')
            setIsEditing(false)
          }}
          disabled={isSaving}
          variant="secondary"
          size="sm"
        >{t('Cancel')}</Button>
      ) : null}
      <Button
        onClick={() => {
          void handleSave()
        }}
        disabled={isSaving || title.trim().length === 0}
        variant="primary"
        size="sm"
      >
        {isSaving ? t('Saving...') : t('Save doc')}
      </Button>
    </>
  ) : (
    <>
      {canEdit ? (
        <Button
          onClick={() => {
            void handleTogglePin()
          }}
          disabled={isPinning}
          variant="secondary"
          size="sm"
          aria-pressed={isPinned}
        >
          {isPinned ? (
            <PinOff size={14} strokeWidth={2} aria-hidden="true" />
          ) : (
            <Pin size={14} strokeWidth={2} aria-hidden="true" />
          )}
          {isPinned ? t('Unpin') : t('Pin')}
        </Button>
      ) : null}
      <Button
        onClick={() => {
          void handleCopyLink()
        }}
        variant="secondary"
        size="sm"
      >
        {isLinkCopied ? (
          <Check size={14} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Link2 size={14} strokeWidth={2} aria-hidden="true" />
        )}
        {isLinkCopied ? t('Copied') : t('Copy link')}
      </Button>
      {canEdit ? (
        <>
          <Button
            onClick={() => {
              void preloadRichTextEditor()
              setIsEditing(true)
            }}
            variant="primary"
            size="sm"
          >{t('Edit doc')}</Button>
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
                aria-label={t('More doc actions')}
                aria-expanded={isMoreActionsOpen}
              >
                <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
              </Button>
            }
          >
            <PopoverMenuItem
              tone="danger"
              onClick={() => {
                setIsMoreActionsOpen(false)
                setIsConfirmingDelete(true)
              }}
            >{t('Delete doc')}</PopoverMenuItem>
          </PopoverMenu>
        </>
      ) : null}
    </>
  )

  const showToc = !isEditing && tocItems.length > 0

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
              >{t('Docs')}</Link>
              <span>/</span>
              <span>{project.name}</span>
            </div>

            <LinkButton
              to="/project/$projectSlug/docs"
              params={{ projectSlug }}
              variant="secondary"
              size="sm"
              className="docs-detail-back-link"
            >{t('Back to docs')}</LinkButton>
          </div>

          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <div className={showToc ? 'doc-layout doc-layout--toc' : 'doc-layout'}>
            <div className="doc-layout__main">
              <Panel className="doc-article">
                <div className="doc-article__top">
                  <CategoryChip
                    name={category || 'General'}
                    color={activeCategory?.color}
                    icon={activeCategory?.icon}
                  />
                  {isPinned ? (
                    <span className="doc-article__pinned">
                      <Pin size={12} strokeWidth={2.2} aria-hidden="true" />{t('Pinned')}</span>
                  ) : null}
                  <div className="doc-article__actions">{actions}</div>
                </div>

                {isEditing ? (
                  <>
                    <div className="docs-fields">
                      <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">{t('Title')}<Input
                          value={title}
                          onChange={(event) => setTitle(event.target.value)}
                          placeholder={t('Endpoints for monolith')}
                        />
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">{t('Category')}<Suspense fallback={<Input value={category} readOnly />}>
                          <SelectMenu
                            value={category}
                            options={categoryOptions}
                            onValueChange={setCategory}
                          />
                        </Suspense>
                      </label>
                    </div>

                    <Suspense
                      fallback={
                        <div className="docs-content-view__empty">{t('Loading editor...')}</div>
                      }
                    >
                      <LazyRichTextEditor
                        label={t('Content')}
                        placeholder={t('Add steps, commands, links, endpoint notes, screenshots, or support instructions...')}
                        value={content}
                        onChange={setContent}
                        onUploadMedia={uploadMedia}
                        isUploading={isUploading}
                      />
                    </Suspense>
                  </>
                ) : (
                  <>
                    <h1 className="doc-article__title">{title}</h1>
                    <div className="doc-article__meta">
                      <span>{t('Updated')}{' '}<b>{formatDate(doc.updatedAt)}</b>
                        {doc.updatedByName ? <>{' '}{t('by')}{' '}{doc.updatedByName}</> : null}
                      </span>
                      {doc.createdByName ? (
                        <span>{t('Author')}{' '}<b>{doc.createdByName}</b>
                        </span>
                      ) : null}
                      {readable.readingMinutes > 0 ? (
                        <span>{t('~{readingMinutes} min read', { readingMinutes: readable.readingMinutes })}</span>
                      ) : null}
                    </div>

                    <article className="docs-content-view">
                      {content.trim().length > 0 ? (
                        <div
                          className="docs-content-view__body"
                          onClick={handleDocMediaClick}
                          dangerouslySetInnerHTML={{ __html: readable.html }}
                        />
                      ) : (
                        <div className="docs-content-view__empty">{t('This doc does not have content yet.')}</div>
                      )}
                    </article>
                  </>
                )}
              </Panel>

              {isEditing ? null : (
                <CommentsSection entityType="doc" entityId={doc.id} />
              )}
            </div>

            {showToc ? (
              <aside className="doc-toc" aria-label={t('On this page')}>
                <div className="doc-toc__caption">{t('On this page')}</div>
                <nav>
                  {tocItems.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(event) => handleTocClick(event, item.id)}
                      className={[
                        'doc-toc__link',
                        item.level === 3 ? 'doc-toc__link--sub' : '',
                        activeTocId === item.id ? 'doc-toc__link--active' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </aside>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
