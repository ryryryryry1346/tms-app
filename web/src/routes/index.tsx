import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { Panel } from '../components/ui/Panel'
import {
  archiveProject,
  createProject,
  deleteProject,
  restoreProject,
} from '../features/projects/server'
import { getDashboardState } from '../features/tests/server'
import { getErrorMessage } from '../lib/errors'

export const Route = createFileRoute('/')({
  loader: async () =>
    getDashboardState({
      data: {},
    }),
  component: WorkspacePage,
})

function WorkspacePage() {
  const dashboard = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState('')
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [deletingProjectId, setDeletingProjectId] = useState<number | null>(null)
  const [archivingProjectId, setArchivingProjectId] = useState<number | null>(null)
  const [restoringProjectId, setRestoringProjectId] = useState<number | null>(null)
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<number | null>(
    null,
  )
  const [archiveConfirmProjectId, setArchiveConfirmProjectId] = useState<
    number | null
  >(null)
  const [projectFilter, setProjectFilter] = useState<'Active' | 'Archived'>(
    'Active',
  )
  const [projectErrorMessage, setProjectErrorMessage] = useState<string | null>(
    null,
  )

  async function handleProjectSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    setProjectErrorMessage(null)

    const trimmedName = name.trim()

    if (!trimmedName) {
      setProjectErrorMessage('Enter a project name.')
      return
    }

    setIsSubmittingProject(true)

    try {
      await createProject({
        data: {
          name: trimmedName,
        },
      })

      setName('')
      await router.invalidate()
    } catch (error) {
      setProjectErrorMessage(getErrorMessage(error, 'Failed to create project.'))
    } finally {
      setIsSubmittingProject(false)
    }
  }

  async function handleProjectDelete(projectId: number): Promise<void> {
    setProjectErrorMessage(null)
    setDeletingProjectId(projectId)

    try {
      await deleteProject({
        data: {
          projectId,
        },
      })

      await router.invalidate()
    } catch (error) {
      setProjectErrorMessage(getErrorMessage(error, 'Failed to delete project.'))
    } finally {
      setDeleteConfirmProjectId((current) =>
        current === projectId ? null : current,
      )
      setDeletingProjectId(null)
    }
  }

  async function handleProjectArchive(projectId: number): Promise<void> {
    setProjectErrorMessage(null)
    setArchivingProjectId(projectId)

    try {
      await archiveProject({
        data: {
          projectId,
        },
      })

      await router.invalidate()
    } catch (error) {
      setProjectErrorMessage(getErrorMessage(error, 'Failed to archive project.'))
    } finally {
      setArchiveConfirmProjectId((current) =>
        current === projectId ? null : current,
      )
      setArchivingProjectId(null)
    }
  }

  async function handleProjectRestore(projectId: number): Promise<void> {
    setProjectErrorMessage(null)
    setRestoringProjectId(projectId)

    try {
      await restoreProject({
        data: {
          projectId,
        },
      })

      await router.invalidate()
    } catch (error) {
      setProjectErrorMessage(getErrorMessage(error, 'Failed to restore project.'))
    } finally {
      setRestoringProjectId(null)
    }
  }

  const visibleProjects = dashboard.projects.filter((project) => {
    const normalizedStatus = project.status === 'Archived' ? 'Archived' : 'Active'
    return normalizedStatus === projectFilter
  })

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack workspace-home">
          <header className="workspace-page-header">
            <div className="workspace-page-header__body">
              <div className="workspace-page-header__copy">
                <p className="workspace-page-header__eyebrow">Workspace</p>
                <h1 className="workspace-page-header__title">Projects</h1>
                <p className="workspace-page-header__description">
                  Create a project and open its workspace — test cases, runs,
                  automation, and docs.
                </p>
              </div>
            </div>
          </header>

          <Panel className="workspace-home__panel">
            <div className="workspace-home__panel-header">
              <div className="workspace-home__panel-copy">
                <p className="workspace-section-header__eyebrow">Projects</p>
                <h2 className="workspace-home__panel-title">Your projects</h2>
                <p className="workspace-home__panel-description">
                  Open a project to work on it. Switch to Archived to see projects
                  you&apos;ve set aside.
                </p>
              </div>
              <div className="workspace-home__panel-meta">
                <Badge>
                  {visibleProjects.length} project
                  {visibleProjects.length === 1 ? '' : 's'}
                </Badge>
                <div className="workspace-home__filter-switch">
                  {(['Active', 'Archived'] as const).map((filterValue) => (
                    <Button
                      key={filterValue}
                      type="button"
                      size="sm"
                      variant={
                        projectFilter === filterValue
                          ? filterValue === 'Archived'
                            ? 'warning'
                            : 'primary'
                          : 'secondary'
                      }
                      className={`workspace-home__filter-button ${
                        filterValue === 'Archived'
                          ? 'workspace-home__filter-button--archived'
                          : ''
                      }`}
                      onClick={() => setProjectFilter(filterValue)}
                    >
                      {filterValue}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <form className="workspace-home__create-row" onSubmit={handleProjectSubmit}>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                size="lg"
                className="min-w-0 flex-1"
                placeholder="New project"
              />
              <Button
                type="submit"
                disabled={
                  isSubmittingProject ||
                  !dashboard.databaseConfigured ||
                  !name.trim()
                }
                variant="primary"
                className="workspace-home__create-button"
              >
                {isSubmittingProject ? 'Creating...' : 'Create project'}
              </Button>
            </form>

            {projectErrorMessage ? (
              <Alert variant="danger" className="workspace-home__alert">
                {projectErrorMessage}
              </Alert>
            ) : null}

            {!dashboard.databaseConfigured ? (
              <Alert variant="warning" className="workspace-home__alert">
                <strong>Database is not configured yet.</strong> Set
                <code> MYSQL_DATABASE_URL </code>
                and run the Drizzle migration before using the workspace against
                MySQL.
              </Alert>
            ) : visibleProjects.length === 0 ? (
              <div className="workspace-home__empty">
                <EmptyState
                  title={
                    projectFilter === 'Archived'
                      ? 'No archived projects yet'
                      : 'No active projects yet'
                  }
                  description={
                    projectFilter === 'Archived'
                      ? 'Archived projects will appear here.'
                      : 'Create the first one to start structuring suites, cases, and runs.'
                  }
                />
              </div>
            ) : (
              <div className="workspace-home__project-list">
                {visibleProjects.map((project) => {
                  const projectSlug =
                    project.slug && project.slug.trim().length > 0
                      ? project.slug
                      : project.id.toString()

                  return (
                    <div key={project.id} className="workspace-home__project-row">
                      <Link
                        to="/project/$projectSlug"
                        params={{ projectSlug }}
                        className="workspace-home__project-main workspace-home__project-main--clickable"
                        aria-label={`Open ${project.name} workspace`}
                      >
                        <div className="workspace-home__project-copy">
                          <div className="workspace-home__project-topline">
                            <span className="workspace-home__project-name">
                              {project.name}
                            </span>
                            <Badge
                              variant={
                                project.status === 'Archived'
                                  ? 'warning'
                                  : 'statusReady'
                              }
                            >
                              {project.status === 'Archived' ? 'Archived' : 'Active'}
                            </Badge>
                          </div>
                          <p className="workspace-home__project-subtitle">
                            Open to manage test cases, runs, automation, and docs.
                          </p>
                        </div>
                      </Link>
                      <div className="workspace-home__project-actions">
                        {project.status === 'Archived' ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={restoringProjectId === project.id}
                              onClick={() => handleProjectRestore(project.id)}
                            >
                              {restoringProjectId === project.id
                                ? 'Restoring...'
                                : 'Restore'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              disabled={deletingProjectId === project.id}
                              onClick={() => setDeleteConfirmProjectId(project.id)}
                            >
                              Delete
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={archivingProjectId === project.id}
                            onClick={() => setArchiveConfirmProjectId(project.id)}
                          >
                            {archivingProjectId === project.id
                              ? 'Archiving...'
                              : 'Archive'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>

          <ConfirmDialog
            open={deleteConfirmProjectId !== null}
            title="Delete project permanently?"
            description={
              <>
                Deleting{' '}
                <strong className="text-[var(--tms-text)]">
                  {dashboard.projects.find(
                    (project) => project.id === deleteConfirmProjectId,
                  )?.name ?? 'this project'}
                </strong>{' '}
                also removes its suites, test cases, and runs. This cannot be
                undone.
              </>
            }
            confirmLabel="Delete permanently"
            confirmVariant="danger"
            isPending={
              deletingProjectId !== null &&
              deletingProjectId === deleteConfirmProjectId
            }
            pendingLabel="Deleting..."
            onConfirm={() => {
              if (deleteConfirmProjectId !== null) {
                void handleProjectDelete(deleteConfirmProjectId)
              }
            }}
            onCancel={() => setDeleteConfirmProjectId(null)}
          />

          <ConfirmDialog
            open={archiveConfirmProjectId !== null}
            title="Archive this project?"
            description={
              <>
                <strong className="text-[var(--tms-text)]">
                  {dashboard.projects.find(
                    (project) => project.id === archiveConfirmProjectId,
                  )?.name ?? 'This project'}
                </strong>{' '}
                will be hidden from the active list. You can restore it anytime
                from the Archived tab.
              </>
            }
            confirmLabel="Archive"
            confirmVariant="primary"
            isPending={
              archivingProjectId !== null &&
              archivingProjectId === archiveConfirmProjectId
            }
            pendingLabel="Archiving..."
            onConfirm={() => {
              if (archiveConfirmProjectId !== null) {
                void handleProjectArchive(archiveConfirmProjectId)
              }
            }}
            onCancel={() => setArchiveConfirmProjectId(null)}
          />
        </div>
      </div>
    </main>
  )
}
