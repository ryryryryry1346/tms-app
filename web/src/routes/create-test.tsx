import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { uploadTestMedia } from '../features/media/server'
import {
  createTestCase,
  getCreateTestFormState,
} from '../features/tests/server'

type EditorKey = 'steps' | 'expected'
type FontSize = 'small' | 'normal' | 'large'

export const Route = createFileRoute('/create-test')({
  loader: async () => getCreateTestFormState(),
  component: CreateTestPage,
})

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function buildMediaMarkup(url: string, file: File): string {
  const safeUrl = escapeAttribute(url)

  if (file.type.startsWith('video/')) {
    return `
      <figure class="editor-media-frame" contenteditable="false">
        <video
          class="editor-media"
          src="${safeUrl}"
          data-media-url="${safeUrl}"
          playsinline
          muted
          preload="metadata"
        ></video>
      </figure>
      <p><br></p>
    `
  }

  return `
    <figure class="editor-media-frame" contenteditable="false">
      <img
        class="editor-media"
        src="${safeUrl}"
        alt=""
        data-media-url="${safeUrl}"
      />
    </figure>
    <p><br></p>
  `
}

function insertHtmlAtCursor(editor: HTMLDivElement, html: string): void {
  editor.focus()

  if (typeof document.execCommand === 'function') {
    document.execCommand('insertHTML', false, html)
    return
  }

  editor.insertAdjacentHTML('beforeend', html)
}

function openMediaFromTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const mediaElement = target.closest<HTMLElement>('[data-media-url]')

  if (!mediaElement) {
    return false
  }

  const url = mediaElement.dataset.mediaUrl

  if (!url) {
    return false
  }

  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message
  }

  return fallback
}

