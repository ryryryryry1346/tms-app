import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
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
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
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
    setIsSubmittingProject(true)

    try {
      await createProject({
        data: {
          name,
        },
      })

      setName('')
      await router.invalidate()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create project.'
      setProjectErrorMessage(message)
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
      const message =
        error instanceof Error ? error.message : 'Failed to delete project.'
      setProjectErrorMessage(message)
    } finally {
      setDeleteConfirmProjectId((current) =>
        current === projectId ? null : current,
      )
      setDeleteConfirmName('')
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
      const message =
        error instanceof Error ? error.message : 'Failed to archive project.'
      setProjectErrorMessage(message)
    } finally {
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
      const message =
        error instanceof Error ? error.message : 'Failed to restore project.'
      setProjectErrorMessage(message)
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
                  Create and manage TMS workspaces without extra chrome or dead-end
                  controls.
                </p>
              </div>
            </div>
          </header>

          <Panel className="workspace-home__panel">
            <div className="workspace-home__panel-header">
              <div className="workspace-home__panel-copy">
                <p className="workspace-section-header__eyebrow">Projects</p>
                <h2 className="workspace-home__panel-title">Workspace projects</h2>
                <p className="workspace-home__panel-description">
                  Keep the project list compact and focused on the workspaces your
                  team actually uses.
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
                disabled={isSubmittingProject || !dashboard.databaseConfigured}
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
                      <div className="workspace-home__project-main">
                        <div className="workspace-home__project-copy">
                          <div className="workspace-home__project-topline">
                            <Link
                              to="/project/$projectSlug"
                              params={{ projectSlug }}
                              className="workspace-home__project-name-link"
                            >
                              {project.name}
                            </Link>
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
                            Open the project workspace to manage repository, runs,
                            and reports.
                          </p>
                        </div>
                        <div className="workspace-home__project-actions">
                          {project.status === 'Archived' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => handleProjectRestore(project.id)}
                                disabled={restoringProjectId === project.id}
                              >
                                {restoringProjectId === project.id
                                  ? 'Restoring...'
                                  : 'Restore'}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                onClick={() => {
                                  setDeleteConfirmProjectId((current) =>
                                    current === project.id ? null : project.id,
                                  )
                                  setDeleteConfirmName('')
                                }}
                                disabled={deletingProjectId === project.id}
                              >
                                {deletingProjectId === project.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </Button>
                            </>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="warning"
                              onClick={() => handleProjectArchive(project.id)}
                              disabled={archivingProjectId === project.id}
                            >
                              {archivingProjectId === project.id
                                ? 'Archiving...'
                                : 'Archive'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {deleteConfirmProjectId === project.id ? (
                        <Alert variant="danger" className="workspace-home__delete-alert">
                          <div className="workspace-home__delete-stack">
                            <p className="m-0">
                              Delete project <strong>{project.name}</strong> permanently?
                              This also removes its suites, test cases, and runs.
                            </p>
                            <label className="workspace-home__delete-field">
                              <span className="workspace-home__delete-label">
                                Type the project name to confirm
                              </span>
                              <Input
                                value={deleteConfirmName}
                                onChange={(event) =>
                                  setDeleteConfirmName(event.target.value)
                                }
                                placeholder={project.name}
                              />
                            </label>
                            <div className="workspace-home__delete-actions">
                              <Button
                                type="button"
                                onClick={() => handleProjectDelete(project.id)}
                                disabled={
                                  deletingProjectId === project.id ||
                                  deleteConfirmName.trim() !== project.name
                                }
                                variant="danger"
                              >
                                {deletingProjectId === project.id
                                  ? 'Deleting...'
                                  : 'Confirm delete'}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setDeleteConfirmProjectId(null)
                                  setDeleteConfirmName('')
                                }}
                                disabled={deletingProjectId === project.id}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </Alert>
                      ) : null}
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
