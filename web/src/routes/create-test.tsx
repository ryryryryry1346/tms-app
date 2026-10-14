import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { RichTextEditor } from '../components/RichTextEditor'
import { StepsEditor } from '../components/repository/StepsEditor'
import { TagsInput } from '../components/repository/TagsInput'
import { RefsEditor } from '../components/repository/RefsEditor'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { SelectMenu } from '../components/ui/SelectMenu'
import { cx } from '../components/ui/utils'
import { uploadTestMedia } from '../features/media/server'
import {
  createTestCase,
  getCreateTestFormState,
} from '../features/tests/server'
import { serializeCaseContent, type CaseStep } from '../lib/caseContent'
import {
  serializeRefs,
  serializeTags,
  type CaseRef,
} from '../lib/caseFields'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

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

function RequiredMark() {
  return (
    <span className="text-[var(--tms-danger)]" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

function CreateTestPage() {
  const t = useT()

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
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<CaseStep[]>([])
  const [preconditions, setPreconditions] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [refs, setRefs] = useState<CaseRef[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingMedia, setIsUploadingMedia] = useState(false)
  const isUploading = isUploadingMedia
  const selectedSection =
    formState.sections.find((section) => section.id.toString() === sectionId) ??
    null
  const selectedProjectSlug = selectedSection?.projectSlug ?? null
  const trimmedTitle = title.trim()
  const canSubmit =
    Boolean(trimmedTitle) &&
    Boolean(sectionId) &&
    formState.databaseConfigured &&
    formState.sections.length > 0

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

    if (!canSubmit) {
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const result = await createTestCase({
        data: {
          title: trimmedTitle,
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

  const isDirty =
    title.trim() !== '' ||
    preconditions.trim() !== '' ||
    description.trim() !== '' ||
    steps.length > 0 ||
    tags.length > 0 ||
    refs.length > 0

  function handleFormKeyDown(event: React.KeyboardEvent<HTMLFormElement>): void {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      event.currentTarget.requestSubmit()
    }
  }

  return (
    <main className="case-form-page">
      <form
        className="case-form"
        onSubmit={handleSubmit}
        onKeyDown={handleFormKeyDown}
      >
        <div className="case-bar">
          <div className="case-bar__inner">
            <nav className="case-crumbs" aria-label={t('Navigation')}>
              {selectedProjectSlug ? (
                <Link
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug: selectedProjectSlug }}
                >{t('Repository')}</Link>
              ) : (
                <span>{t('Repository')}</span>
              )}
              <ChevronRight size={13} aria-hidden="true" />
              <span className="case-crumbs__suite">
                {selectedSection?.name ?? t('Choose a suite')}
              </span>
              <ChevronRight size={13} aria-hidden="true" />
              <strong>{t('New case')}</strong>
            </nav>
            <div className="case-bar__actions">
              {isDirty ? (
                <span className="case-dirty">{t('You have unsaved changes')}</span>
              ) : null}
              {selectedProjectSlug ? (
                <Link
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug: selectedProjectSlug }}
                  className="tms-button no-underline"
                >{t('Cancel')}</Link>
              ) : null}
              <Button
                type="submit"
                disabled={isSubmitting || isUploading || !canSubmit}
                variant="primary"
              >
                {isUploading
                  ? t('Uploading media…')
                  : isSubmitting
                    ? t('Saving…')
                    : t('Create case')}
                <kbd className="case-kbd">{t('Ctrl ⏎')}</kbd>
              </Button>
            </div>
          </div>
        </div>

        <div className="case-body">
          {errorMessage ? <Alert variant="danger">{errorMessage}</Alert> : null}

          <input
            className="case-title-input"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t('Case title, e.g. “Checkout with card payment”')}
            aria-label={t('Case title')}
            aria-required="true"
            autoFocus
          />

          <section className="case-card case-props" aria-label={t('Case properties')}>
            <div className="case-field case-field--suite">
              <span className="case-field__label">{t('Suite')}<RequiredMark />
              </span>
              <SelectMenu
                value={sectionId}
                onValueChange={setSectionId}
                options={formState.sections.map((section) => ({
                  value: section.id.toString(),
                  label: section.projectName
                    ? `${section.projectName} / ${section.name}`
                    : section.name,
                }))}
                className="test-detail-meta-select"
                aria-label={t('Choose a suite')}
              />
            </div>

            <div className="case-field">
              <span className="case-field__label">{t('Status')}</span>
              <div className="case-seg" role="group" aria-label={t('Case status')}>
                {(['Draft', 'Ready'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={cx(value === status && 'is-on')}
                    aria-pressed={value === status}
                    onClick={() => setStatus(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="case-field">
              <span className="case-field__label">{t('Priority')}</span>
              <div
                className="case-seg case-seg--priority"
                role="group"
                aria-label={t('Case priority')}
              >
                {(['Low', 'Medium', 'High', 'Critical'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    data-priority={value}
                    className={cx(value === priority && 'is-on')}
                    aria-pressed={value === priority}
                    onClick={() => setPriority(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div className="case-field">
              <span className="case-field__label">{t('Type')}</span>
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
                className="test-detail-meta-select"
                aria-label={t('Case type')}
              />
            </div>

            <div className="case-field case-field--tags">
              <span className="case-field__label">{t('Tags')}</span>
              <TagsInput
                value={tags}
                onChange={setTags}
                placeholder={t('Add a tag and press Enter')}
              />
            </div>
          </section>

          <section className="case-card">
            <div className="case-card__head">
              <h2>{t('Preconditions')}</h2>
              <span>{t('what must be ready before running')}</span>
            </div>
            <div className="case-card__body">
              <RichTextEditor
                label={t('Preconditions')}
                placeholder={t('Data, environment and system state before running')}
                value={preconditions}
                onChange={setPreconditions}
                onUploadMedia={uploadMedia}
                isUploading={isUploadingMedia}
                minHeightClassName="min-h-16"
              />
            </div>
          </section>

          <section className="case-card">
            <div className="case-card__head">
              <h2>{t('Description')}</h2>
              <span>{t('optional')}</span>
            </div>
            <div className="case-card__body">
              <RichTextEditor
                label={t('Description')}
                placeholder={t('What the case verifies and why it is needed')}
                value={description}
                onChange={setDescription}
                onUploadMedia={uploadMedia}
                isUploading={isUploadingMedia}
                minHeightClassName="min-h-16"
              />
            </div>
          </section>

          <section className="case-card">
            <div className="case-card__body case-card__body--steps">
              <StepsEditor
                description={description}
                steps={steps}
                onDescriptionChange={setDescription}
                onStepsChange={setSteps}
                onUploadMedia={uploadMedia}
                isUploadingMedia={isUploadingMedia}
                hideDescription
              />
            </div>
          </section>

          <section className="case-card">
            <div className="case-card__head">
              <h2>{t('Links')}</h2>
              <span>{t('requirements, tickets, Docs articles')}</span>
            </div>
            <div className="case-card__body">
              <RefsEditor value={refs} onChange={setRefs} />
            </div>
          </section>

          {!selectedSection ? (
            <p className="case-hint">{t('Choose a suite to create a case.')}</p>
          ) : null}

          {!formState.databaseConfigured ? (
            <Alert variant="warning" className="p-6">
              <strong>{t('Database is not configured yet.')}</strong>{' '}{t('Set')}<code>{' '}{t('MYSQL_DATABASE_URL')}{' '}</code>{t('and run the Drizzle migration first.')}</Alert>
          ) : formState.sections.length === 0 ? (
            <EmptyState
              title={t('No suites available')}
              description={t('There are no suites in MySQL yet, so test case creation is blocked until suite management is added.')}
            />
          ) : null}
        </div>
      </form>
    </main>
  )
}
