import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
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
  const [status, setStatus] = useState<'Draft' | 'Ready' | 'Archived'>(
    formState.test.status,
  )
  const [priority, setPriority] = useState(formState.test.priority)
  const [caseType, setCaseType] = useState(formState.test.caseType)
  const [steps, setSteps] = useState(formState.test.steps)
  const [expected, setExpected] = useState(formState.test.expected)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const selectedSection =
    formState.sections.find((section) => section.id.toString() === sectionId) ?? null
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
      const result = await updateTestCase({
        data: {
          id: formState.test.id,
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
      const message = getErrorMessage(error, 'Failed to update test case.')
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f9fe]">
      <div className="mx-auto max-w-[1180px] px-6 py-8">
        <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#60718f]">
              <Link to="/" className="no-underline text-[#2f6fe4]">
                Workspace
              </Link>
              <span>/</span>
              <span>{selectedSection?.projectName ?? 'Project'}</span>
              <span>/</span>
              <span>{selectedSection?.name ?? 'Suite'}</span>
              <span>/</span>
              <span>Case #{formState.test.id}</span>
            </div>
            <h1 className="m-0 text-4xl font-bold tracking-tight text-[#1b2f5b]">
              Edit Test Case
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedProjectSlug ? (
              <Link
                to="/project/$projectSlug/repository"
                params={{ projectSlug: selectedProjectSlug }}
                className="tms-button no-underline hover:text-[var(--tms-primary)]"
              >
                Repository
              </Link>
            ) : null}
            <Link
              to="/test/$testId"
              params={{ testId: formState.test.id.toString() }}
              className="tms-button no-underline hover:text-[var(--tms-primary)]"
            >
              View case
            </Link>
          </div>
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
                    setStatus(
                      event.target.value === 'Ready'
                        ? 'Ready'
                        : event.target.value === 'Archived'
                          ? 'Archived'
                          : 'Draft',
                    )
                  }
                  size="lg"
                >
                  <option value="Draft">Draft</option>
                  <option value="Ready">Ready</option>
                  <option value="Archived">Archived</option>
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
                  : 'Choose a suite for this case.'}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/test/$testId"
                  params={{ testId: formState.test.id.toString() }}
                  className="tms-button no-underline"
                >
                  Cancel
                </Link>
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
                      : 'Save changes'}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
