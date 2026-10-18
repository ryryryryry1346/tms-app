import { useRouter } from '@tanstack/react-router'
import { FolderKanban } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { SelectMenu } from '../ui/SelectMenu'
import { cx } from '../ui/utils'
import {
  disconnectShortcut,
  loadShortcutOptions,
  saveShortcutSettings,
  testShortcutConnection,
  type ShortcutOptions,
  type ShortcutSettings,
} from '../../features/shortcut/server'
import { getErrorMessage } from '../../lib/errors'
import { useT } from '../../lib/i18n'
import {
  SHORTCUT_STORY_TYPES,
  formatWorkflowStateLabel,
  isShortcutStoryType,
  shortcutApiTokensUrl,
  type ShortcutStoryType,
} from '../../lib/shortcut'

// Shortcut app icon (web/public/integrations). Falls back to a generic icon
// if the file is missing.
const SHORTCUT_LOGO_SRC = '/integrations/shortcut-mark.png'

function ShortcutLogo() {
  const imageRef = useRef<HTMLImageElement>(null)
  const [failed, setFailed] = useState(false)

  // A server-rendered <img> can fail before React attaches onError, so
  // check the already-finished load once after hydration as well.
  useEffect(() => {
    const image = imageRef.current

    if (image && image.complete && image.naturalWidth === 0) {
      setFailed(true)
    }
  }, [])

  if (failed) {
    return (
      <span className="settings-integration-card__icon">
        <FolderKanban size={21} aria-hidden="true" />
      </span>
    )
  }

  return (
    <span className="settings-integration-card__icon settings-integration-card__icon--logo">
      <img
        ref={imageRef}
        src={SHORTCUT_LOGO_SRC}
        alt=""
        width={42}
        height={42}
        onError={() => setFailed(true)}
      />
    </span>
  )
}

const STORY_TYPE_LABELS: Record<ShortcutStoryType, string> = {
  bug: 'Bug',
  feature: 'Feature',
  chore: 'Chore',
}

