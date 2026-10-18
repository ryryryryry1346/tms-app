import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import {
  Crown,
  Eye,
  Info,
  Lock,
  Pencil,
  Plus,
  Search,
  UserMinus,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { SelectMenu } from '../components/ui/SelectMenu'
import { TableHead, TableRow } from '../components/ui/TableShell'
import { cx } from '../components/ui/utils'
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMemberSummary,
} from '../features/projects/server'
import { getDashboardState } from '../features/tests/server'
import { getErrorMessage } from '../lib/errors'
import {
  pluralize,
  useLanguage,
  useT,
  type Language,
  type TranslateFn,
} from '../lib/i18n'

type ProjectRole = 'owner' | 'editor' | 'viewer'

const ROLE_ORDER: ProjectRole[] = ['owner', 'editor', 'viewer']

const ROLE_META: Record<
  ProjectRole,
  { label: string; Icon: LucideIcon; description: string }
> = {
  owner: {
    label: 'Owner',
    Icon: Crown,
    description:
      'Manages members, settings and API tokens, and can delete the project.',
  },
  editor: {
    label: 'Editor',
    Icon: Pencil,
    description:
      'Creates and edits cases, runs, docs and automated-test links.',
  },
  viewer: {
    label: 'Viewer',
    Icon: Eye,
    description: 'Can view everything in the project, read-only.',
  },
}

function buildRoleOptions(t: TranslateFn) {
  return ROLE_ORDER.map((value) => {
  const { Icon, label } = ROLE_META[value]

  return {
    value,
    label: (
      <span className="members-role-option">
        <Icon size={14} aria-hidden="true" />
        {t(label)}
      </span>
    ),
  }
  })
}

const MEMBERS_TABLE_COLUMNS = 'minmax(240px, 1.6fr) 190px 72px'

const AVATAR_COLORS = [
  '#2563eb',
  '#0f766e',
  '#b45309',
  '#7c3aed',
  '#be185d',
  '#0369a1',
  '#4d7c0f',
  '#9333ea',
]

function memberInitial(name: string, email: string): string {
  return (name.trim() || email.trim() || 'U').slice(0, 1).toUpperCase()
}

function avatarColor(seed: string): string {
  let hash = 0

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function pluralizeMembers(count: number, language: Language): string {
  return pluralize(
    language,
    count,
    { one: 'member', other: 'members' },
    { one: 'участник', few: 'участника', many: 'участников' },
  )
}

function RolePill({
  role,
  locked = false,
  title,
}: {
  role: ProjectRole
  locked?: boolean
  title?: string
}) {
  const t = useT()
  const { Icon, label } = ROLE_META[role]

  return (
    <span
      className={cx(
        'members-role-pill',
        `members-role--${role}`,
        locked && 'is-locked',
      )}
      title={title}
    >
      <Icon size={14} aria-hidden="true" />
      {t(label)}
    </span>
  )
}

export const Route = createFileRoute('/project/$projectSlug/members')({
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
          to: '/project/$projectSlug/members',
          params: { projectSlug: legacyProject.slug },
          replace: true,
        })
      }
    }

    const dashboard = await getDashboardState({
      data: { projectSlug },
    })

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
      project: { ...project, id: selectedProjectId },
      members: membersState.members,
      currentUserRole: membersState.currentUserRole,
      currentUserId: membersState.currentUserId,
    }
  },
  component: ProjectMembersPage,
})

