import { useEffect, useState } from 'react'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { Textarea } from '../ui/Textarea'
import { createShortcutStory } from '../../features/shortcut/server'
import { getErrorMessage } from '../../lib/errors'
import { useT } from '../../lib/i18n'
import {
  buildShortcutDescription,
  type StoryDescriptionSection,
} from '../../lib/shortcut'

export type ShortcutBugLink = {
  label: string
  url: string
}

/**
 * "Report bug in Shortcut" dialog. The caller supplies the context that goes
 * into the story automatically (test case, diagnostics, links); the user
 * edits the title, environment and notes.
 */
export function ShortcutBugModal({
  open,
  onClose,
  projectId,
  defaultSummary,
  defaultEnvironment = '',
  defaultNotes = '',
  contextLabel,
  contextSections,
  links,
}: {
  open: boolean
  onClose: () => void
  projectId: number
  defaultSummary: string
  defaultEnvironment?: string
  defaultNotes?: string
  /** One-line description of what the bug is linked to, shown in the dialog. */
  contextLabel: string
  contextSections: StoryDescriptionSection[]
  links: ShortcutBugLink[]
}) {
  const t = useT()
  const [summary, setSummary] = useState(defaultSummary)
  const [environment, setEnvironment] = useState(defaultEnvironment)
  const [notes, setNotes] = useState(defaultNotes)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ url: string; name: string } | null>(null)

  // Reset the form every time the dialog is opened for a (new) item.
  useEffect(() => {
    if (open) {
      setSummary(defaultSummary)
      setEnvironment(defaultEnvironment)
      setNotes(defaultNotes)
      setError(null)
      setResult(null)
    }
  }, [open, defaultSummary, defaultEnvironment, defaultNotes])

  function close(): void {
    if (!isCreating) {
      onClose()
    }
  }

  async function handleCreate(): Promise<void> {
    if (!summary.trim()) {
      setError('Title is required.')
      return
    }

    setIsCreating(true)
    setError(null)

    try {
      const description = buildShortcutDescription(
        [
          ...contextSections,
          { heading: 'Environment', content: environment },
          { heading: 'Notes', content: notes },
        ],
        links.length > 0
          ? `Source: ${links.map((link) => `[${link.label}](${link.url})`).join(' · ')}`
          : undefined,
      )
      const created = await createShortcutStory({
        data: {
          projectId,
          name: summary.trim(),
          description,
          storyType: 'bug',
          externalLinks: links.map((link) => link.url),
        },
      })

      setResult({ url: created.url, name: created.name })
      window.open(created.url, '_blank', 'noopener,noreferrer')
    } catch (createError) {
      setError(getErrorMessage(createError, 'Failed to create the Shortcut story.'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Modal open={open} title={t('Report bug in Shortcut')} size="lg" onClose={close}>
      {result ? (
        <div className="grid gap-3">
          <Alert variant="success">{t('Created')}{' '}{result.name}.{' '}
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer"
              className="underline text-[var(--tms-primary)]"
            >{t('Open in Shortcut')}</a>
          </Alert>
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>{t('Close')}</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {error ? <Alert variant="danger">{error}</Alert> : null}

          <div className="grid gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--tms-text-soft)]">{t('Title')}</label>
            <Input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              disabled={isCreating}
              placeholder={t('Bug title')}
              maxLength={512}
            />
          </div>

          <div className="rounded-lg border border-[var(--tms-border)] bg-[var(--tms-surface-soft)] px-3 py-2 text-xs text-[var(--tms-text-muted)]">
            {contextLabel}
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--tms-text-soft)]">{t('Environment')}</label>
            <Input
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              disabled={isCreating}
              placeholder={t('Staging, Chrome 128...')}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--tms-text-soft)]">{t('Notes')}</label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={isCreating}
              rows={5}
              placeholder={t('What happened, extra context, steps to reproduce...')}
            />
          </div>

          <p className="m-0 text-xs text-[var(--tms-text-muted)]">{t('The story is created as a Bug; the context and links above are added to it automatically.')}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" disabled={isCreating} onClick={close}>{t('Cancel')}</Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isCreating || !summary.trim()}
              onClick={() => void handleCreate()}
            >
              {isCreating ? t('Creating...') : t('Create bug')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
