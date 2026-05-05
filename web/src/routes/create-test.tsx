import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { RichTextEditor } from '../components/RichTextEditor'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { Select } from '../components/ui/Select'
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
            className="tms-button no-underline hover:text-[var(--tms-primary)]"
          >
            Back to repository
          </Link>
        ) : null}
      </section>

      <section>
        <form
          className="tms-panel p-6"
          onSubmit={handleSubmit}
        >
          <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
            Test case title
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              size="lg"
              placeholder="Verify order cancellation"
            />
          </label>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px_180px_190px]">
            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Test suite
              <Select
                value={sectionId}
                onChange={(event) => setSectionId(event.target.value)}
                size="lg"
              >
                {formState.sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.projectName
                      ? `${section.projectName} / ${section.name}`
                    : section.name}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Status
              <Select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value === 'Ready' ? 'Ready' : 'Draft')
                }
                size="lg"
              >
                <option value="Draft">Draft</option>
                <option value="Ready">Ready</option>
              </Select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Priority
              <Select
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
                size="lg"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#1b2f5b]">
              Type
              <Select
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
                size="lg"
              >
                <option value="Functional">Functional</option>
                <option value="Regression">Regression</option>
                <option value="Smoke">Smoke</option>
                <option value="E2E">E2E</option>
                <option value="UI">UI</option>
                <option value="API">API</option>
              </Select>
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
                  className="tms-button no-underline"
                >
                  Cancel
                </Link>
              ) : null}
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  isUploading ||
                  !formState.databaseConfigured ||
                  formState.sections.length === 0
                }
                variant="primary"
              >
                {isUploading
                  ? 'Uploading media...'
                  : isSubmitting
                    ? 'Saving...'
                    : 'Create test case'}
              </Button>
            </div>
          </div>
        </form>
      </section>

      {!formState.databaseConfigured ? (
        <Panel className="mx-auto mt-5 max-w-5xl border-amber-300/60 bg-amber-100/70 p-6 text-sm text-amber-950">
          <strong>Database is not configured yet.</strong> Set
          <code> MYSQL_DATABASE_URL </code>
          and run the Drizzle migration first.
        </Panel>
      ) : formState.sections.length === 0 ? (
        <Panel className="mx-auto mt-5 max-w-5xl p-6 text-sm text-[var(--sea-ink-soft)]">
          There are no suites in MySQL yet, so test case creation is blocked
          until suite management is added.
        </Panel>
      ) : null}
      </div>
    </main>
  )
}
