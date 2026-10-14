import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { StepsEditor } from './StepsEditor'
import { StepsView } from './StepsView'
import { CaseRefsList, CaseTags, PreconditionsBlock } from './CaseFieldsView'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmActionAlert } from '../ui/ConfirmActionAlert'
import { Panel } from '../ui/Panel'
import type { CaseStep } from '../../lib/caseContent'
import { useT } from '../../lib/i18n'

type PreviewCase = {
  id: number
  title: string
  steps: string | null
  expected: string | null
  preconditions?: string | null
  tags?: string | null
  refs?: string | null
  status: string | null
  priority: string | null
  caseType: string | null
}

type PreviewSuite = {
  name: string
} | null

type PreviewActivity = {
  id: number
  summary: string
  actorName: string | null
  action: string
  createdAt: string
}

type CasePreviewDrawerProps = {
  test: PreviewCase
  suite: PreviewSuite
  activities: PreviewActivity[]
  isLoadingContent: boolean
  errorMessage: string | null
  isEditingContent: boolean
  preconditionsValue: string
  descriptionValue: string
  stepsValue: CaseStep[]
  isSavingContent: boolean
  isUploadingMedia: boolean
  isPendingAction: boolean
  onClose: () => void
  onStartEdit: () => void
  onCancelEdit: () => void
  onSaveContent: () => void
  onPreconditionsChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onStepsChange: (steps: CaseStep[]) => void
  onUploadMedia: (file: File) => Promise<string>
  onRichContentClick: (event: React.MouseEvent<HTMLElement>) => void
  onRestore: () => void
  onArchive: () => void
  onSelectTag?: (tag: string) => void
  formatDateTime: (value: string | null | undefined) => string
}

function getPreviewStatusVariant(
  status: string | null,
): 'statusReady' | 'statusArchived' | 'statusDraft' {
  if (status === 'Ready') {
    return 'statusReady'
  }

  if (status === 'Archived') {
    return 'statusArchived'
  }

  return 'statusDraft'
}

function getPreviewPriorityVariant(
  priority: string | null,
):
  | 'priorityLow'
  | 'priorityMedium'
  | 'priorityHigh'
  | 'priorityCritical' {
  if (priority === 'Critical') {
    return 'priorityCritical'
  }

  if (priority === 'High') {
    return 'priorityHigh'
  }

  if (priority === 'Low') {
    return 'priorityLow'
  }

  return 'priorityMedium'
}

