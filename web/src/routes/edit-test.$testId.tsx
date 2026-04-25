import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { uploadTestMedia } from '../features/media/server'
import { getEditTestFormState, updateTestCase } from '../features/tests/server'

export const Route = createFileRoute('/edit-test/$testId')({
  loader: async ({ params }) => {
    const testId = Number(params.testId)

    if (!Number.isInteger(testId) || testId <= 0) {
      throw notFound()
    }

    return getEditTestFormState({
      data: {
        id: testId,
      },
    })
  },
  component: EditTestPage,
})

function getErrorMessage(error: unknown, fallback: string): string {
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

function EditTestPage() {
  const formState = Route.useLoaderData()
  const navigate = useNavigate()

  const [title, setTitle] = useState(formState.test.title)
  const [sectionId, setSectionId] = useState(formState.test.sectionId.toString())
  const [status, setStatus] = useState<'Draft' | 'Ready'>(formState.test.status)
  const [steps, setSteps] = useState(formState.test.steps)
  const [expected, setExpected] = useState(formState.test.expected)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const selectedSection =
    formState.sections.find((section) => section.id.toString() === sectionId) ?? null

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
      const result = await updateTestCase({
        data: {
          id: formState.test.id,
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
      const message = getErrorMessage(error, 'Failed to update test case.')
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
            Edit Test Case
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
                <div className="mt-1">{selectedSection?.name ?? 'No suite selected'}</div>
              </div>
            </div>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
            Case status
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

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isUploading ||
                !formState.databaseConfigured ||
                formState.sections.length === 0
              }
              className="flex-1 rounded-xl border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.18)] px-4 py-3 text-sm font-semibold text-[var(--lagoon-deep)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isUploading
                ? 'Uploading media...'
                : isSubmitting
                  ? 'Saving...'
                  : 'Save changes'}
            </button>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: '/test/$testId',
                  params: { testId: formState.test.id.toString() },
                })
              }
              className="rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-sm font-semibold text-[var(--sea-ink-soft)]"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
