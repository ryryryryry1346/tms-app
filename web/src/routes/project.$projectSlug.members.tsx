import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import { Select } from '../components/ui/Select'
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
  updateProjectMemberRole,
  type ProjectMemberSummary,
} from '../features/projects/server'
import { getDashboardState } from '../features/tests/server'

type ProjectRole = 'owner' | 'editor' | 'viewer'

const ROLE_OPTIONS: Array<{ value: ProjectRole; label: string }> = [
  { value: 'owner', label: 'Owner' },
  { value: 'editor', label: 'Editor' },
  { value: 'viewer', label: 'Viewer' },
]

const ROLE_DESCRIPTION: Record<ProjectRole, string> = {
  owner: 'Manage members, settings, API tokens, and delete the project.',
  editor: 'Create and edit test cases, runs, docs, and automation links.',
  viewer: 'Read-only access to everything in the project.',
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
    }
  },
  component: ProjectMembersPage,
})

function ProjectMembersPage() {
  const { project, members: initialMembers, currentUserRole } =
    Route.useLoaderData()

  const [members, setMembers] = useState<ProjectMemberSummary[]>(initialMembers)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('editor')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)

  const isOwner = currentUserRole === 'owner'
  const ownerCount = members.filter((member) => member.role === 'owner').length

  async function handleAddMember(): Promise<void> {
    setErrorMessage(null)
    setIsAdding(true)

    try {
      const result = await addProjectMember({
        data: { projectId: project.id, email: email.trim(), role },
      })

      setMembers((current) => [...current, result.member])
      setEmail('')
      setRole('editor')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not add member.',
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
        error instanceof Error ? error.message : 'Could not update role.',
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
        error instanceof Error ? error.message : 'Could not remove member.',
      )
    } finally {
      setPendingUserId(null)
    }
  }

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            description="Control who can access this project and what they can do."
            actions={
              <Badge variant="primary">
                {members.length} member{members.length === 1 ? '' : 's'}
              </Badge>
            }
          />

          {errorMessage ? (
            <Alert variant="danger" title="Members">
              {errorMessage}
            </Alert>
          ) : null}

          {isOwner ? (
            <Panel className="px-5 py-5">
              <WorkspaceSectionHeader
                title="Add member"
                description="Add an existing registered user by email and choose their role."
                className="mb-4"
              />

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@example.com"
                />
                <Select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as ProjectRole)
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="primary"
                  disabled={isAdding || email.trim().length === 0}
                  onClick={handleAddMember}
                >
                  {isAdding ? 'Adding...' : 'Add member'}
                </Button>
              </div>

              <p className="m-0 mt-2 text-xs text-[var(--tms-text-muted)]">
                {ROLE_DESCRIPTION[role]}
              </p>
            </Panel>
          ) : null}

          <Panel className="px-5 py-5">
            <WorkspaceSectionHeader
              title="Members"
              description={
                isOwner
                  ? 'Change roles or remove members. A project must keep at least one owner.'
                  : 'People with access to this project.'
              }
              className="mb-4"
            />

            {members.length === 0 ? (
              <EmptyState
                title="No members yet"
                description="Add a teammate to give them access to this project."
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--tms-border-subtle)]">
                <div className="grid grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_150px_auto] gap-3 border-b border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--tms-text-muted)]">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Role</span>
                  <span className="text-right">Actions</span>
                </div>
                {members.map((member) => {
                  const isLastOwner =
                    member.role === 'owner' && ownerCount <= 1
                  const isBusy = pendingUserId === member.userId

                  return (
                    <div
                      key={member.userId}
                      className="grid grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_150px_auto] items-center gap-3 border-b border-[var(--tms-border-subtle)] px-4 py-3 last:border-b-0"
                    >
                      <span className="font-semibold text-[var(--tms-text)]">
                        {member.name}
                      </span>
                      <span className="truncate text-sm text-[var(--tms-text-muted)]">
                        {member.email}
                      </span>
                      <div>
                        {isOwner ? (
                          <Select
                            size="sm"
                            value={member.role}
                            disabled={isBusy || isLastOwner}
                            onChange={(event) =>
                              handleRoleChange(
                                member.userId,
                                event.target.value as ProjectRole,
                              )
                            }
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <Badge
                            variant={
                              member.role === 'owner' ? 'primary' : 'draft'
                            }
                          >
                            {member.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-end">
                        {isOwner ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={isBusy || isLastOwner}
                            onClick={() => handleRemove(member.userId)}
                          >
                            {isBusy ? 'Working...' : 'Remove'}
                          </Button>
                        ) : (
                          <span className="text-xs text-[var(--tms-text-muted)]">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </main>
  )
}
