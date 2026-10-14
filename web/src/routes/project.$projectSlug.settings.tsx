import {
  createFileRoute,
  notFound,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import {
  Archive,
  Check,
  Copy,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { cx } from '../components/ui/utils'
import {
  archiveProject,
  deleteProject,
  listProjectMembers,
  renameProject,
  restoreProject,
} from '../features/projects/server'
import { getDashboardState } from '../features/tests/server'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

type SettingsSectionId = 'general' | 'danger'

const SETTINGS_SECTIONS: Array<{
  id: SettingsSectionId
  label: string
  Icon: LucideIcon
  danger?: boolean
}> = [
  { id: 'general', label: 'General', Icon: SlidersHorizontal },
  { id: 'danger', label: 'Danger zone', Icon: TriangleAlert, danger: true },
]

const SETTINGS_ROLE_LABELS: Record<'owner' | 'editor' | 'viewer', string> = {
  owner: 'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
}


export const Route = createFileRoute('/project/$projectSlug/settings')({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()

    if (!projectSlug) {
      throw notFound()
    }

    const numericProjectId = Number(projectSlug)

    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      const legacyDashboard = await getDashboardState({
        data: { projectId: numericProjectId },
      })
      const legacyProject =
        legacyDashboard.projects.find((item) => item.id === numericProjectId) ??
        null

      if (!legacyProject?.slug) {
        throw notFound()
      }

      if (legacyProject.slug !== projectSlug) {
        throw redirect({
          to: '/project/$projectSlug/settings',
          params: { projectSlug: legacyProject.slug },
          replace: true,
        })
      }
    }

    const dashboard = await getDashboardState({ data: { projectSlug } })
    const project =
      dashboard.projects.find((item) => item.slug === projectSlug) ?? null
    const selectedProjectId = dashboard.selectedProjectId ?? project?.id ?? null

    if (!project || !selectedProjectId) {
      throw notFound()
    }

    const membersState = await listProjectMembers({
      data: { projectId: selectedProjectId },
    })

    return {
      project,
      projectId: selectedProjectId,
      memberCount: membersState.members.length,
      currentUserRole: membersState.currentUserRole,
    }
  },
  component: ProjectSettingsPage,
})

