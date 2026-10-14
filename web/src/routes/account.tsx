import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import {
  ArrowRight,
  Check,
  Crown,
  Eye,
  Folder,
  Info,
  KeyRound,
  Mail,
  Pencil,
  ShieldCheck,
  User,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { PasswordInput } from '../components/ui/PasswordInput'
import { cx } from '../components/ui/utils'
import {
  changeAccountPassword,
  getAccountOverview,
  updateAccountName,
  type AccountProjectRole,
} from '../features/account/server'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

export const Route = createFileRoute('/account')({
  loader: async () => getAccountOverview(),
  component: AccountPage,
})

type AccountRole = AccountProjectRole['role']
type AccountSectionId = 'profile' | 'security' | 'projects'

const ROLE_ORDER: AccountRole[] = ['owner', 'editor', 'viewer']

const ROLE_META: Record<AccountRole, { label: string; Icon: LucideIcon }> = {
  owner: { label: 'Owner', Icon: Crown },
  editor: { label: 'Editor', Icon: Pencil },
  viewer: { label: 'Viewer', Icon: Eye },
}

const ACCOUNT_SECTIONS: Array<{
  id: AccountSectionId
  label: string
  Icon: LucideIcon
}> = [
  { id: 'profile', label: 'Profile', Icon: User },
  { id: 'security', label: 'Security', Icon: ShieldCheck },
  { id: 'projects', label: 'My projects', Icon: Folder },
]

const TILE_COLORS = [
  '#111113',
  '#2563eb',
  '#0f766e',
  '#b45309',
  '#7c3aed',
  '#be185d',
  '#0369a1',
  '#4d7c0f',
]

function tileColor(seed: number): string {
  return TILE_COLORS[Math.abs(seed) % TILE_COLORS.length]
}

function pluralizeProjects(count: number): string {
  return `${count} project${count === 1 ? '' : 's'}`
}

function passwordStrength(value: string): 0 | 1 | 2 | 3 {
  if (value.length === 0) {
    return 0
  }

  if (value.length < 8) {
    return 1
  }

  let variety = 0

  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) {
    variety += 1
  }

  if (/\d/.test(value)) {
    variety += 1
  }

  if (/[^\w\s]/.test(value)) {
    variety += 1
  }

  if (value.length >= 12 && variety >= 2) {
    return 3
  }

  return variety >= 1 || value.length >= 10 ? 2 : 1
}

function RolePill({ role }: { role: AccountRole }) {
  const { Icon, label } = ROLE_META[role]

  return (
    <span className={cx('account-role-pill', `account-role--${role}`)}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  )
}

