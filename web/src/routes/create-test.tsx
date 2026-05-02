import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { RichTextEditor } from '../components/RichTextEditor'
import { uploadTestMedia } from '../features/media/server'
import {
  createTestCase,
  getCreateTestFormState,
} from '../features/tests/server'

export const Route = createFileRoute('/create-test')({
  validateSearch: z.object({
    suiteId: z.coerce.number().int().positive().optional(),
    projectId: z.coerce.number().int().positive().optional(),
  }),
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
  const search = Route.useSearch()
  const navigate = useNavigate()

  const initialSection =
    formState.sections.find((section) => section.id === search.suiteId) ??
    formState.sections[0] ??
    null

  const [title, setTitle] = useState('')
  const [sectionId, setSectionId] = useState(initialSection?.id?.toString() ?? '')
  const [status, setStatus] = useState<'Draft' | 'Ready'>('Draft')
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>(
    'Medium',
  )
  const [caseType, setCaseType] = useState<
    'Functional' | 'Regression' | 'Smoke' | 'E2E' | 'UI' | 'API'
  >('Functional')
  const [steps, setSteps] = useState('')
  const [expected, setExpected] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const selectedSection =
    formState.sections.find((section) => section.id.toString() === sectionId) ??
    null
  const selectedProjectSlug = selectedSection?.projectSlug ?? null

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
          priority,
          caseType,
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
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f9fe]">
      <div className="mx-auto max-w-[1180px] px-6 py-8">
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#60718f]">
            <Link to="/" className="no-underline text-[#2f6fe4]">
              Workspace
            </Link>
            <span>/</span>
            <span>{selectedSection?.projectName ?? 'Project'}</span>
            <span>/</span>
            <span>{selectedSection?.name ?? 'Suite'}</span>
          </div>
          <h1 className="m-0 text-4xl font-bold tracking-tight text-[#1b2f5b]">
            Create Test Case
          </h1>
        </div>
        {selectedProjectSlug ? (
          <Link
            to="/project/$projectSlug/repository"
            params={{ projectSlug: selectedProjectSlug }}
            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold no-underline text-[#60718f] hover:text-[#2f6fe4]"
          >
            Back to repository
          </Link>
        ) : null}
      </section>

      <section>
        <form
          className="rounded-[1.5rem] border border-[#e6ecf8] bg-white p-6 shadow-[0_12px_36px_rgba(31,57,102,0.06)]"
          onSubmit={handleSubmit}
        >
          <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
            Test case title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="rounded-xl border border-[#dbe4f4] bg-white px-4 py-3 text-base outline-none transition focus:border-[#2f6fe4]"
              placeholder="Verify order cancellation"
            />
          </label>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_190px]">
            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Test suite
              <select
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                className="rounded-xl border border-[#dbe4f4] bg-white px-4 py-3 text-base outline-none transition focus:border-[#2f6fe4]"
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

            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Status
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value === 'Ready' ? 'Ready' : 'Draft')
                }
                className="rounded-xl border border-[#dbe4f4] bg-white px-4 py-3 text-base outline-none transition focus:border-[#2f6fe4]"
              >
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Priority
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value === 'Low'
                      ? 'Low'
                      : event.target.value === 'High'
                        ? 'High'
                        : event.target.value === 'Critical'
                          ? 'Critical'
                          : 'Medium',
                  )
                }
                className="rounded-xl border border-[#dbe4f4] bg-white px-4 py-3 text-base outline-none transition focus:border-[#2f6fe4]"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Type
              <select
                value={caseType}
                onChange={(event) =>
                  setCaseType(
                    event.target.value === 'Regression'
                      ? 'Regression'
                      : event.target.value === 'Smoke'
                        ? 'Smoke'
                        : event.target.value === 'E2E'
                          ? 'E2E'
                          : event.target.value === 'UI'
                            ? 'UI'
                            : event.target.value === 'API'
                              ? 'API'
                              : 'Functional',
                  )
                }
                className="rounded-xl border border-[#dbe4f4] bg-white px-4 py-3 text-base outline-none transition focus:border-[#2f6fe4]"
              >
                <option value="Functional">Functional</option>
                <option value="Regression">Regression</option>
                <option value="Smoke">Smoke</option>
                <option value="E2E">E2E</option>
                <option value="UI">UI</option>
                <option value="API">API</option>
              </select>
            </label>
          </div>

          <div className="mt-5 grid gap-5">
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
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e9eef8] pt-5">
            <div className="text-sm font-semibold text-[#60718f]">
              {selectedSection
                ? `${selectedSection.projectName ?? 'Project'} / ${selectedSection.name}`
                : 'Choose a suite to create this case.'}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedProjectSlug ? (
                <Link
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug: selectedProjectSlug }}
                  className="rounded-xl border border-[#dbe4f4] bg-white px-4 py-3 text-sm font-semibold no-underline text-[#60718f]"
                >
                  Cancel
                </Link>
              ) : null}
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  isUploading ||
                  !formState.databaseConfigured ||
                  formState.sections.length === 0
                }
                className="rounded-xl border border-[#2f6fe4] bg-[#2f6fe4] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isUploading
                  ? 'Uploading media...'
                  : isSubmitting
                    ? 'Saving...'
                    : 'Create test case'}
              </button>
            </div>
          </div>
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
      </div>
    </main>
  )
}