export function CasePreviewDrawer({
  test,
  suite,
  activities,
  isLoadingContent,
  errorMessage,
  isEditingContent,
  preconditionsValue,
  descriptionValue,
  stepsValue,
  isSavingContent,
  isUploadingMedia,
  isPendingAction,
  onClose,
  onStartEdit,
  onCancelEdit,
  onSaveContent,
  onPreconditionsChange,
  onDescriptionChange,
  onStepsChange,
  onUploadMedia,
  onRichContentClick,
  onRestore,
  onArchive,
  onSelectTag,
  formatDateTime,
}: CasePreviewDrawerProps) {
  const t = useT()

  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label={t('Close case preview')}
        onClick={onClose}
        className="absolute inset-0 bg-[var(--tms-backdrop)]"
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-full flex-col border-l border-[var(--tms-border)] bg-[var(--tms-surface)] shadow-[var(--tms-shadow-drawer)] sm:max-w-[560px]">
        <div className="border-b border-[var(--tms-border-subtle)] px-4 py-4 sm:px-6 sm:py-5">
          <div className="tms-transient-header">
            <div className="tms-transient-header__copy">
              <p className="tms-transient-header__eyebrow">{t('Case #{id}', { id: test.id })}</p>
              <h2 className="tms-transient-header__title">
                {test.title}
              </h2>
            </div>
            <div className="tms-transient-header__actions">
              <Button
                type="button"
                onClick={onClose}
                variant="secondary"
              >{t('Close')}</Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <Badge variant="primary">
              {suite?.name ?? t('No suite')}
            </Badge>
            <Badge variant={getPreviewStatusVariant(test.status)}>
              {test.status ?? t('Draft')}
            </Badge>
            <Badge variant={getPreviewPriorityVariant(test.priority)}>
              {test.priority ?? t('Medium')}
            </Badge>
            <Badge>
              {test.caseType ?? t('Functional')}
            </Badge>
          </div>
          <div className="mt-3">
            <CaseTags tags={test.tags} onSelect={onSelectTag} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {isEditingContent ? (
            <StepsEditor
              preconditions={preconditionsValue}
              onPreconditionsChange={onPreconditionsChange}
              description={descriptionValue}
              steps={stepsValue}
              onDescriptionChange={onDescriptionChange}
              onStepsChange={onStepsChange}
              onUploadMedia={onUploadMedia}
              isUploadingMedia={isUploadingMedia}
            />
          ) : isLoadingContent ? (
            <Panel className="rounded-xl border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-4 shadow-none">
              <p className="m-0 text-sm font-semibold text-[var(--tms-text-muted)]">{t('Loading test case content...')}</p>
            </Panel>
          ) : errorMessage ? (
            <Panel className="rounded-xl border-[var(--tms-danger-border)] bg-[var(--tms-danger-soft)] px-4 py-4 shadow-none">
              <p className="m-0 text-sm font-semibold text-[var(--tms-danger)]">
                {errorMessage}
              </p>
            </Panel>
          ) : (
            <>
              <div className="mb-5 grid gap-5">
                <PreconditionsBlock
                  html={test.preconditions}
                  onMediaClick={onRichContentClick}
                />
                <StepsView
                  steps={test.steps}
                  expected={test.expected}
                  onMediaClick={onRichContentClick}
                />
              </div>

              <CaseRefsList refs={test.refs} />

              <section className="mt-6 border-t border-[var(--tms-border-subtle)] pt-5">
                <h3 className="tms-kicker m-0 text-sm">{t('Activity')}</h3>
                {activities.length === 0 ? (
                  <p className="m-0 mt-3 text-sm text-[var(--tms-text-muted)]">{t('No activity recorded yet.')}</p>
                ) : (
                  <div className="mt-3 grid gap-3">
                    {activities.map((activity) => (
                      <Panel
                        key={activity.id}
                        className="rounded-xl border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-3 py-2 shadow-none"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[var(--tms-text)]">
                            {activity.summary}
                          </span>
                          <span className="text-xs font-semibold text-[var(--tms-text-soft)]">
                            {formatDateTime(activity.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-[var(--tms-text-muted)]">
                          {activity.actorName ?? 'system'} ·{' '}
                          {activity.action.replaceAll('_', ' ')}
                        </div>
                      </Panel>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="border-t border-[var(--tms-border-subtle)] px-4 py-4 sm:px-6">
          {showArchiveConfirm ? (
            <ConfirmActionAlert
              className="mb-3"
              title={t('Archive this test case?')}
              description={t('The case will leave the active repository and can be restored later from the Archived filter.')}
              confirmLabel={t('Archive test case')}
              pendingLabel={t('Archiving...')}
              confirmVariant="primary"
              isPending={isPendingAction}
              onCancel={() => setShowArchiveConfirm(false)}
              onConfirm={() => {
                onArchive()
                setShowArchiveConfirm(false)
              }}
            />
          ) : null}
          <div className="tms-transient-footer">
          {isEditingContent ? (
            <>
              <Button
                type="button"
                disabled={isSavingContent || isUploadingMedia}
                onClick={onSaveContent}
                variant="primary"
              >
                {isSavingContent ? t('Saving...') : t('Save content')}
              </Button>
              <Button
                type="button"
                disabled={isSavingContent}
                onClick={onCancelEdit}
                variant="secondary"
              >{t('Cancel')}</Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={onStartEdit}
              disabled={isLoadingContent || Boolean(errorMessage)}
              variant="primary"
            >{t('Edit content')}</Button>
          )}
          <Link
            to="/edit-test/$testId"
            params={{ testId: test.id.toString() }}
            className="tms-button tms-button-secondary no-underline"
          >{t('Full editor')}</Link>
          <Link
            to="/test/$testId"
            params={{ testId: test.id.toString() }}
            className="tms-button tms-button-secondary no-underline"
          >{t('Open full page')}</Link>
          {test.status === 'Archived' ? (
            <Button
              type="button"
              disabled={isPendingAction}
              onClick={onRestore}
              variant="secondary"
            >{t('Restore')}</Button>
          ) : (
            <Button
              type="button"
              disabled={isPendingAction}
              onClick={() => setShowArchiveConfirm(true)}
              variant="secondary"
            >{t('Archive')}</Button>
          )}
          </div>
        </div>
      </aside>
    </div>
  )
}
