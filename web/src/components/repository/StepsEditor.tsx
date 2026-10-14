import { ArrowDown, ArrowUp, Copy, Plus, Trash2 } from 'lucide-react'
import { RichTextEditor } from '../RichTextEditor'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import type { CaseStep } from '../../lib/caseContent'
import { useT } from '../../lib/i18n'

type StepsEditorProps = {
  /** When provided, a Preconditions editor is shown above the description. */
  preconditions?: string
  onPreconditionsChange?: (value: string) => void
  description: string
  steps: CaseStep[]
  onDescriptionChange: (value: string) => void
  onStepsChange: (steps: CaseStep[]) => void
  onUploadMedia: (file: File) => Promise<string>
  isUploadingMedia: boolean
  descriptionMinHeightClassName?: string
  /** Render only the steps list; the caller renders the description itself. */
  hideDescription?: boolean
}

function pluralizeSteps(count: number): string {
  return `${count} step${count === 1 ? '' : 's'}`
}

export function StepsEditor({
  preconditions,
  onPreconditionsChange,
  description,
  steps,
  onDescriptionChange,
  onStepsChange,
  onUploadMedia,
  isUploadingMedia,
  descriptionMinHeightClassName,
  hideDescription = false,
}: StepsEditorProps) {
  const t = useT()

  function updateStep(
    index: number,
    field: keyof CaseStep,
    value: string,
  ): void {
    onStepsChange(
      steps.map((step, i) => (i === index ? { ...step, [field]: value } : step)),
    )
  }

  function addStep(): void {
    onStepsChange([...steps, { action: '', expected: '' }])
  }

  function duplicateStep(index: number): void {
    const next = [...steps]
    next.splice(index + 1, 0, { ...steps[index] })
    onStepsChange(next)
  }

  function removeStep(index: number): void {
    onStepsChange(steps.filter((_, i) => i !== index))
  }

  function moveStep(index: number, direction: -1 | 1): void {
    const target = index + direction

    if (target < 0 || target >= steps.length) {
      return
    }

    const next = [...steps]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onStepsChange(next)
  }

  return (
    <div className="case-steps-editor grid gap-5">
      {preconditions !== undefined && onPreconditionsChange ? (
        <RichTextEditor
          label={t('Preconditions')}
          placeholder={t('State setup, data, or environment required before running')}
          value={preconditions}
          onChange={onPreconditionsChange}
          onUploadMedia={onUploadMedia}
          isUploading={isUploadingMedia}
          minHeightClassName="min-h-20"
        />
      ) : null}
      {hideDescription ? null : (
        <RichTextEditor
          label={t('Description')}
          placeholder={t('Optional context, preconditions, or attachments')}
          value={description}
          onChange={onDescriptionChange}
          onUploadMedia={onUploadMedia}
          isUploading={isUploadingMedia}
          minHeightClassName={descriptionMinHeightClassName}
        />
      )}

      <div className="case-steps">
        <div className="case-steps__head">
          <span className="case-steps__title">{t('Steps')}</span>
          <span className="case-steps__count">
            {steps.length === 0 ? t('none yet') : pluralizeSteps(steps.length)}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="case-steps__add"
            onClick={addStep}
          >
            <Plus size={14} strokeWidth={2} aria-hidden="true" />{t('Add step')}</Button>
        </div>

        {steps.map((step, index) => (
          <div key={index} className="case-step">
            <span className="case-step__num">{index + 1}</span>
            <label className="case-step__field">
              <span className="case-step__label">{t('Action')}</span>
              <Textarea
                value={step.action}
                onChange={(event) =>
                  updateStep(index, 'action', event.target.value)
                }
                rows={2}
                placeholder={t('What to do')}
              />
            </label>
            <label className="case-step__field">
              <span className="case-step__label">{t('Expected result')}</span>
              <Textarea
                value={step.expected}
                onChange={(event) =>
                  updateStep(index, 'expected', event.target.value)
                }
                rows={2}
                placeholder={t('What should happen')}
              />
            </label>
            <div className="case-step__actions">
              <button
                type="button"
                className="case-step__icon"
                aria-label={t('Move step up')}
                disabled={index === 0}
                onClick={() => moveStep(index, -1)}
              >
                <ArrowUp size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="case-step__icon"
                aria-label={t('Move step down')}
                disabled={index === steps.length - 1}
                onClick={() => moveStep(index, 1)}
              >
                <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="case-step__icon"
                aria-label={t('Duplicate step')}
                onClick={() => duplicateStep(index)}
              >
                <Copy size={14} strokeWidth={2} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="case-step__icon case-step__icon--danger"
                aria-label={t('Delete step')}
                onClick={() => removeStep(index)}
              >
                <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        {steps.length > 0 ? (
          <button type="button" className="case-steps__add-line" onClick={addStep}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" />{t('Add step')}</button>
        ) : null}
      </div>
    </div>
  )
}
