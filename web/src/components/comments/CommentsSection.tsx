import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { LazyRichTextEditor } from '../RichTextEditor.lazy'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { Panel } from '../ui/Panel'
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
  type CommentEntityType,
  type CommentItem,
} from '../../features/comments/server'
import { uploadTestMedia } from '../../features/media/server'
import { sanitizeHtml } from '../../lib/sanitize-html'
import { getErrorMessage } from '../../lib/errors'
import { useLanguage, useT, type Language } from '../../lib/i18n'

type CommentsSectionProps = {
  entityType: CommentEntityType
  entityId: number
}

type Thread = {
  root: CommentItem
  replies: CommentItem[]
}

const AVATAR_COLORS = ['#5b6ee1', '#1a9d57', '#d9822b', '#9b59b6', '#0f8fa8']

function isEmptyHtml(html: string): boolean {
  if (/<(img|video|pre)\b/i.test(html)) {
    return false
  }

  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim().length === 0
  )
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function avatarColor(key: string): string {
  let hash = 0

  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function formatCommentDate(value: string, language: Language): string {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  const sameYear = date.getFullYear() === new Date().getFullYear()

  return date.toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
    hour: '2-digit',
    minute: '2-digit',
  })
}

function openMediaOnClick(event: React.MouseEvent<HTMLElement>): void {
  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return
  }

  const media = target.closest<HTMLElement>(
    '[data-media-url], img[src], video[src]',
  )
  const url = media?.dataset.mediaUrl ?? media?.getAttribute('src')

  if (!url) {
    return
  }

  event.preventDefault()
  window.open(url, '_blank', 'noopener,noreferrer')
}

function groupThreads(items: CommentItem[]): Thread[] {
  const roots = items.filter((item) => item.parentId === null)
  const repliesByRoot = new Map<number, CommentItem[]>()

  for (const item of items) {
    if (item.parentId !== null) {
      const list = repliesByRoot.get(item.parentId) ?? []
      list.push(item)
      repliesByRoot.set(item.parentId, list)
    }
  }

  return roots.map((root) => ({
    root,
    replies: repliesByRoot.get(root.id) ?? [],
  }))
}

async function uploadCommentMedia(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const result = await uploadTestMedia({ data: formData })

  return result.url
}

function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <div
      className={`comment-avatar ${small ? 'comment-avatar--small' : ''}`}
      style={{ background: avatarColor(name) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </div>
  )
}

function CommentEditor({
  value,
  onChange,
  onSubmit,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder: string
  label: string
}) {
  const t = useT()

  return (
    <div
      className="comments-editor"
      onKeyDown={(event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault()
          onSubmit()
        }
      }}
    >
      <Suspense
        fallback={<div className="comments-editor__loading">{t('Loading editor...')}</div>}
      >
        <LazyRichTextEditor
          label={label}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onUploadMedia={uploadCommentMedia}
          minHeightClassName="min-h-16"
        />
      </Suspense>
    </div>
  )
}

