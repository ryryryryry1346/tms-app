import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { RichTextEditor } from '../components/RichTextEditor'
import { StepsEditor } from '../components/repository/StepsEditor'
import { TagsInput } from '../components/repository/TagsInput'
import { RefsEditor } from '../components/repository/RefsEditor'
import { EditingFieldGroup, EditingSurfaceSection } from '../components/layout/EditingSurface'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { SelectMenu } from '../components/ui/SelectMenu'
import { uploadTestMedia } from '../features/media/server'
import { getEditTestFormState, updateTestCase } from '../features/tests/server'
import { markRepositoryPreviewDetailStale } from '../lib/repositoryPreviewCache'
import {
  caseContentForEditing,
  serializeCaseContent,
  type CaseStep,
} from '../lib/caseContent'
import {
  parseRefs,
  parseTags,
  serializeRefs,
  serializeTags,
  type CaseRef,
} from '../lib/caseFields'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

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

function EditTestPage() {
  const t = useT()

  const formState = Route.useLoaderData()
  const navigate = useNavigate()

  const [title, setTitle] = useState(formState.test.title)
  const [sectionId, setSectionId] = useState(formState.test.sectionId.toString())
  const [status, setStatus] = useState<'Draft' | 'Ready' | 'Archived'>(
    formState.test.status,
  )
  const [priority, setPriority] = useState(formState.test.priority)
  const [caseType, setCaseType] = useState(formState.test.caseType)
  const initialContent = caseContentForEditing(
    formState.test.steps,
    formState.test.expected,
  )
  const [description, setDescription] = useState(initialContent.description)
  const [steps, setSteps] = useState<CaseStep[]>(initialContent.steps)
  const [preconditions, setPreconditions] = useState(
    formState.test.preconditions ?? '',
  )
  const [tags, setTags] = useState<string[]>(parseTags(formState.test.tags))
  const [refs, setRefs] = useState<CaseRef[]>(parseRefs(formState.test.refs))
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const isUploading = isUploadingMedia

  const selectedSection =
    formState.sections.find((section) => section.id.toString() === sectionId) ?? null
  const selectedProjectSlug = selectedSection?.projectSlug ?? null

  async function uploadMedia(file: File): Promise<string> {
    setErrorMessage(null)
    setIsUploadingMedia(true)

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
      setIsUploadingMedia(false)
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
          steps: serializeCaseContent(description, steps),
          expected: '',
          preconditions,
          tags: serializeTags(tags),
          refs: serializeRefs(refs),
        },
      })

      markRepositoryPreviewDetailStale(formState.test.id)
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
              <Link to="/" className="no-underline text-[var(--tms-primary)]">{t('Workspace')}</Link>
              <span>/</span>
              <span>{selectedSection?.projectName ?? t('Project')}</span>
              <span>/</span>
              <span>{selectedSection?.name ?? t('Suite')}</span>
              <span>/</span>
              <span>{t('Case #{id}', { id: formState.test.id })}</span>
            </div>
            <h1 className="m-0 text-3xl font-bold tracking-tight text-[var(--tms-text)] sm:text-4xl">{t('Edit Test Case')}</h1>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedProjectSlug ? (
              <Link
                to="/project/$projectSlug/repository"
                params={{ projectSlug: selectedProjectSlug }}
                className="tms-button no-underline hover:text-[var(--tms-primary)]"
              >{t('Repository')}</Link>
            ) : null}
            <Link
              to="/test/$testId"
              params={{ testId: formState.test.id.toString() }}
              className="tms-button no-underline hover:text-[var(--tms-primary)]"
            >{t('View case')}</Link>
          </div>
        </section>

        <section>
          <form
            className="tms-panel p-4 sm:p-6"
            onSubmit={handleSubmit}
          >
            <EditingSurfaceSection
              title={t('Case details')}
              description={t('Update suite placement, metadata, and rich content for this test case.')}
            >
            <EditingFieldGroup label={t('Test case title')}>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                size="lg"
                placeholder={t('Verify order cancellation')}
              />
            </EditingFieldGroup>

            <div className="editing-field-grid editing-field-grid--metadata">
              <EditingFieldGroup label={t('Test suite')}>
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
                  aria-label={t('Choose test suite')}
                />
              </EditingFieldGroup>

              <EditingFieldGroup label={t('Status')}>
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
                    { value: 'Draft', label: t('Draft') },
                    { value: 'Ready', label: t('Ready') },
                    { value: 'Archived', label: t('Archived') },
                  ]}
                  className="w-full px-4 py-3 text-base"
                  aria-label={t('Choose case status')}
                />
              </EditingFieldGroup>

              <EditingFieldGroup label={t('Priority')}>
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
                    { value: 'Low', label: t('Low') },
                    { value: 'Medium', label: t('Medium') },
                    { value: 'High', label: t('High') },
                    { value: 'Critical', label: t('Critical') },
                  ]}
                  className="w-full px-4 py-3 text-base"
                  aria-label={t('Choose case priority')}
                />
              </EditingFieldGroup>

              <EditingFieldGroup label={t('Type')}>
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
                    { value: 'Functional', label: t('Functional') },
                    { value: 'Regression', label: t('Regression') },
                    { value: 'Smoke', label: t('Smoke') },
                    { value: 'E2E', label: 'E2E' },
                    { value: 'UI', label: t('UI') },
                    { value: 'API', label: t('API') },
                  ]}
                  className="w-full px-4 py-3 text-base"
                  aria-label={t('Choose case type')}
                />
              </EditingFieldGroup>
            </div>

            <div className="editing-field-grid">
              <EditingFieldGroup label={t('Tags')}>
                <TagsInput value={tags} onChange={setTags} />
              </EditingFieldGroup>
            </div>

            <EditingFieldGroup label={t('References')}>
              <RefsEditor value={refs} onChange={setRefs} />
            </EditingFieldGroup>
            </EditingSurfaceSection>

            <EditingSurfaceSection
              title={t('Content')}
              description={t('Edit preconditions, steps, and expected result with inline attachments.')}
              className="mt-5"
              bodyClassName="editing-rich-stack"
            >
              <RichTextEditor
                label={t('Preconditions')}
                placeholder={t('State setup, data, or environment required before running')}
                value={preconditions}
                onChange={setPreconditions}
                onUploadMedia={uploadMedia}
                isUploading={isUploadingMedia}
              />

              <StepsEditor
                description={description}
                steps={steps}
                onDescriptionChange={setDescription}
                onStepsChange={setSteps}
                onUploadMedia={uploadMedia}
                isUploadingMedia={isUploadingMedia}
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
                  : t('Choose a suite for this case.')}
              </div>
              <div className="workspace-secondary-actions create-edit-actions">
                <Link
                  to="/test/$testId"
                  params={{ testId: formState.test.id.toString() }}
                  className="tms-button no-underline"
                >{t('Cancel')}</Link>
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
                    ? t('Uploading media...')
                    : isSubmitting
                      ? t('Saving...')
                      : t('Save changes')}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
