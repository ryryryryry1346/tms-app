import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import {
  changeAccountPassword,
  getAccountOverview,
  updateAccountName,
  type AccountProjectRole,
} from '../features/account/server'
import { getErrorMessage } from '../lib/errors'

export const Route = createFileRoute('/account')({
  loader: async () => getAccountOverview(),
  component: AccountPage,
})

const ROLE_BADGE: Record<
  AccountProjectRole['role'],
  'primary' | 'success' | 'draft'
> = {
  owner: 'primary',
  editor: 'success',
  viewer: 'draft',
}

function AccountPage() {
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

  const trimmedName = name.trim()
  const nameUnchanged = trimmedName === overview.name.trim()

  async function handleSaveName(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setNameMessage(null)
    setNameError(null)

    if (!trimmedName) {
      setNameError('Enter your name.')
      return
    }

    setIsSavingName(true)

    try {
      await updateAccountName({ data: { name: trimmedName } })
      setNameMessage('Name updated.')
      await router.invalidate()
    } catch (error) {
      setNameError(getErrorMessage(error, 'Could not update your name.'))
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
      setPasswordError('New password must be at least 8 characters.')
      return
    }

    setIsSavingPassword(true)

    try {
      await changeAccountPassword({ data: { currentPassword, newPassword } })
      setPasswordMessage('Password changed. Other devices were signed out.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (error) {
      setPasswordError(
        getErrorMessage(error, 'Could not change password. Check your current password.'),
      )
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <header className="workspace-page-header">
            <div className="workspace-page-header__body">
              <div className="workspace-page-header__copy">
                <p className="workspace-page-header__eyebrow">Account</p>
                <h1 className="workspace-page-header__title">Account settings</h1>
                <p className="workspace-page-header__description">
                  Manage your profile, password, and see your access across
                  projects.
                </p>
              </div>
            </div>
          </header>

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="Profile"
              description="Your display name is shown on activity, run executions, and comments."
              className="mb-4"
            />

            <form className="grid gap-3 md:max-w-md" onSubmit={handleSaveName}>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--tms-text)]">
                  Name
                </span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--tms-text)]">
                  Email
                </span>
                <Input value={overview.email} disabled readOnly />
                <span className="text-xs text-[var(--tms-text-muted)]">
                  Email changes aren&apos;t supported yet.
                </span>
              </label>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSavingName || nameUnchanged || !trimmedName}
                >
                  {isSavingName ? 'Saving...' : 'Save name'}
                </Button>
                {nameMessage ? (
                  <span className="text-sm text-[var(--tms-text-muted)]">
                    {nameMessage}
                  </span>
                ) : null}
              </div>
              {nameError ? <Alert variant="danger">{nameError}</Alert> : null}
            </form>
          </Panel>

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="Password"
              description="Change your password. Other signed-in devices will be logged out."
              className="mb-4"
            />

            <form
              className="grid gap-3 md:max-w-md"
              onSubmit={handleChangePassword}
            >
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--tms-text)]">
                  Current password
                </span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-medium text-[var(--tms-text)]">
                  New password
                </span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <span className="text-xs text-[var(--tms-text-muted)]">
                  At least 8 characters.
                </span>
              </label>
              <div className="flex items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isSavingPassword ||
                    currentPassword.length === 0 ||
                    newPassword.length === 0
                  }
                >
                  {isSavingPassword ? 'Saving...' : 'Change password'}
                </Button>
                {passwordMessage ? (
                  <span className="text-sm text-[var(--tms-text-muted)]">
                    {passwordMessage}
                  </span>
                ) : null}
              </div>
              {passwordError ? (
                <Alert variant="danger">{passwordError}</Alert>
              ) : null}
            </form>
          </Panel>

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="Your projects and roles"
              description="Projects you can access and your role in each. Roles are managed by project owners."
              className="mb-4"
            />

            {overview.projects.length === 0 ? (
              <EmptyState
                title="No project access yet"
                description="When you're added to a project, it will appear here with your role."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--tms-border-subtle)]">
                <div className="grid grid-cols-[minmax(180px,1fr)_120px] gap-3 border-b border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                  <span>Project</span>
                  <span>Your role</span>
                </div>
                {overview.projects.map((project) => (
                  <div
                    key={project.id}
                    className="grid grid-cols-[minmax(180px,1fr)_120px] items-center gap-3 border-b border-[var(--tms-border-subtle)] px-4 py-3 last:border-b-0"
                  >
                    <Link
                      to="/project/$projectSlug"
                      params={{
                        projectSlug: project.slug ?? project.id.toString(),
                      }}
                      className="font-semibold text-[var(--tms-text)] no-underline hover:underline"
                    >
                      {project.name}
                    </Link>
                    <Badge variant={ROLE_BADGE[project.role]}>
                      {project.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