export function ShortcutIntegrationCard({
  projectId,
  settings,
}: {
  projectId: number
  settings: ShortcutSettings
}) {
  const t = useT()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const connected = settings.configured

  return (
    <>
      <article className="settings-integration-card settings-integration--shortcut">
        <div className="settings-integration-card__top">
          <ShortcutLogo />
          <h3>{t('Shortcut')}</h3>
          <span className={cx('settings-status', connected && 'is-ok')}>
            {connected ? t('Connected') : t('Not configured')}
          </span>
        </div>
        <p>{t('Create Shortcut stories from the repository and bug reports from runs and automation results.')}</p>
        <div className="settings-chips">
          <span>{t('Repository stories')}</span>
          <span>{t('Bugs from runs')}</span>
          <span>{t('Bugs from automation')}</span>
        </div>
        <div className="settings-integration-card__foot">
          <small>
            {settings.envFallbackActive
              ? t('Using server environment settings')
              : connected && settings.workflowStateName
                ? t('New stories → {state}', { state: settings.workflowStateName })
                : t('API token and workflow state are required')}
          </small>
          {settings.canManage ? (
            <Button
              size="sm"
              variant={connected ? 'secondary' : 'primary'}
              onClick={() => setIsModalOpen(true)}
            >
              {connected ? t('Configure') : t('Connect')}
            </Button>
          ) : (
            <small>{t('Only owners can change this')}</small>
          )}
        </div>
      </article>

      {isModalOpen ? (
        <ShortcutSettingsModal
          projectId={projectId}
          settings={settings}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </>
  )
}

function ShortcutSettingsModal({
  projectId,
  settings,
  onClose,
}: {
  projectId: number
  settings: ShortcutSettings
  onClose: () => void
}) {
  const t = useT()
  const router = useRouter()

  const [apiToken, setApiToken] = useState('')
  const [workflowStateId, setWorkflowStateId] = useState(
    settings.workflowStateId ? String(settings.workflowStateId) : '',
  )
  const [groupId, setGroupId] = useState(settings.groupId ?? '')
  const [storyType, setStoryType] = useState<ShortcutStoryType>(settings.storyType)
  const [labelName, setLabelName] = useState(settings.labelName)

  const [options, setOptions] = useState<ShortcutOptions | null>(null)
  const [isLoadingOptions, setIsLoadingOptions] = useState(false)
  const [optionsError, setOptionsError] = useState<string | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  async function handleLoadOptions(token?: string): Promise<void> {
    setIsLoadingOptions(true)
    setOptionsError(null)

    try {
      const result = await loadShortcutOptions({
        data: { projectId, apiToken: token || undefined },
      })
      setOptions(result)

      if (
        workflowStateId &&
        !result.workflowStates.some((state) => String(state.id) === workflowStateId)
      ) {
        setWorkflowStateId('')
      }

      if (groupId && !result.groups.some((group) => group.id === groupId)) {
        setGroupId('')
      }
    } catch (error) {
      setOptions(null)
      setOptionsError(getErrorMessage(error, t('Could not load data from Shortcut.')))
    } finally {
      setIsLoadingOptions(false)
    }
  }

  // With a saved token, fill the pickers straight away.
  useEffect(() => {
    if (settings.hasToken) {
      void handleLoadOptions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stateOptions = options
    ? options.workflowStates.map((state) => ({
        value: String(state.id),
        label: formatWorkflowStateLabel(state),
      }))
    : settings.workflowStateId
      ? [
          {
            value: String(settings.workflowStateId),
            label: settings.workflowStateName ?? `#${settings.workflowStateId}`,
          },
        ]
      : []

  const groupOptions = [
    { value: '', label: t('No team') },
    ...(options
      ? options.groups.map((group) => ({ value: group.id, label: group.name }))
      : settings.groupId
        ? [{ value: settings.groupId, label: settings.groupName ?? settings.groupId }]
        : []),
  ]

  const hasUsableToken = Boolean(apiToken.trim()) || settings.hasToken
  const canSave = hasUsableToken && Boolean(workflowStateId) && !isSaving

  async function handleSave(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()

    if (!canSave) {
      return
    }

    setIsSaving(true)
    setSaveError(null)
    setTestResult(null)

    const selectedState = options?.workflowStates.find(
      (state) => String(state.id) === workflowStateId,
    )
    const selectedGroup = options?.groups.find((group) => group.id === groupId)

    try {
      await saveShortcutSettings({
        data: {
          projectId,
          apiToken: apiToken.trim() || undefined,
          workflowStateId: Number(workflowStateId),
          workflowStateName: selectedState
            ? formatWorkflowStateLabel(selectedState)
            : (settings.workflowStateName ?? undefined),
          groupId: groupId || undefined,
          groupName: selectedGroup?.name ?? settings.groupName ?? undefined,
          storyType,
          labelName: labelName.trim() || undefined,
        },
      })
      await router.invalidate()
      onClose()
    } catch (error) {
      setSaveError(getErrorMessage(error, t('Could not save Shortcut settings.')))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleTest(): Promise<void> {
    setIsTesting(true)
    setTestResult(null)

    try {
      setTestResult(await testShortcutConnection({ data: { projectId } }))
    } catch (error) {
      setTestResult({
        ok: false,
        message: getErrorMessage(error, t('Could not check the connection.')),
      })
    } finally {
      setIsTesting(false)
    }
  }

  async function handleDisconnect(): Promise<void> {
    setIsDisconnecting(true)
    setSaveError(null)

    try {
      await disconnectShortcut({ data: { projectId } })
      await router.invalidate()
      onClose()
    } catch (error) {
      setSaveError(getErrorMessage(error, t('Could not disconnect Shortcut.')))
      setIsDisconnecting(false)
      setIsConfirmingDisconnect(false)
    }
  }

  return (
    <Modal open title={t('Shortcut')} onClose={onClose} size="lg">
      {settings.envFallbackActive ? (
        <Alert variant="info" className="mb-5">{t('This project currently uses the SHORTCUT_* environment variables of the server. Saving settings here overrides them for this project.')}</Alert>
      ) : null}

      {saveError ? (
        <Alert variant="danger" className="mb-5">
          {saveError}
        </Alert>
      ) : null}

      <form className="grid gap-4" onSubmit={handleSave}>
        <div className="grid gap-1.5">
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">{t('API token')}<Input
              type="password"
              value={apiToken}
              onChange={(event) => setApiToken(event.target.value)}
              placeholder={
                settings.hasToken
                  ? t('•••••••• (saved — leave empty to keep unchanged)')
                  : t('Paste your Shortcut API token')
              }
              size="md"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isLoadingOptions || !hasUsableToken}
              onClick={() => {
                void handleLoadOptions(apiToken.trim())
              }}
            >
              {isLoadingOptions ? t('Loading…') : t('Load workflows and teams')}
            </Button>
            {options ? (
              <span className="text-xs font-semibold text-[var(--tms-success)]">
                {options.memberName
                  ? t('Token OK — {name}', { name: options.memberName })
                  : t('Token OK')}
              </span>
            ) : null}
          </div>
          {optionsError ? (
            <p className="m-0 text-xs font-semibold text-[var(--tms-danger)]">{optionsError}</p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">
            <span>{t('Workflow state for new stories')}</span>
            <SelectMenu
              value={workflowStateId}
              onValueChange={setWorkflowStateId}
              options={
                stateOptions.length > 0
                  ? stateOptions
                  : [{ value: '', label: t('Load workflows first'), disabled: true }]
              }
              disabled={stateOptions.length === 0}
              className="w-full"
              aria-label={t('Workflow state')}
            />
          </div>
          <div className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">
            <span>{t('Team (optional)')}</span>
            <SelectMenu
              value={groupId}
              onValueChange={setGroupId}
              options={groupOptions}
              className="w-full"
              aria-label={t('Team')}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">
            <span>{t('Repository story type')}</span>
            <SelectMenu
              value={storyType}
              onValueChange={(value) => {
                if (isShortcutStoryType(value)) {
                  setStoryType(value)
                }
              }}
              options={SHORTCUT_STORY_TYPES.map((type) => ({
                value: type,
                label: t(STORY_TYPE_LABELS[type]),
              }))}
              className="w-full"
              aria-label={t('Repository story type')}
            />
          </div>
          <label className="grid gap-1.5 text-sm font-semibold text-[var(--tms-text)]">{t('Label (optional)')}<Input
              value={labelName}
              onChange={(event) => setLabelName(event.target.value)}
              placeholder="tms"
              maxLength={64}
              size="md"
            />
          </label>
        </div>

        <p className="m-0 text-xs text-[var(--tms-text-muted)]">{t('Bug reports from runs and automation results are always created as Bug.')}</p>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--tms-border-subtle)] pt-4">
          <Button type="submit" variant="primary" disabled={!canSave}>
            {isSaving ? t('Saving...') : t('Save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isTesting || !settings.hasToken || !settings.workflowStateId}
            onClick={() => {
              void handleTest()
            }}
          >
            {isTesting ? t('Checking...') : t('Test connection')}
          </Button>
          {settings.hasToken ? (
            isConfirmingDisconnect ? (
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs text-[var(--tms-text-muted)]">{t('Remove the token and settings?')}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={isDisconnecting}
                  onClick={() => setIsConfirmingDisconnect(false)}
                >{t('Cancel')}</Button>
                <Button
                  type="button"
                  size="sm"
                  variant="danger"
                  disabled={isDisconnecting}
                  onClick={() => {
                    void handleDisconnect()
                  }}
                >
                  {isDisconnecting ? t('Disconnecting...') : t('Disconnect')}
                </Button>
              </span>
            ) : (
              <Button
                type="button"
                variant="danger"
                className="ml-auto"
                onClick={() => setIsConfirmingDisconnect(true)}
              >{t('Disconnect')}</Button>
            )
          ) : null}
        </div>
        {testResult ? (
          <p
            className={`m-0 text-sm font-semibold ${
              testResult.ok ? 'text-[var(--tms-success)]' : 'text-[var(--tms-danger)]'
            }`}
          >
            {testResult.message}
          </p>
        ) : null}
        <p className="m-0 text-xs text-[var(--tms-text-muted)]">{t('“Test connection” uses the saved settings — save your changes first.')}</p>
      </form>

      <div className="settings-integration-help">
        <p className="m-0 text-xs font-semibold text-[var(--tms-text)]">{t('How to get a token')}</p>
        <ol className="m-0 mt-1 grid gap-0.5 pl-4 text-xs text-[var(--tms-text-muted)]">
          <li>
            {t('Open')}{' '}
            <a
              href={shortcutApiTokensUrl(options?.workspaceSlug)}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--tms-primary)] underline"
            >{t('Shortcut → Settings → API Tokens')}</a>{' '}
            {t('and press “Create Token”.')}
          </li>
          <li>{t('Choose “Custom permissions”: Read and Create Stories are enough. Full access is not needed.')}</li>
          <li>{t('Copy the token (Shortcut shows it only once), paste it above and press “Load workflows and teams”.')}</li>
        </ol>
        <p className="m-0 mt-1.5 text-xs text-[var(--tms-text-muted)]">{t('Stories are created on behalf of the token owner. If the label does not exist in Shortcut yet, create it there or leave the label empty.')}</p>
      </div>
    </Modal>
  )
}
