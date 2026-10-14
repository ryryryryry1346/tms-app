import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Input } from '../components/ui/Input'
import { MetricCard } from '../components/ui/MetricCard'
import { Modal } from '../components/ui/Modal'
import { createProject } from '../features/projects/server'
import { getDashboardState } from '../features/tests/server'
import { getErrorMessage } from '../lib/errors'
import { useT } from '../lib/i18n'

export const Route = createFileRoute('/')({
  loader: async () =>
    getDashboardState({
      data: {},
    }),
  component: WorkspacePage,
})

function WorkspacePage() {
  const t = useT()

  const dashboard = Route.useLoaderData()
  const router = useRouter()
  const [name, setName] = useState('')
  const [isSubmittingProject, setIsSubmittingProject] = useState(false)
  const [projectFilter, setProjectFilter] = useState<'Active' | 'Archived'>(
    'Active',
  )
  const [projectErrorMessage, setProjectErrorMessage] = useState<string | null>(
    null,
  )
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  function openCreateModal(): void {
    setProjectErrorMessage(null)
    setName('')
    setIsCreateModalOpen(true)
  }

  function closeCreateModal(): void {
    setIsCreateModalOpen(false)
    setProjectErrorMessage(null)
  }

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
      setIsCreateModalOpen(false)
      await router.invalidate()
    } catch (error) {
      setProjectErrorMessage(getErrorMessage(error, 'Failed to create project.'))
    } finally {
      setIsSubmittingProject(false)
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
                <h1 className="workspace-page-header__title">{t('Projects')}</h1>
                <p className="workspace-page-header__description">{t('Open a project to manage its test cases, runs, automation, and docs.')}</p>
              </div>
              <div className="workspace-page-header__actions">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!dashboard.databaseConfigured}
                  onClick={openCreateModal}
                >
                  <Plus size={16} strokeWidth={2} aria-hidden="true" />{t('New project')}</Button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <MetricCard density="compact" label={t('Active')} value={dashboard.projects.filter((project) => project.status !== 'Archived').length} />
            <MetricCard
              density="compact"
              label={t('Archived')}
              value={dashboard.projects.filter((project) => project.status === 'Archived').length}
              tone="muted"
            />
            <MetricCard
              density="compact"
              label={t('Total')}
              value={dashboard.projects.length}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
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

          {projectErrorMessage ? (
            <Alert variant="danger" className="workspace-home__alert">
              {projectErrorMessage}
            </Alert>
          ) : null}

          {!dashboard.databaseConfigured ? (
            <Alert variant="warning" className="workspace-home__alert">
              <strong>{t('Database is not configured yet.')}</strong>{' '}{t('Set')}<code>{' '}{t('MYSQL_DATABASE_URL')}{' '}</code>{t('and run the Drizzle migration before using the workspace against MySQL.')}</Alert>
          ) : visibleProjects.length === 0 ? (
            <div className="workspace-home__empty">
              <EmptyState
                title={
                  projectFilter === 'Archived'
                    ? t('No archived projects yet')
                    : t('No active projects yet')
                }
                description={
                  projectFilter === 'Archived'
                    ? t('Archived projects will appear here.')
                    : t('Create the first one to start structuring suites, cases, and runs.')
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
                      aria-label={t('Open {name} workspace', { name: project.name })}
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
                            {project.status === 'Archived' ? t('Archived') : t('Active')}
                          </Badge>
                        </div>
                        <p className="workspace-home__project-subtitle">{t('Open to manage test cases, runs, automation, and docs.')}</p>
                      </div>
                    </Link>
                    <div className="workspace-home__project-actions">
                      <ChevronRight
                        size={18}
                        strokeWidth={2}
                        aria-hidden="true"
                        className="text-[var(--tms-text-muted)]"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Modal
            open={isCreateModalOpen}
            title={t('New project')}
            onClose={closeCreateModal}
          >
            <form className="grid gap-4" onSubmit={handleProjectSubmit}>
              <p className="m-0 text-sm text-[var(--tms-text-muted)]">{t('Creates an empty workspace for test cases, runs, automation, and docs.')}</p>
              <label className="grid gap-1.5">
                <span className="text-sm font-semibold text-[var(--tms-text)]">{t('Project name')}</span>
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  size="lg"
                  placeholder={t('e.g. Payments API')}
                />
              </label>
              {projectErrorMessage ? (
                <Alert variant="danger">{projectErrorMessage}</Alert>
              ) : null}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={closeCreateModal}>{t('Cancel')}</Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={
                    isSubmittingProject ||
                    !dashboard.databaseConfigured ||
                    !name.trim()
                  }
                >
                  {isSubmittingProject ? t('Creating...') : t('Create project')}
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </div>
    </main>
  )
}
