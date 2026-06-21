import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { RichTextEditor } from '../RichTextEditor'
import { Button } from '../ui/Button'
import { Textarea } from '../ui/Textarea'
import type { CaseStep } from '../../lib/caseContent'

type StepsEditorProps = {
  description: string
  steps: CaseStep[]
  onDescriptionChange: (value: string) => void
  onStepsChange: (steps: CaseStep[]) => void
  onUploadMedia: (file: File) => Promise<string>
  isUploadingMedia: boolean
}

export function StepsEditor({
  description,
  steps,
  onDescriptionChange,
  onStepsChange,
  onUploadMedia,
  isUploadingMedia,
}: StepsEditorProps) {
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
    <div className="grid gap-5">
      <RichTextEditor
        label="Description"
        placeholder="Optional context, preconditions, or attachments"
        value={description}
        onChange={onDescriptionChange}
        onUploadMedia={onUploadMedia}
        isUploading={isUploadingMedia}
      />

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--tms-text)]">
            Steps
          </span>
          <Button type="button" size="sm" variant="secondary" onClick={addStep}>
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            Add step
          </Button>
        </div>

        {steps.length === 0 ? (
          <p className="m-0 rounded-xl border border-dashed border-[var(--tms-border)] p-4 text-sm text-[var(--tms-text-muted)]">
            No steps yet. Add a step with an action and its expected result.
          </p>
        ) : (
          steps.map((step, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--tms-primary)] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label="Move step up"
                    disabled={index === 0}
                    onClick={() => moveStep(index, -1)}
                  >
                    <ArrowUp size={14} strokeWidth={2} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    aria-label="Move step down"
                    disabled={index === steps.length - 1}
                    onClick={() => moveStep(index, 1)}
                  >
                    <ArrowDown size={14} strokeWidth={2} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    aria-label="Remove step"
                    onClick={() => removeStep(index)}
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-[var(--tms-text-muted)]">
                    Action
                  </span>
                  <Textarea
                    value={step.action}
                    onChange={(event) =>
                      updateStep(index, 'action', event.target.value)
                    }
                    rows={2}
                    placeholder="Describe the action"
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-medium text-[var(--tms-text-muted)]">
                    Expected
                  </span>
                  <Textarea
                    value={step.expected}
                    onChange={(event) =>
                      updateStep(index, 'expected', event.target.value)
                    }
                    rows={2}
                    placeholder="Expected result"
                  />
                </label>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
