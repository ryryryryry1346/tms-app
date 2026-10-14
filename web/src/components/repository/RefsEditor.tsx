import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { CaseRef } from '../../lib/caseFields'
import { useT } from '../../lib/i18n'

type RefsEditorProps = {
  value: CaseRef[]
  onChange: (refs: CaseRef[]) => void
}

export function RefsEditor({ value, onChange }: RefsEditorProps) {
  const t = useT()

  function update(index: number, field: keyof CaseRef, next: string): void {
    onChange(
      value.map((ref, i) => (i === index ? { ...ref, [field]: next } : ref)),
    )
  }

  function add(): void {
    onChange([...value, { label: '', url: '' }])
  }

  function remove(index: number): void {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="grid gap-2">
      {value.length === 0 ? (
        <p className="m-0 text-sm text-[var(--tms-text-muted)]">{t('No links yet.')}</p>
      ) : (
        value.map((ref, index) => (
          <div
            key={index}
            className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]"
          >
            <Input
              value={ref.label}
              placeholder={t('Title, e.g. BUG-123')}
              onChange={(event) => update(index, 'label', event.target.value)}
            />
            <Input
              value={ref.url}
              placeholder={t('https://…')}
              onChange={(event) => update(index, 'url', event.target.value)}
            />
            <Button
              type="button"
              size="sm"
              variant="danger"
              aria-label={t('Remove link')}
              onClick={() => remove(index)}
            >
              <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
            </Button>
          </div>
        ))
      )}
      <div>
        <Button type="button" size="sm" variant="secondary" onClick={add}>
          <Plus size={14} strokeWidth={2} aria-hidden="true" />{t('Add link')}</Button>
      </div>
    </div>
  )
}
