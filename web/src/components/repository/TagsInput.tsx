import { useState } from 'react'
import { X } from 'lucide-react'
import { useT } from '../../lib/i18n'

type TagsInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagsInput({ value, onChange, placeholder }: TagsInputProps) {
  const t = useT()

  const [draft, setDraft] = useState('')

  function addTag(raw: string): void {
    const clean = raw.trim().replace(/,+$/, '').trim()

    if (!clean) {
      return
    }

    if (value.some((tag) => tag.toLowerCase() === clean.toLowerCase())) {
      setDraft('')
      return
    }

    onChange([...value, clean])
    setDraft('')
  }

  function removeTag(index: number): void {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="tms-input flex min-h-10 flex-wrap items-center gap-1.5 px-2 py-1.5">
      {value.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--tms-primary-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--tms-primary)]"
        >
          {tag}
          <button
            type="button"
            aria-label={t('Remove tag {tag}', { tag })}
            onClick={() => removeTag(index)}
            className="flex items-center text-[var(--tms-primary)] hover:opacity-70"
          >
            <X size={12} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        className="min-w-[8rem] flex-1 border-0 bg-transparent p-1 text-sm outline-none"
        value={draft}
        placeholder={value.length === 0 ? (placeholder ?? t('Add tags…')) : ''}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault()
            addTag(draft)
          } else if (event.key === 'Backspace' && draft === '' && value.length) {
            removeTag(value.length - 1)
          }
        }}
        onBlur={() => addTag(draft)}
      />
    </div>
  )
}
