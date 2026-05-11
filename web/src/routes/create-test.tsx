import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { z } from 'zod'
import { RichTextEditor } from '../components/RichTextEditor'
import { EditingFieldGroup, EditingSurfaceSection } from '../components/layout/EditingSurface'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { SelectMenu } from '../components/ui/SelectMenu'
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
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) =>
    getCreateTestFormState({
      data: {
        projectId: deps.projectId,
      },
    }),
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
    <main className="min-h-[calc(100vh-65px)] bg-[var(--tms-bg)]">
      <div className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
      <section className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-[var(--tms-text-muted)]">
            <Link to="/" className="no-underline text-[var(--tms-primary)]">
              Workspace
            </Link>
            <span>/</span>
            <span>{selectedSection?.projectName ?? 'Project'}</span>
            <span>/</span>
            <span>{selectedSection?.name ?? 'Suite'}</span>
          </div>
          <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--tms-text)] sm:text-4xl">
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
          className="tms-panel p-4 sm:p-6"
          onSubmit={handleSubmit}
        >
          <EditingSurfaceSection
            title="Case details"
            description="Define the destination suite, metadata, and rich content for this new test case."
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
                  setStatus(value === 'Ready' ? 'Ready' : 'Draft')
                }
                options={[
                  { value: 'Draft', label: 'Draft' },
                  { value: 'Ready', label: 'Ready' },
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
            description="Capture steps and expected result with inline attachments."
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
                : 'Choose a suite to create this case.'}
            </div>
            <div className="workspace-secondary-actions create-edit-actions">
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
        <Alert variant="warning" className="mx-auto mt-5 max-w-5xl p-6">
          <strong>Database is not configured yet.</strong> Set
          <code> MYSQL_DATABASE_URL </code>
          and run the Drizzle migration first.
        </Alert>
      ) : formState.sections.length === 0 ? (
        <EmptyState
          className="mx-auto mt-5 max-w-5xl"
          title="No suites available"
          description="There are no suites in MySQL yet, so test case creation is blocked until suite management is added."
        />
      ) : null}
      </div>
    </main>
  )
}
