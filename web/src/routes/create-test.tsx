import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { uploadTestImage } from '../features/media/server'
import {
  createTestCase,
  getCreateTestFormState,
} from '../features/tests/server'

export const Route = createFileRoute('/create-test')({
  loader: async () => getCreateTestFormState(),
  component: CreateTestPage,
})

function insertImageIntoEditor(editor: HTMLDivElement, url: string): void {
  if (typeof document.execCommand === 'function') {
    editor.focus()
    document.execCommand('insertImage', false, url)
    return
  }

  editor.insertAdjacentHTML('beforeend', `<img src="${url}" alt="" />`)
}

function CreateTestPage() {
  const formState = Route.useLoaderData()
  const navigate = useNavigate()
  const stepsEditorRef = useRef<HTMLDivElement | null>(null)

  const [title, setTitle] = useState('')
  const [sectionId, setSectionId] = useState(
    formState.sections[0]?.id?.toString() ?? '',
  )
  const [status, setStatus] = useState<'Passed' | 'Failed'>('Passed')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  async function uploadImage(file: File): Promise<void> {
    const editor = stepsEditorRef.current

    if (!editor) {
      throw new Error('Steps editor is not available.')
    }

    setErrorMessage(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadTestImage({
        data: formData,
      })

      insertImageIntoEditor(editor, result.url)
      setSteps(editor.innerHTML)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to upload image.'
      setErrorMessage(message)
    } finally {
      setIsUploading(false)
    }
  }

  async function handlePaste(
    event: React.ClipboardEvent<HTMLDivElement>,
  ): Promise<void> {
    const items = event.clipboardData.items

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault()
        const file = item.getAsFile()

        if (file) {
          await uploadImage(file)
        }

        return
      }
    }
  }

  async function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
  ): Promise<void> {
    event.preventDefault()

    const file = event.dataTransfer.files[0]

    if (file) {
      await uploadImage(file)
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const editorHtml = stepsEditorRef.current?.innerHTML ?? steps
      const result = await createTestCase({
        data: {
          title,
          sectionId: Number(sectionId),
          status,
          steps: editorHtml,
          expected,
        },
      })

      await navigate({
        to: '/test/$testId',
        params: {
          testId: result.id.toString(),
        },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create test.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rounded-[2rem] p-6 sm:p-8">
        <p className="island-kicker mb-2">Create Test</p>
        <h1 className="display-title mb-3 text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
          Restore the verified create test upload flow
        </h1>
        <p className="max-w-3xl text-base leading-8 text-[var(--sea-ink-soft)]">
          This page now restores the confirmed Flask behavior for image paste
          and drag-drop upload: backend upload returns a public URL and the
          editor inserts that image into <code>steps</code> HTML.
        </p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.8fr]">
        <form
          className="island-shell grid gap-4 rounded-[1.5rem] p-6"
          onSubmit={handleSubmit}
        >
          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
              placeholder="Verify order cancellation"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Section
            <select
              value={sectionId}
              onChange={(event) => setSectionId(event.target.value)}
              className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
            >
              {formState.sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Status
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

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Steps
            <div
              ref={stepsEditorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={(event) => setSteps(event.currentTarget.innerHTML)}
              onPaste={handlePaste}
              onDrop={handleDrop}
              onDragOver={(event) => event.preventDefault()}
              className="min-h-40 rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus-within:border-[var(--lagoon-deep)]"
            />
          </label>

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Expected
            <textarea
              value={expected}
              onChange={(event) => setExpected(event.target.value)}
              className="min-h-32 rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
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
              ? 'Uploading image...'
              : isSubmitting
                ? 'Saving...'
                : 'Save test'}
          </button>
        </form>

        <aside className="grid gap-6">
          <section className="island-shell rounded-[1.5rem] p-6">
            <p className="island-kicker mb-2">Scope</p>
            <div className="grid gap-3 text-sm text-[var(--sea-ink-soft)]">
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Replaced now
                </strong>
                Flask image upload contract: <code>POST /upload</code> equivalent
                behavior with a returned public URL inserted into test steps.
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/50 p-4">
                <strong className="block text-[var(--sea-ink)]">
                  Explicit assumption
                </strong>
                The migrated editor restores only the confirmed image flow used
                by paste and drag-drop. It does not expand to unverified generic
                file or video behavior.
              </div>
            </div>
          </section>

          {!formState.databaseConfigured ? (
            <section className="island-shell rounded-[1.5rem] border border-amber-300/60 bg-amber-100/70 p-6 text-sm text-amber-950">
              <strong>Database is not configured yet.</strong> Set
              <code> MYSQL_DATABASE_URL </code>
              and run the Drizzle migration first.
            </section>
          ) : formState.sections.length === 0 ? (
            <section className="island-shell rounded-[1.5rem] p-6 text-sm text-[var(--sea-ink-soft)]">
              There are no sections in MySQL yet, so create test is blocked
              until a later migration slice adds section management.
            </section>
          ) : null}
        </aside>
      </section>
    </main>
  )
}