function ProjectSettingsPage() {
  const t = useT()

  const {
    project,
    projectId,
    memberCount,
    currentUserRole,
  } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()

  const [projectName, setProjectName] = useState(project.name)
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const [isArchiving, setIsArchiving] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dangerZoneError, setDangerZoneError] = useState<string | null>(null)
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)

  const isProjectArchived = project.status === 'Archived'

  const trimmedProjectName = projectName.trim()
  const projectNameUnchanged = trimmedProjectName === project.name.trim()

  async function handleSaveName(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setNameMessage(null)
    setNameError(null)

    if (!trimmedProjectName) {
      setNameError('Enter a project name.')
      return
    }

    setIsSavingName(true)

    try {
      await renameProject({
        data: { projectId, name: trimmedProjectName },
      })
      setNameMessage('Project name updated.')
      await router.invalidate()
    } catch (error) {
      setNameError(getErrorMessage(error, 'Could not rename the project.'))
    } finally {
      setIsSavingName(false)
    }
  }

  async function handleArchive(): Promise<void> {
    setDangerZoneError(null)
    setIsArchiving(true)

    try {
      await archiveProject({ data: { projectId } })
      await router.invalidate()
    } catch (error) {
      setDangerZoneError(getErrorMessage(error, 'Failed to archive project.'))
    } finally {
      setIsArchiveConfirmOpen(false)
      setIsArchiving(false)
    }
  }

  async function handleRestore(): Promise<void> {
    setDangerZoneError(null)
    setIsRestoring(true)

    try {
      await restoreProject({ data: { projectId } })
      await router.invalidate()
    } catch (error) {
      setDangerZoneError(getErrorMessage(error, 'Failed to restore project.'))
    } finally {
      setIsRestoring(false)
    }
  }

  async function handleDelete(): Promise<void> {
    setDangerZoneError(null)
    setIsDeleting(true)

    try {
      await deleteProject({ data: { projectId } })
      await navigate({ to: '/' })
    } catch (error) {
      setDangerZoneError(getErrorMessage(error, 'Failed to delete project.'))
      setIsDeleteConfirmOpen(false)
      setIsDeleting(false)
    }
  }

  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('general')
  const [isLinkCopied, setIsLinkCopied] = useState(false)

  useEffect(() => {
    function onScroll(event: Event): void {
      let current: SettingsSectionId = SETTINGS_SECTIONS[0].id

      for (const section of SETTINGS_SECTIONS) {
        const element = document.getElementById(`settings-${section.id}`)

        if (element && element.getBoundingClientRect().top <= 140) {
          current = section.id
        }
      }

      const target = event.target

      if (
        target instanceof HTMLElement &&
        target.scrollHeight > target.clientHeight &&
        target.scrollTop + target.clientHeight >= target.scrollHeight - 4
      ) {
        current = SETTINGS_SECTIONS[SETTINGS_SECTIONS.length - 1].id
      }

      setActiveSection(current)
    }

    document.addEventListener('scroll', onScroll, true)

    return () => document.removeEventListener('scroll', onScroll, true)
  }, [])

  async function handleCopyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/project/${project.slug ?? project.id}`,
      )
      setIsLinkCopied(true)
      window.setTimeout(() => setIsLinkCopied(false), 1500)
    } catch {
      setIsLinkCopied(false)
    }
  }

  return (
    <main className="workspace-view settings-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            eyebrow={null}
            description={t('General project settings and irreversible actions.')}
            actions={
              <Badge variant={isProjectArchived ? 'warning' : 'statusReady'}>
                {isProjectArchived ? t('Archived') : t('Active')}
              </Badge>
            }
          />

          <div className="settings-grid">
            <nav className="settings-subnav" aria-label={t('Settings sections')}>
              {SETTINGS_SECTIONS.map(({ id, label, Icon, danger }) => (
                <a
                  key={id}
                  href={`#settings-${id}`}
                  className={cx(
                    'settings-subnav__item',
                    activeSection === id && 'is-active',
                    danger && 'is-danger',
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    setActiveSection(id)
                    document
                      .getElementById(`settings-${id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </a>
              ))}
            </nav>

            <div className="settings-content">
              <section id="settings-general" className="settings-section">
                <div className="settings-section__head">
                  <span className="settings-section__icon">
                    <SlidersHorizontal size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{t('General')}</h2>
                    <p>{t('Basic project information.')}</p>
                  </div>
                </div>

                <Panel className="settings-general">
                  <form className="settings-name-form" onSubmit={handleSaveName}>
                    <label className="settings-field">
                      <span>{t('Project name')}</span>
                      <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        size="md"
                      />
                    </label>
                    <div className="settings-name-form__actions">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={
                          isSavingName ||
                          projectNameUnchanged ||
                          !trimmedProjectName
                        }
                      >
                        {isSavingName ? t('Saving...') : t('Save')}
                      </Button>
                      {!projectNameUnchanged && trimmedProjectName ? (
                        <span className="settings-dirty">{t('You have unsaved changes')}</span>
                      ) : null}
                      {nameMessage ? (
                        <span className="settings-saved">{nameMessage}</span>
                      ) : null}
                    </div>
                  </form>
                  {nameError ? <Alert variant="danger">{nameError}</Alert> : null}

                  <div className="settings-facts">
                    <div>
                      <small>{t('Project address')}</small>
                      <div className="settings-facts__value">
                        <code>{t('/project/{v1}', { v1: project.slug ?? project.id })}</code>
                        <button
                          type="button"
                          className="settings-icon-btn"
                          title={t('Copy link')}
                          aria-label={t('Copy project link')}
                          onClick={() => {
                            void handleCopyLink()
                          }}
                        >
                          {isLinkCopied ? (
                            <Check size={16} aria-hidden="true" />
                          ) : (
                            <Copy size={16} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <small>{t('Your role')}</small>
                      <div className="settings-facts__value">
                        <Badge
                          variant={
                            currentUserRole === 'owner' ? 'primary' : 'draft'
                          }
                        >
                          {SETTINGS_ROLE_LABELS[currentUserRole]}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <small>{t('Members')}</small>
                      <div className="settings-facts__value">
                        {memberCount}
                        <Link
                          to="/project/$projectSlug/members"
                          params={{ projectSlug: project.slug ?? String(project.id) }}
                          className="settings-link"
                        >{t('Open →')}</Link>
                      </div>
                    </div>
                  </div>
                </Panel>
              </section>

              <section id="settings-danger" className="settings-section">
                <Panel className="settings-danger-zone">
                  <div className="settings-section__head settings-danger-zone__head">
                    <span className="settings-section__icon">
                      <TriangleAlert size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <h2>{t('Danger zone')}</h2>
                      <p>{t('Irreversible actions on the project.')}</p>
                    </div>
                  </div>

                  {dangerZoneError ? (
                    <Alert variant="danger" className="mx-5 mb-4">
                      {dangerZoneError}
                    </Alert>
                  ) : null}

                  {isProjectArchived ? (
                    <>
                      <div className="settings-danger-row">
                        <div>
                          <strong>{t('Restore project')}</strong>
                          <span>{t('Return the project to the active list.')}</span>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isRestoring}
                          onClick={() => {
                            void handleRestore()
                          }}
                        >
                          <RotateCcw size={16} aria-hidden="true" />
                          {isRestoring ? t('Restoring...') : t('Restore')}
                        </Button>
                      </div>
                      <div className="settings-danger-row">
                        <div>
                          <strong>{t('Delete permanently')}</strong>
                          <span>{t('The project, cases, runs and docs will be deleted permanently.')}</span>
                        </div>
                        <Button
                          type="button"
                          variant="danger"
                          disabled={isDeleting}
                          onClick={() => setIsDeleteConfirmOpen(true)}
                        >
                          <Trash2 size={16} aria-hidden="true" />{t('Delete permanently')}</Button>
                      </div>
                    </>
                  ) : (
                    <div className="settings-danger-row">
                      <div>
                        <strong>{t('Archive project')}</strong>
                        <span>{t('Hides the project from the active list. It can be restored at any time.')}</span>
                      </div>
                      <Button
                        type="button"
                        variant="danger"
                        disabled={isArchiving}
                        onClick={() => setIsArchiveConfirmOpen(true)}
                      >
                        <Archive size={16} aria-hidden="true" />
                        {isArchiving ? t('Archiving...') : t('Archive')}
                      </Button>
                    </div>
                  )}
                </Panel>
              </section>
            </div>
          </div>

          <ConfirmDialog
            open={isArchiveConfirmOpen}
            title={t('Archive project?')}
            description={
              <>
                <strong className="text-[var(--tms-text)]">{project.name}</strong>{' '}{t('will be hidden from the active list. You can restore it at any time on this page.')}</>
            }
            confirmLabel={t('Archive')}
            cancelLabel="Cancel"
            confirmVariant="primary"
            isPending={isArchiving}
            pendingLabel={t('Archiving...')}
            onConfirm={() => {
              void handleArchive()
            }}
            onCancel={() => setIsArchiveConfirmOpen(false)}
          />

          <ConfirmDialog
            open={isDeleteConfirmOpen}
            title={t('Delete project permanently?')}
            description={
              <>{t('Together with the project,')}{' '}
                <strong className="text-[var(--tms-text)]">{project.name}</strong>{' '}{t('its suites, test cases and runs will be deleted. This action cannot be undone.')}</>
            }
            confirmLabel={t('Delete permanently')}
            cancelLabel="Cancel"
            confirmVariant="danger"
            isPending={isDeleting}
            pendingLabel={t('Deleting...')}
            onConfirm={() => {
              void handleDelete()
            }}
            onCancel={() => setIsDeleteConfirmOpen(false)}
          />
        </div>
      </div>
    </main>
  )
}