function ProjectMembersPage() {
  const t = useT()
  const { language } = useLanguage()

  const {
    project,
    members: initialMembers,
    currentUserRole,
    currentUserId,
  } = Route.useLoaderData()

  const [members, setMembers] = useState<ProjectMemberSummary[]>(initialMembers)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('editor')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<ProjectRole | null>(null)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [removeConfirmUserId, setRemoveConfirmUserId] = useState<string | null>(
    null,
  )

  const isOwner = currentUserRole === 'owner'
  const ownerCount = members.filter((member) => member.role === 'owner').length

  const roleCounts = useMemo(() => {
    const counts: Record<ProjectRole, number> = { owner: 0, editor: 0, viewer: 0 }

    for (const member of members) {
      counts[member.role] += 1
    }

    return counts
  }, [members])

  const visibleMembers = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return members.filter((member) => {
      if (roleFilter && member.role !== roleFilter) {
        return false
      }

      if (!needle) {
        return true
      }

      return `${member.name} ${member.email}`.toLowerCase().includes(needle)
    })
  }, [members, query, roleFilter])

  function toggleRoleFilter(next: ProjectRole): void {
    setRoleFilter((current) => (current === next ? null : next))
  }

  async function handleAddMember(
    event?: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event?.preventDefault()

    if (email.trim().length === 0) {
      return
    }

    setErrorMessage(null)
    setIsAdding(true)

    try {
      const result = await addProjectMember({
        data: { projectId: project.id, email: email.trim(), role },
      })

      setMembers((current) => [...current, result.member])
      setEmail('')
      setRole('editor')
      setIsInviteOpen(false)
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, t('Could not add the member.')),
      )
    } finally {
      setIsAdding(false)
    }
  }

  async function handleRoleChange(
    userId: string,
    nextRole: ProjectRole,
  ): Promise<void> {
    setErrorMessage(null)
    setPendingUserId(userId)

    try {
      await updateProjectMemberRole({
        data: { projectId: project.id, userId, role: nextRole },
      })

      setMembers((current) =>
        current.map((member) =>
          member.userId === userId ? { ...member, role: nextRole } : member,
        ),
      )
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not change the role.'),
      )
    } finally {
      setPendingUserId(null)
    }
  }

  async function handleRemove(userId: string): Promise<void> {
    setErrorMessage(null)
    setPendingUserId(userId)

    try {
      await removeProjectMember({
        data: { projectId: project.id, userId },
      })

      setMembers((current) =>
        current.filter((member) => member.userId !== userId),
      )
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not remove the member.'),
      )
    } finally {
      setPendingUserId(null)
      setRemoveConfirmUserId((current) => (current === userId ? null : current))
    }
  }

  const removeTarget =
    members.find((member) => member.userId === removeConfirmUserId) ?? null

  return (
    <main className="workspace-view members-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            eyebrow={null}
            description={t('Who has access to the project and what they can do.')}
            actions={
              <>
                <Badge variant="primary">{pluralizeMembers(members.length, language)}</Badge>
                {isOwner ? (
                  <Button
                    variant="primary"
                    onClick={() => setIsInviteOpen((current) => !current)}
                    aria-expanded={isInviteOpen}
                  >
                    <Plus size={16} aria-hidden="true" />{t('Add member')}</Button>
                ) : null}
              </>
            }
          />

          {errorMessage ? (
            <Alert variant="danger" title={t('Members')}>
              {errorMessage}
            </Alert>
          ) : null}

          {isOwner && isInviteOpen ? (
            <Panel className="members-invite">
              <div className="members-invite__head">
                <WorkspaceSectionHeader
                  dense
                  title={t('Add member')}
                  description={t('Add an already registered user by email and choose their role.')}
                />
                <button
                  type="button"
                  className="members-icon-btn"
                  aria-label={t('Close form')}
                  onClick={() => setIsInviteOpen(false)}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <form className="members-invite__row" onSubmit={handleAddMember}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t('teammate@example.com')}
                  aria-label={t('User email')}
                  autoFocus
                />
                <div
                  className="members-rolepick"
                  role="radiogroup"
                  aria-label={t('Role')}
                >
                  {ROLE_ORDER.map((value) => {
                    const { Icon, label } = ROLE_META[value]

                    return (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={role === value}
                        className={cx(
                          'members-rolepick__item',
                          `members-role--${value}`,
                          role === value && 'is-active',
                        )}
                        onClick={() => setRole(value)}
                      >
                        <Icon size={14} aria-hidden="true" />
                        {t(label)}
                      </button>
                    )
                  })}
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isAdding || email.trim().length === 0}
                >
                  {isAdding ? t('Adding...') : t('Add')}
                </Button>
              </form>

              <p className="members-invite__hint">
                <Info size={14} aria-hidden="true" />
                <span>
                  {t(ROLE_META[role].label)} — {t(ROLE_META[role].description)}
                </span>
              </p>
            </Panel>
          ) : null}

          <div className="members-roles">
            {ROLE_ORDER.map((value) => {
              const { Icon, label, description } = ROLE_META[value]

              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={roleFilter === value}
                  className={cx(
                    'members-role-card',
                    `members-role--${value}`,
                    roleFilter === value && 'is-active',
                  )}
                  onClick={() => toggleRoleFilter(value)}
                >
                  <span className="members-role-card__icon">
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <span className="members-role-card__name">{t(label)}</span>
                  <span className="members-role-card__count">
                    {roleCounts[value]}
                  </span>
                  <span className="members-role-card__desc">{t(description)}</span>
                </button>
              )
            })}
          </div>

          <Panel className="members-panel">
            <div className="members-panel__head">
              <WorkspaceSectionHeader
                dense
                title={t('Members')}
                description={
                  isOwner
                    ? t('Change roles or remove members. The project must keep at least one owner.')
                    : t('People who have access to this project.')
                }
              />
            </div>

            <div className="members-toolbar">
              <label className="members-search">
                <Search size={16} aria-hidden="true" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('Search by name or email')}
                  aria-label={t('Search members')}
                />
              </label>
              {roleFilter ? (
                <span className="members-filter-note">{t('Showing:')}{' '}{t(ROLE_META[roleFilter].label)} ·{' '}
                  {visibleMembers.length}
                  <button
                    type="button"
                    className="members-link"
                    onClick={() => setRoleFilter(null)}
                  >{t('Reset')}</button>
                </span>
              ) : null}
            </div>

            {members.length === 0 ? (
              <div className="members-empty">{t('There are no members in this project yet.')}</div>
            ) : (
              <div className="members-table">
                <TableHead
                  columns={MEMBERS_TABLE_COLUMNS}
                  minWidth="38rem"
                  padding="md"
                >
                  <span>{t('Member')}</span>
                  <span>{t('Role')}</span>
                  <span className="text-right">{t('Actions')}</span>
                </TableHead>

                {visibleMembers.length === 0 ? (
                  <div className="members-empty">{t('Nobody found.')}</div>
                ) : (
                  visibleMembers.map((member) => {
                    const isLastOwner =
                      member.role === 'owner' && ownerCount <= 1
                    const isBusy = pendingUserId === member.userId
                    const isYou = member.userId === currentUserId

                    return (
                      <TableRow
                        key={member.userId}
                        columns={MEMBERS_TABLE_COLUMNS}
                        minWidth="38rem"
                        padding="md"
                      >
                        <div className="members-person">
                          <span
                            className="members-avatar"
                            style={{ background: avatarColor(member.userId) }}
                            aria-hidden="true"
                          >
                            {memberInitial(member.name, member.email)}
                          </span>
                          <div className="members-person__copy">
                            <div className="members-person__name">
                              <span className="truncate">{member.name}</span>
                              {isYou ? (
                                <span className="members-you">{t('You')}</span>
                              ) : null}
                            </div>
                            <div className="members-person__email">
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isOwner && !isLastOwner ? (
                            <SelectMenu
                              value={member.role}
                              onValueChange={(value) =>
                                handleRoleChange(
                                  member.userId,
                                  value as ProjectRole,
                                )
                              }
                              options={buildRoleOptions(t)}
                              disabled={isBusy}
                              className={cx(
                                'members-role-select',
                                `members-role--${member.role}`,
                              )}
                              aria-label={t('Role: {name}', { name: member.name })}
                            />
                          ) : (
                            <RolePill
                              role={member.role}
                              locked={isLastOwner}
                              title={
                                isLastOwner
                                  ? t('The project must keep at least one owner')
                                  : undefined
                              }
                            />
                          )}
                        </div>

                        <div className="members-actions">
                          {isOwner ? (
                            isLastOwner ? (
                              <span
                                className="members-icon-btn is-locked"
                                title={t('The last owner cannot be removed')}
                              >
                                <Lock size={16} aria-hidden="true" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="members-icon-btn is-danger"
                                title={t('Remove from project')}
                                aria-label={t('Remove: {name}', { name: member.name })}
                                disabled={isBusy}
                                onClick={() =>
                                  setRemoveConfirmUserId(member.userId)
                                }
                              >
                                <UserMinus size={16} aria-hidden="true" />
                              </button>
                            )
                          ) : null}
                        </div>
                      </TableRow>
                    )
                  })
                )}
              </div>
            )}

            {isOwner && members.length === 1 ? (
              <div className="members-alone">
                <span className="members-alone__icon">
                  <Users size={18} aria-hidden="true" />
                </span>
                <div>
                  <strong>{t('You are the only member so far')}</strong>
                  <span>{t('Add teammates by email so they can work with cases and runs.')}</span>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsInviteOpen(true)}
                >
                  <Plus size={16} aria-hidden="true" />{t('Add')}</Button>
              </div>
            ) : null}

            <div className="members-footnote">
              <Lock size={14} aria-hidden="true" />{t('The last owner cannot be removed or demoted — assign another owner first.')}</div>
          </Panel>

          <ConfirmDialog
            open={removeConfirmUserId !== null}
            title={t('Remove member?')}
            description={
              removeTarget ? (
                <>{t('Delete')}{' '}
                  <strong className="text-[var(--tms-text)]">
                    {removeTarget.name}
                  </strong>{' '}
                  ({removeTarget.email}{t(') from the project? Access will be revoked immediately.')}</>
              ) : null
            }
            confirmLabel={t('Delete')}
            cancelLabel="Cancel"
            confirmVariant="danger"
            isPending={
              pendingUserId !== null && pendingUserId === removeConfirmUserId
            }
            pendingLabel={t('Deleting...')}
            onConfirm={() => {
              if (removeConfirmUserId) {
                void handleRemove(removeConfirmUserId)
              }
            }}
            onCancel={() => setRemoveConfirmUserId(null)}
          />
        </div>
      </div>
    </main>
  )
}