function AccountPage() {
  const t = useT()

  const overview = Route.useLoaderData()
  const router = useRouter()

  const [name, setName] = useState(overview.name)
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const [activeSection, setActiveSection] =
    useState<AccountSectionId>('profile')

  const trimmedName = name.trim()
  const nameUnchanged = trimmedName === overview.name.trim()
  const nameDirty = !nameUnchanged && trimmedName.length > 0
  const strength = passwordStrength(newPassword)
  const strengthLabel =
    newPassword.length === 0
      ? 'At least 8 characters'
      : strength === 1
        ? `Too short — ${Math.max(8 - newPassword.length, 0)} more characters`
        : strength === 2
          ? 'Fair'
          : 'Strong'

  const roleCounts: Record<AccountRole, number> = {
    owner: 0,
    editor: 0,
    viewer: 0,
  }

  for (const project of overview.projects) {
    roleCounts[project.role] += 1
  }

  useEffect(() => {
    function onScroll(event: Event): void {
      let current: AccountSectionId = ACCOUNT_SECTIONS[0].id

      for (const section of ACCOUNT_SECTIONS) {
        const element = document.getElementById(`account-${section.id}`)

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
        current = ACCOUNT_SECTIONS[ACCOUNT_SECTIONS.length - 1].id
      }

      setActiveSection(current)
    }

    document.addEventListener('scroll', onScroll, true)

    return () => document.removeEventListener('scroll', onScroll, true)
  }, [])

  async function handleSaveName(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setNameMessage(null)
    setNameError(null)

    if (!trimmedName) {
      setNameError('Enter a name.')
      return
    }

    setIsSavingName(true)

    try {
      await updateAccountName({ data: { name: trimmedName } })
      setNameMessage('Name updated')
      await router.invalidate()
    } catch (error) {
      setNameError(getErrorMessage(error, 'Could not update the name.'))
    } finally {
      setIsSavingName(false)
    }
  }

  async function handleChangePassword(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setPasswordMessage(null)
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError('The new password must be at least 8 characters.')
      return
    }

    setIsSavingPassword(true)

    try {
      await changeAccountPassword({ data: { currentPassword, newPassword } })
      setPasswordMessage('Password changed. You have been signed out on other devices.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      setPasswordError(
        getErrorMessage(
          error,
          'Could not change the password. Check your current password.',
        ),
      )
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <main className="workspace-view account-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName="Account"
            eyebrow={null}
            description={t('Profile, password and your project access.')}
          />

          <div className="settings-grid">
            <nav className="settings-subnav" aria-label={t('Account sections')}>
              {ACCOUNT_SECTIONS.map(({ id, label, Icon }) => (
                <a
                  key={id}
                  href={`#account-${id}`}
                  className={cx(
                    'settings-subnav__item',
                    activeSection === id && 'is-active',
                  )}
                  onClick={(event) => {
                    event.preventDefault()
                    setActiveSection(id)
                    document
                      .getElementById(`account-${id}`)
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                </a>
              ))}
            </nav>

            <div className="settings-content">
              <section id="account-profile" className="settings-section">
                <div className="settings-section__head">
                  <span className="settings-section__icon">
                    <User size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{t('Profile')}</h2>
                    <p>{t('Your name is shown in activity, runs and comments.')}</p>
                  </div>
                </div>

                <Panel className="account-profile">
                  <div className="account-avatar" aria-hidden="true">
                    {(trimmedName || overview.name || '?').slice(0, 1).toUpperCase()}
                  </div>

                  <form className="account-form" onSubmit={handleSaveName}>
                    <div className="account-grid">
                      <label className="settings-field">
                        <span>{t('Name')}</span>
                        <span className="account-input">
                          <User size={16} aria-hidden="true" />
                          <Input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={t('Your name')}
                          />
                        </span>
                      </label>
                      <label className="settings-field">
                        <span>{t('Email')}</span>
                        <span className="account-input">
                          <Mail size={16} aria-hidden="true" />
                          <Input value={overview.email} disabled readOnly />
                        </span>
                        <small className="account-hint">{t('Changing email is not supported yet.')}</small>
                      </label>
                    </div>

                    <div className="account-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={isSavingName || !nameDirty}
                      >
                        {isSavingName ? t('Saving...') : t('Save name')}
                      </Button>
                      {nameDirty ? (
                        <span className="settings-dirty">{t('You have unsaved changes')}</span>
                      ) : nameMessage ? (
                        <span className="account-ok">
                          <Check size={14} aria-hidden="true" />
                          {nameMessage}
                        </span>
                      ) : null}
                    </div>
                    {nameError ? <Alert variant="danger">{nameError}</Alert> : null}

                    <div className="account-summary">
                      <span className="account-chip">
                        {overview.projects.length === 0
                          ? t('No projects')
                          : pluralizeProjects(overview.projects.length)}
                      </span>
                      {ROLE_ORDER.filter((role) => roleCounts[role] > 0).map(
                        (role) => {
                          const { Icon, label } = ROLE_META[role]

                          return (
                            <span
                              key={role}
                              className={cx(
                                'account-chip',
                                `account-role--${role}`,
                                'is-role',
                              )}
                            >
                              <Icon size={13} aria-hidden="true" />
                              {label}: {roleCounts[role]}
                            </span>
                          )
                        },
                      )}
                    </div>
                  </form>
                </Panel>
              </section>

              <section id="account-security" className="settings-section">
                <div className="settings-section__head">
                  <span className="settings-section__icon">
                    <ShieldCheck size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{t('Security')}</h2>
                    <p>{t('Change your password.')}</p>
                  </div>
                </div>

                <Panel className="account-password">
                  <form
                    className="account-form"
                    onSubmit={handleChangePassword}
                  >
                    <div className="account-grid">
                      <label className="settings-field">
                        <span>{t('Current password')}</span>
                        <span className="account-input">
                          <KeyRound size={16} aria-hidden="true" />
                          <PasswordInput
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(event) =>
                              setCurrentPassword(event.target.value)
                            }
                          />
                        </span>
                      </label>
                      <label className="settings-field">
                        <span>{t('New password')}</span>
                        <span className="account-input">
                          <KeyRound size={16} aria-hidden="true" />
                          <PasswordInput
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(event) =>
                              setNewPassword(event.target.value)
                            }
                          />
                        </span>
                        <span
                          className={cx(
                            'account-meter',
                            strength > 0 && `is-${strength}`,
                          )}
                          aria-hidden="true"
                        >
                          <i />
                          <i />
                          <i />
                        </span>
                        <small className="account-hint">{strengthLabel}</small>
                      </label>
                    </div>

                    <div className="account-note">
                      <Info size={16} aria-hidden="true" />
                      <span>{t('After changing your password you stay signed in here, and you will need to sign in again on all other devices.')}</span>
                    </div>

                    <div className="account-actions">
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={
                          isSavingPassword ||
                          currentPassword.length === 0 ||
                          newPassword.length < 8
                        }
                      >
                        {isSavingPassword ? t('Saving...') : t('Change password')}
                      </Button>
                      {passwordMessage ? (
                        <span className="account-ok">
                          <Check size={14} aria-hidden="true" />
                          {passwordMessage}
                        </span>
                      ) : null}
                    </div>
                    {passwordError ? (
                      <Alert variant="danger">{passwordError}</Alert>
                    ) : null}
                  </form>
                </Panel>
              </section>

              <section id="account-projects" className="settings-section">
                <div className="settings-section__head">
                  <span className="settings-section__icon">
                    <Folder size={16} aria-hidden="true" />
                  </span>
                  <div>
                    <h2>{t('My projects')}</h2>
                    <p>{t('Projects you can access and your role in each. Roles are assigned by project owners.')}</p>
                  </div>
                </div>

                {overview.projects.length === 0 ? (
                  <div className="account-empty">
                    <span className="account-empty__icon">
                      <Folder size={20} aria-hidden="true" />
                    </span>
                    <strong>{t('You do not have access to any project yet')}</strong>
                    <span>{t('When you are added to a project, it will appear here together with your role.')}</span>
                  </div>
                ) : (
                  <>
                    {overview.projects.length > 1 ? (
                      <div className="account-rolesum">
                        {ROLE_ORDER.map((role) => {
                          const { Icon, label } = ROLE_META[role]

                          return (
                            <div
                              key={role}
                              className={cx(
                                'account-rolesum__item',
                                `account-role--${role}`,
                              )}
                            >
                              <span className="account-rolesum__icon">
                                <Icon size={16} aria-hidden="true" />
                              </span>
                              <strong>{label}</strong>
                              <span className="account-rolesum__count">
                                {roleCounts[role]}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    ) : null}

                    <div className="account-projects">
                      {overview.projects.map((project) => {
                        const isArchived = project.status === 'Archived'

                        return (
                          <Link
                            key={project.id}
                            to="/project/$projectSlug"
                            params={{
                              projectSlug:
                                project.slug ?? project.id.toString(),
                            }}
                            className={cx(
                              'account-project',
                              `account-role--${project.role}`,
                              isArchived && 'is-archived',
                            )}
                          >
                            <span
                              className="account-project__tile"
                              style={{ background: tileColor(project.id) }}
                              aria-hidden="true"
                            >
                              {project.name.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="account-project__copy">
                              <strong>{project.name}</strong>
                              <small>{isArchived ? t('Archived') : t('Active')}</small>
                            </span>
                            <RolePill role={project.role} />
                            <ArrowRight
                              size={16}
                              aria-hidden="true"
                              className="account-project__go"
                            />
                          </Link>
                        )
                      })}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
