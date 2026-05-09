import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { EditingFieldGroup, EditingSurfaceSection } from '../components/layout/EditingSurface'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SelectMenu } from '../components/ui/SelectMenu'
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
    <main className="min-h-[calc(100vh-65px)] bg-[var(--tms-bg)]">
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--tms-text-muted)]">
              <Link to="/" className="no-underline text-[var(--tms-primary)]">
                Workspace
              </Link>
              <span>/</span>
              <span>{selectedSection?.projectName ?? 'Project'}</span>
              <span>/</span>
              <span>{selectedSection?.name ?? 'Suite'}</span>
              <span>/</span>
              <span>Case #{formState.test.id}</span>
            </div>
            <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--tms-text)] sm:text-4xl">
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
            className="tms-panel p-4 sm:p-6"
            onSubmit={handleSubmit}
          >
            <EditingSurfaceSection
              title="Case details"
              description="Update suite placement, metadata, and rich content for this test case."
            >
            <EditingFieldGroup label="Test case title">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                size="lg"
                placeholder="Verify order cancellation"
              />
            </EditingFieldGroup>

            <div className="editing-field-grid editing-field-grid--metadata">
              <EditingFieldGroup label="Test suite">
                <SelectMenu
                  value={sectionId}
                  onValueChange={setSectionId}
                  options={formState.sections.map((section) => ({
                    value: section.id.toString(),
                    label: section.projectName
                        ? `${section.projectName} / ${section.name}`
                        : section.name,
                  }))}
                  className="w-full px-4 py-3 text-base"
                  aria-label="Choose test suite"
                />
              </EditingFieldGroup>

              <EditingFieldGroup label="Status">
                <SelectMenu
                  value={status}
                  onValueChange={(value) =>
                    setStatus(
                      value === 'Ready'
                        ? 'Ready'
                        : value === 'Archived'
                          ? 'Archived'
                          : 'Draft',
                    )
                  }
                  options={[
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Ready', label: 'Ready' },
                    { value: 'Archived', label: 'Archived' },
                  ]}
                  className="w-full px-4 py-3 text-base"
                  aria-label="Choose case status"
                />
              </EditingFieldGroup>

              <EditingFieldGroup label="Priority">
                <SelectMenu
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(
                      value === 'Low'
                        ? 'Low'
                        : value === 'High'
                          ? 'High'
                          : value === 'Critical'
                            ? 'Critical'
                            : 'Medium',
                    )
                  }
                  options={[
                    { value: 'Low', label: 'Low' },
                    { value: 'Medium', label: 'Medium' },
                    { value: 'High', label: 'High' },
                    { value: 'Critical', label: 'Critical' },
                  ]}
                  className="w-full px-4 py-3 text-base"
                  aria-label="Choose case priority"
                />
              </EditingFieldGroup>

              <EditingFieldGroup label="Type">
                <SelectMenu
                  value={caseType}
                  onValueChange={(value) =>
                    setCaseType(
                      value === 'Regression'
                        ? 'Regression'
                        : value === 'Smoke'
                          ? 'Smoke'
                          : value === 'E2E'
                            ? 'E2E'
                            : value === 'UI'
                              ? 'UI'
                              : value === 'API'
                                ? 'API'
                                : 'Functional',
                    )
                  }
                  options={[
                    { value: 'Functional', label: 'Functional' },
                    { value: 'Regression', label: 'Regression' },
                    { value: 'Smoke', label: 'Smoke' },
                    { value: 'E2E', label: 'E2E' },
                    { value: 'UI', label: 'UI' },
                    { value: 'API', label: 'API' },
                  ]}
                  className="w-full px-4 py-3 text-base"
                  aria-label="Choose case type"
                />
              </EditingFieldGroup>
            </div>
            </EditingSurfaceSection>

            <EditingSurfaceSection
              title="Content"
              description="Edit steps and expected result with inline attachments."
              className="mt-5"
              bodyClassName="editing-rich-stack"
            >
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
            </EditingSurfaceSection>

            {errorMessage ? (
              <Alert variant="danger" className="mt-5">
                {errorMessage}
              </Alert>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tms-border-subtle)] pt-5">
              <div className="text-sm font-semibold text-[var(--tms-text-muted)]">
                {selectedSection
                  ? `${selectedSection.projectName ?? 'Project'} / ${selectedSection.name}`
                  : 'Choose a suite for this case.'}
              </div>
              <div className="workspace-secondary-actions create-edit-actions">
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
