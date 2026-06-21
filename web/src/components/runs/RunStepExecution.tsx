import { useState } from 'react'
import type { CaseStep } from '../../lib/caseContent'
import {
  STEP_RUN_STATUSES,
  type StepResult,
  type StepRunStatus,
} from '../../lib/stepRun'

type RunStepExecutionProps = {
  steps: CaseStep[]
  results: StepResult[]
  disabled: boolean
  onStepStatus: (stepIndex: number, status: StepRunStatus | null) => void
  onStepCommentSave: (stepIndex: number, comment: string) => void
}

const STATUS_ACTIVE_CLASS: Record<StepRunStatus, string> = {
  Passed: 'bg-[var(--tms-success)] text-white border-[var(--tms-success)]',
  Failed: 'bg-[var(--tms-danger)] text-white border-[var(--tms-danger)]',
  Blocked: 'bg-[var(--tms-warning)] text-white border-[var(--tms-warning)]',
  Skipped: 'bg-[var(--tms-text-muted)] text-white border-[var(--tms-text-muted)]',
}

function StepStatusButtons({
  value,
  disabled,
  onChange,
}: {
  value: StepRunStatus | null
  disabled: boolean
  onChange: (status: StepRunStatus | null) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {STEP_RUN_STATUSES.map((status) => {
        const isActive = value === status

        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange(isActive ? null : status)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? STATUS_ACTIVE_CLASS[status]
                : 'border-[var(--tms-border)] bg-[var(--tms-surface)] text-[var(--tms-text-muted)] hover:border-[var(--tms-text-muted)]'
            }`}
          >
            {status}
          </button>
        )
      })}
    </div>
  )
}

function StepRow({
  index,
  step,
  result,
  disabled,
  onStepStatus,
  onStepCommentSave,
}: {
  index: number
  step: CaseStep
  result: StepResult
  disabled: boolean
  onStepStatus: (stepIndex: number, status: StepRunStatus | null) => void
  onStepCommentSave: (stepIndex: number, comment: string) => void
}) {
  const [comment, setComment] = useState(result.comment)

  return (
    <li className="grid gap-3 rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--tms-primary)] text-xs font-semibold text-white">
          {index + 1}
        </span>
        <StepStatusButtons
          value={result.status}
          disabled={disabled}
          onChange={(status) => onStepStatus(index, status)}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--tms-text-muted)]">
            Action
          </div>
          <div className="whitespace-pre-wrap text-sm text-[var(--tms-text)]">
            {step.action || '-'}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--tms-text-muted)]">
            Expected
          </div>
          <div className="whitespace-pre-wrap text-sm text-[var(--tms-text-muted)]">
            {step.expected || '-'}
          </div>
        </div>
      </div>

      <textarea
        className="tms-textarea min-h-[2.5rem] px-3 py-2 text-sm"
        rows={1}
        placeholder="Add a note for this step (optional)"
        value={comment}
        disabled={disabled}
        onChange={(event) => setComment(event.target.value)}
        onBlur={() => {
          if (comment !== result.comment) {
            onStepCommentSave(index, comment)
          }
        }}
      />
    </li>
  )
}

export function RunStepExecution({
  steps,
  results,
  disabled,
  onStepStatus,
  onStepCommentSave,
}: RunStepExecutionProps) {
  if (steps.length === 0) {
    return (
      <p className="run-execution-preview-panel__empty">
        This case has no structured steps.
      </p>
    )
  }

  return (
    <ol className="m-0 grid list-none gap-2 p-0">
      {steps.map((step, index) => (
        <StepRow
          key={index}
          index={index}
          step={step}
          result={results[index] ?? { status: null, comment: '' }}
          disabled={disabled}
          onStepStatus={onStepStatus}
          onStepCommentSave={onStepCommentSave}
        />
      ))}
    </ol>
  )
}