export function CommentsSection({ entityType, entityId }: CommentsSectionProps) {
  const t = useT()
  const { language } = useLanguage()

  const [items, setItems] = useState<CommentItem[]>([])
  const [canComment, setCanComment] = useState(false)
  const [currentUserName, setCurrentUserName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [newBody, setNewBody] = useState('')
  const [replyToRootId, setReplyToRootId] = useState<number | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const state = await getComments({ data: { entityType, entityId } })

      setItems(state.comments)
      setCanComment(state.canComment)
      setCurrentUserName(state.currentUserName)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Failed to load comments.'),
      )
    } finally {
      setIsLoading(false)
    }
  }, [entityType, entityId])

  useEffect(() => {
    void load()
  }, [load])

  const threads = useMemo(() => groupThreads(items), [items])
  const visibleCount = items.filter((item) => !item.deleted).length

  async function run(action: () => Promise<void>): Promise<boolean> {
    setErrorMessage(null)
    setIsBusy(true)

    try {
      await action()
      await load()
      return true
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Something went wrong.'),
      )
      return false
    } finally {
      setIsBusy(false)
    }
  }

  async function submitNew(): Promise<void> {
    if (isBusy || isEmptyHtml(newBody)) {
      return
    }

    const ok = await run(async () => {
      await createComment({ data: { entityType, entityId, body: newBody } })
    })

    if (ok) {
      setNewBody('')
    }
  }

  async function submitReply(rootId: number): Promise<void> {
    if (isBusy || isEmptyHtml(replyBody)) {
      return
    }

    const ok = await run(async () => {
      await createComment({
        data: { entityType, entityId, parentId: rootId, body: replyBody },
      })
    })

    if (ok) {
      setReplyBody('')
      setReplyToRootId(null)
    }
  }

  async function submitEdit(): Promise<void> {
    if (isBusy || editingId === null || isEmptyHtml(editBody)) {
      return
    }

    const commentId = editingId
    const ok = await run(async () => {
      await updateComment({ data: { commentId, body: editBody } })
    })

    if (ok) {
      setEditingId(null)
      setEditBody('')
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) {
      return
    }

    const commentId = deleteTarget.id

    await run(async () => {
      await deleteComment({ data: { commentId } })
    })
    setDeleteTarget(null)
  }

  function startReply(rootId: number): void {
    setEditingId(null)
    setReplyBody('')
    setReplyToRootId(rootId)
  }

  function startEdit(comment: CommentItem): void {
    setReplyToRootId(null)
    setEditBody(comment.body)
    setEditingId(comment.id)
  }

  function renderComment(comment: CommentItem, rootId: number, isReply: boolean) {
    if (comment.deleted) {
      return (
        <div className="comment comment--deleted">
          <div className="comment__placeholder">{t('This comment was deleted.')}</div>
        </div>
      )
    }

    const isEditing = editingId === comment.id

    return (
      <div className={`comment ${isReply ? 'comment--reply' : ''}`}>
        <Avatar name={comment.authorName} small={isReply} />
        <div className="comment__main">
          <div className="comment__meta">
            <strong>{comment.authorName}</strong>
            <span>{formatCommentDate(comment.createdAt, language)}</span>
            {comment.updatedAt ? (
              <span title={formatCommentDate(comment.updatedAt, language)}>{t('(edited)')}</span>
            ) : null}
          </div>

          {isEditing ? (
            <div className="comment__edit">
              <CommentEditor
                value={editBody}
                onChange={setEditBody}
                onSubmit={() => void submitEdit()}
                placeholder={t('Edit your comment...')}
                label={t('Edit comment')}
              />
              <div className="comment__edit-actions">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingId(null)}
                  disabled={isBusy}
                >{t('Cancel')}</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() => void submitEdit()}
                  disabled={isBusy || isEmptyHtml(editBody)}
                >{t('Save')}</Button>
              </div>
            </div>
          ) : (
            <>
              <div
                className="comment__body rich-output prose prose-sm max-w-none text-[var(--tms-text)]"
                onClick={openMediaOnClick}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.body) }}
              />
              <div className="comment__actions">
                {canComment ? (
                  <button
                    type="button"
                    className="comment__action"
                    onClick={() => startReply(rootId)}
                  >{t('Reply')}</button>
                ) : null}
                {comment.canEdit ? (
                  <button
                    type="button"
                    className="comment__action"
                    onClick={() => startEdit(comment)}
                  >{t('Edit')}</button>
                ) : null}
                {comment.canDelete ? (
                  <button
                    type="button"
                    className="comment__action comment__action--danger"
                    onClick={() => setDeleteTarget(comment)}
                  >{t('Delete')}</button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <Panel className="comments-panel">
      <div className="comments-header">
        <h2>{t('Comments')}</h2>
        <span className="comments-count">{visibleCount}</span>
      </div>

      {errorMessage ? (
        <Alert variant="danger" className="comments-alert">
          {errorMessage}
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="comments-empty">{t('Loading comments...')}</div>
      ) : threads.length === 0 ? (
        <div className="comments-empty">
          {canComment
            ? t('No comments yet. Start the discussion below.')
            : t('No comments yet.')}
        </div>
      ) : (
        <div className="comments-threads">
          {threads.map((thread) => (
            <div key={thread.root.id} className="comment-thread">
              {renderComment(thread.root, thread.root.id, false)}

              {thread.replies.length > 0 ? (
                <div className="comment-replies">
                  {thread.replies.map((reply) => (
                    <div key={reply.id}>
                      {renderComment(reply, thread.root.id, true)}
                    </div>
                  ))}
                </div>
              ) : null}

              {replyToRootId === thread.root.id ? (
                <div className="comment-reply-box">
                  <CommentEditor
                    value={replyBody}
                    onChange={setReplyBody}
                    onSubmit={() => void submitReply(thread.root.id)}
                    placeholder={t('Reply in this thread...')}
                    label={t('Reply')}
                  />
                  <div className="comment__edit-actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setReplyToRootId(null)}
                      disabled={isBusy}
                    >{t('Cancel')}</Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => void submitReply(thread.root.id)}
                      disabled={isBusy || isEmptyHtml(replyBody)}
                    >{t('Reply')}</Button>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {canComment ? (
        <div className="comments-new">
          <Avatar name={currentUserName || '?'} />
          <div className="comments-new__main">
            <CommentEditor
              value={newBody}
              onChange={setNewBody}
              onSubmit={() => void submitNew()}
              placeholder={t('Leave a comment. JSON, SQL and code are pasted as blocks.')}
              label={t('New comment')}
            />
            <div className="comments-new__footer">
              <small>{t('Ctrl + Enter to send')}</small>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={() => void submitNew()}
                disabled={isBusy || isEmptyHtml(newBody)}
              >
                {isBusy ? t('Sending...') : t('Comment')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('Delete this comment?')}
        description={t('This cannot be undone. If the comment has replies, a placeholder stays so the thread still makes sense.')}
        confirmLabel={t('Delete')}
        pendingLabel={t('Deleting...')}
        confirmVariant="danger"
        isPending={isBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </Panel>
  )
}
