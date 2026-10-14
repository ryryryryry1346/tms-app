import type { MouseEventHandler } from 'react'
import { ExternalLink } from 'lucide-react'
import { WorkspaceSectionHeader } from '../layout/WorkspaceSectionHeader'
import { parseRefs, parseTags } from '../../lib/caseFields'
import { sanitizeHtml } from '../../lib/sanitize-html'
import { useT } from '../../lib/i18n'

export function PreconditionsBlock({
  html,
  onMediaClick,
}: {
  html: string | null | undefined
  onMediaClick?: MouseEventHandler<HTMLElement>
}) {
  const t = useT()

  if (!html || !html.trim()) {
    return null
  }

  return (
    <section className="test-detail-rich-block">
      <WorkspaceSectionHeader
        dense
        title={t('Preconditions')}
        className="test-detail-rich-block__header"
      />
      <div
        className="test-detail-rich-block__body rich-output prose prose-sm max-w-none text-[var(--tms-text)]"
        onClick={onMediaClick}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }}
      />
    </section>
  )
}

export function CaseTags({
  tags,
  onSelect,
}: {
  tags: string | null | undefined
  onSelect?: (tag: string) => void
}) {
  const t = useT()

  const parsed = parseTags(tags)

  if (parsed.length === 0) {
    return null
  }

  const className =
    'inline-flex items-center rounded-md bg-[var(--tms-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--tms-primary)]'

  return (
    <div className="flex flex-wrap gap-1.5">
      {parsed.map((tag) =>
        onSelect ? (
          <button
            key={tag}
            type="button"
            onClick={() => onSelect(tag)}
            className={`${className} hover:opacity-80`}
            title={t('Filter by tag "{tag}"', { tag })}
          >
            {tag}
          </button>
        ) : (
          <span key={tag} className={className}>
            {tag}
          </span>
        ),
      )}
    </div>
  )
}

export function CaseRefsList({ refs }: { refs: string | null | undefined }) {
  const t = useT()

  const parsed = parseRefs(refs)

  if (parsed.length === 0) {
    return null
  }

  return (
    <section className="mt-6 border-t border-[var(--tms-border-subtle)] pt-5">
      <WorkspaceSectionHeader dense title={t('References')} className="mb-3" />
      <ul className="m-0 grid list-none gap-1.5 p-0">
        {parsed.map((ref, index) => (
          <li key={`${ref.url}-${index}`}>
            <a
              href={ref.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--tms-primary)] no-underline hover:underline"
            >
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
              {ref.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
