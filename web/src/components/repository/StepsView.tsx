import type { MouseEventHandler } from 'react'
import { WorkspaceSectionHeader } from '../layout/WorkspaceSectionHeader'
import { parseCaseContent } from '../../lib/caseContent'
import { sanitizeHtml } from '../../lib/sanitize-html'

type StepsViewProps = {
  steps: string | null
  expected: string | null
  onMediaClick?: MouseEventHandler<HTMLElement>
}

function RichBlock({
  title,
  html,
  onMediaClick,
}: {
  title: string
  html: string
  onMediaClick?: MouseEventHandler<HTMLElement>
}) {
  return (
    <section className="test-detail-rich-block">
      <WorkspaceSectionHeader
        dense
        title={title}
        className="test-detail-rich-block__header"
      />
      <div
        className="test-detail-rich-block__body rich-output prose prose-sm max-w-none text-[var(--tms-text)]"
        onClick={onMediaClick}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html || '<p>-</p>') }}
      />
    </section>
  )
}

export function StepsView({ steps, expected, onMediaClick }: StepsViewProps) {
  const content = parseCaseContent(steps, expected)

  if (!content.isStructured) {
    return (
      <>
        <RichBlock
          title="Steps"
          html={content.description}
          onMediaClick={onMediaClick}
        />
        <RichBlock
          title="Expected result"
          html={content.legacyExpected}
          onMediaClick={onMediaClick}
        />
      </>
    )
  }

  return (
    <>
      {content.description.trim() ? (
        <RichBlock
          title="Description"
          html={content.description}
          onMediaClick={onMediaClick}
        />
      ) : null}

      <section className="test-detail-rich-block">
        <WorkspaceSectionHeader
          dense
          title="Steps"
          className="test-detail-rich-block__header"
        />
        {content.steps.length === 0 ? (
          <p className="m-0 text-sm text-[var(--tms-text-muted)]">
            No steps yet.
          </p>
        ) : (
          <div className="grid gap-2">
            <div className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 text-xs font-semibold uppercase tracking-[0.06em] text-[var(--tms-text-muted)]">
              <span>#</span>
              <span>Action</span>
              <span>Expected</span>
            </div>
            <ol className="m-0 grid list-none gap-2 p-0">
              {content.steps.map((step, index) => (
                <li
                  key={index}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-3"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--tms-primary)] text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="whitespace-pre-wrap text-sm text-[var(--tms-text)]">
                    {step.action || '-'}
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-[var(--tms-text-muted)]">
                    {step.expected || '-'}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </section>
    </>
  )
}