function CreateTestPage() {
  const formState = Route.useLoaderData()
  const navigate = useNavigate()
  const stepsEditorRef = useRef<HTMLDivElement | null>(null)
  const expectedEditorRef = useRef<HTMLDivElement | null>(null)
  const mediaInputRef = useRef<HTMLInputElement | null>(null)

  const [title, setTitle] = useState('')
  const [sectionId, setSectionId] = useState(
    formState.sections[0]?.id?.toString() ?? '',
  )
  const [status, setStatus] = useState<'Passed' | 'Failed'>('Passed')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [activeEditor, setActiveEditor] = useState<EditorKey>('steps')
  const [fontSize, setFontSize] = useState<FontSize>('normal')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const selectedSection =
    formState.sections.find((section) => section.id.toString() === sectionId) ??
    null

  function getEditor(editorKey: EditorKey): HTMLDivElement | null {
    return editorKey === 'steps'
      ? stepsEditorRef.current
      : expectedEditorRef.current
  }

  function syncEditor(editorKey: EditorKey): void {
    const editor = getEditor(editorKey)
    const html = editor?.innerHTML ?? ''

    if (editorKey === 'steps') {
      setSteps(html)
      return
    }

    setExpected(html)
  }

  function runEditorCommand(command: string, value?: string): void {
    const editor = getEditor(activeEditor)

    if (!editor) {
      return
    }

    editor.focus()

    if (typeof document.execCommand === 'function') {
      document.execCommand(command, false, value)
      syncEditor(activeEditor)
    }
  }

  function handleFontSizeChange(size: FontSize): void {
    setFontSize(size)

    const sizeMap: Record<FontSize, string> = {
      small: '2',
      normal: '3',
      large: '5',
    }

    runEditorCommand('fontSize', sizeMap[size])
  }

  async function uploadMedia(file: File, editorKey: EditorKey): Promise<void> {
    const editor = getEditor(editorKey)

    if (!editor) {
      throw new Error('Editor is not available.')
    }

    setErrorMessage(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadTestMedia({
        data: formData,
      })

      insertHtmlAtCursor(editor, buildMediaMarkup(result.url, file))
      syncEditor(editorKey)
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to upload media.')
      setErrorMessage(message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handlePaste(
    editorKey: EditorKey,
    event: React.ClipboardEvent<HTMLDivElement>,
  ): Promise<void> {
    const items = event.clipboardData.items

    for (const item of items) {
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        event.preventDefault()
        const file = item.getAsFile()

        if (file) {
          setActiveEditor(editorKey)
          await uploadMedia(file, editorKey)
        }

        return
      }
    }
  }

  async function handleDrop(
    editorKey: EditorKey,
    event: React.DragEvent<HTMLDivElement>,
  ): Promise<void> {
    event.preventDefault()
    const file = event.dataTransfer.files[0]

    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      setActiveEditor(editorKey)
      await uploadMedia(file, editorKey)
    }
  }

  async function handleMediaPickerChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    await uploadMedia(file, activeEditor)
    event.target.value = ''
  }

  function handleInsertMediaClick(): void {
    mediaInputRef.current?.click()
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const stepsHtml = stepsEditorRef.current?.innerHTML ?? steps
      const expectedHtml = expectedEditorRef.current?.innerHTML ?? expected
      const result = await createTestCase({
        data: {
          title,
          sectionId: Number(sectionId),
          status,
          steps: stepsHtml,
          expected: expectedHtml,
        },
      })

      await navigate({
        to: '/test/$testId',
        params: {
          testId: result.id.toString(),
        },
      })
    } catch (error) {
      const message = getErrorMessage(error, 'Failed to create test.')
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-8">
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="island-kicker mb-2">Project / Suite / Case</p>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-4xl">
            Create Test Case
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-5xl">
        <form
          className="island-shell grid gap-4 rounded-[1.5rem] p-6"
          onSubmit={handleSubmit}
        >
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => void handleMediaPickerChange(event)}
          />

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Test case title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
              placeholder="Verify order cancellation"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
              Test suite
              <select
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
              >
                {formState.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.projectName
                      ? `${section.projectName} / ${section.name}`
                      : section.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white/55 p-4 text-sm text-[var(--sea-ink-soft)]">
              <div>
                <strong className="block text-[var(--sea-ink)]">Project</strong>
                <div className="mt-1">
                  {selectedSection?.projectName ?? 'No project linked'}
                </div>
              </div>
              <div>
                <strong className="block text-[var(--sea-ink)]">Suite</strong>
                <div className="mt-1">
                  {selectedSection?.name ?? 'No suite selected'}
                </div>
              </div>
            </div>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Initial case status
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value === 'Failed' ? 'Failed' : 'Passed')
              }
              className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
            >
              <option value="Passed">Passed</option>
              <option value="Failed">Failed</option>
            </select>
          </label>

          <div className="editor-toolbar" role="toolbar" aria-label="Text formatting">
            <button
              type="button"
              className="editor-tool-button"
              onClick={() => runEditorCommand('bold')}
            >
              Bold
            </button>
            <button
              type="button"
              className="editor-tool-button"
              onClick={() => runEditorCommand('italic')}
            >
              Italic
            </button>
            <button
              type="button"
              className="editor-tool-button"
              onClick={() => runEditorCommand('underline')}
            >
              Underline
            </button>
            <button
              type="button"
              className="editor-tool-button"
              onClick={() => runEditorCommand('insertUnorderedList')}
            >
              Bullet list
            </button>
            <button
              type="button"
              className="editor-tool-button"
              onClick={() => runEditorCommand('insertOrderedList')}
            >
              Numbered list
            </button>
            <select
              value={fontSize}
              onChange={(event) =>
                handleFontSizeChange(event.target.value as FontSize)
              }
              className="editor-tool-select"
            >
              <option value="small">Small text</option>
              <option value="normal">Normal text</option>
              <option value="large">Large text</option>
            </select>
            <button
              type="button"
              className="editor-tool-button"
              onClick={handleInsertMediaClick}
            >
              Add media
            </button>
            {isUploading ? (
              <div className="editor-tool-note">Uploading media...</div>
            ) : (
              <div className="editor-tool-note">
                Images, GIFs, and videos become inline previews.
              </div>
            )}
          </div>

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Steps
            <div
              ref={stepsEditorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Describe the test steps"
              onFocus={() => setActiveEditor('steps')}
              onInput={() => syncEditor('steps')}
              onPaste={(event) => void handlePaste('steps', event)}
              onDrop={(event) => void handleDrop('steps', event)}
              onDragOver={(event) => event.preventDefault()}
              onClick={(event) => {
                setActiveEditor('steps')
                if (openMediaFromTarget(event.target)) {
                  event.preventDefault()
                }
              }}
              className="editor-surface min-h-36 rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus-within:border-[var(--lagoon-deep)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Expected result
            <div
              ref={expectedEditorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Describe the expected result"
              onFocus={() => setActiveEditor('expected')}
              onInput={() => syncEditor('expected')}
              onPaste={(event) => void handlePaste('expected', event)}
              onDrop={(event) => void handleDrop('expected', event)}
              onDragOver={(event) => event.preventDefault()}
              onClick={(event) => {
                setActiveEditor('expected')
                if (openMediaFromTarget(event.target)) {
                  event.preventDefault()
                }
              }}
              className="editor-surface min-h-32 rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus-within:border-[var(--lagoon-deep)]"
            />
          </label>

          {errorMessage ? (
            <div className="rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              isSubmitting ||
              isUploading ||
              !formState.databaseConfigured ||
              formState.sections.length === 0
            }
            className="rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isUploading
              ? 'Uploading media...'
              : isSubmitting
                ? 'Saving...'
                : 'Save test case'}
          </button>
        </form>
      </section>

      {!formState.databaseConfigured ? (
        <section className="mx-auto mt-5 max-w-5xl island-shell rounded-[1.5rem] border border-amber-300/60 bg-amber-100/70 p-6 text-sm text-amber-950">
          <strong>Database is not configured yet.</strong> Set
          <code> MYSQL_DATABASE_URL </code>
          and run the Drizzle migration first.
        </section>
      ) : formState.sections.length === 0 ? (
        <section className="mx-auto mt-5 max-w-5xl island-shell rounded-[1.5rem] p-6 text-sm text-[var(--sea-ink-soft)]">
          There are no suites in MySQL yet, so test case creation is blocked
          until suite management is added.
        </section>
      ) : null}
    </main>
  )
}
