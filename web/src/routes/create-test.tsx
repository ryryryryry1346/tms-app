import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { uploadTestMedia } from '../features/media/server'
import {
  createTestCase,
  getCreateTestFormState,
} from '../features/tests/server'

export const Route = createFileRoute('/create-test')({
  loader: async () => getCreateTestFormState(),
  component: CreateTestPage,
})

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

  const [title, setTitle] = useState('')
  const [sectionId, setSectionId] = useState(
    formState.sections[0]?.id?.toString() ?? '',
  )
  const [status, setStatus] = useState<'Draft' | 'Ready'>('Draft')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const selectedSection =
    formState.sections.find((section) => section.id.toString() === sectionId) ??
    null

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
      const message = getErrorMessage(error, 'Failed to upload media.')
      setErrorMessage(message)
      throw error
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await createTestCase({
        data: {
          title,
          sectionId: Number(sectionId),
          status,
          steps,
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
                setStatus(event.target.value === 'Ready' ? 'Ready' : 'Draft')
              }
              className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus:border-[var(--lagoon-deep)]"
            >
              <option value="Draft">Draft</option>
              <option value="Ready">Ready</option>
            </select>
          </label>

          <RichTextEditor
            label="Steps"
            placeholder="Describe the test steps"
            value={steps}
            onChange={setSteps}
            onUploadMedia={uploadMedia}
            isUploading={isUploading}
          />

          <RichTextEditor
            label="Expected result"
            placeholder="Describe the expected result"
            value={expected}
            onChange={setExpected}
            onUploadMedia={uploadMedia}
            isUploading={isUploading}
          />

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
