import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { EmptyState } from '../components/ui/EmptyState'
import { LinkButton } from '../components/ui/LinkButton'
import { Panel } from '../components/ui/Panel'
import { getRunsForProject } from '../features/runs/server'
import { getDashboardState } from '../features/tests/server'
import { useT } from '../lib/i18n'

export const Route = createFileRoute('/project/$projectSlug')({
  loader: async ({ params }) => {
    const projectSlug = params.projectSlug.trim()

    if (!projectSlug) {
      throw notFound()
    }

    const numericProjectId = Number(projectSlug)

    if (Number.isInteger(numericProjectId) && numericProjectId > 0) {
      const legacyDashboard = await getDashboardState({
        data: {
          projectId: numericProjectId,
        },
      })

      const legacyProject =
        legacyDashboard.projects.find((item) => item.id === numericProjectId) ??
        null

      if (!legacyProject?.slug) {
        throw notFound()
      }

      if (legacyProject.slug !== projectSlug) {
        throw redirect({
          to: '/project/$projectSlug',
          params: {
            projectSlug: legacyProject.slug,
          },
          replace: true,
        })
      }
    }

    const dashboard = await getDashboardState({
      data: {
        projectSlug,
      },
    })

    const project =
      dashboard.projects.find((item) => item.slug === projectSlug) ?? null

    const selectedProjectId = dashboard.selectedProjectId ?? project?.id ?? null

    if (!project || !selectedProjectId) {
      throw notFound()
    }

    const runsState = await getRunsForProject({
      data: {
        projectId: selectedProjectId,
      },
    })

    return {
      project,
      dashboard,
      runs: runsState.runs,
    }
  },
  component: ProjectOverviewPage,
})

type RunStatusTone = 'passed' | 'failed' | 'blocked' | 'progress' | 'idle'

function deriveRunStatus(run: {
  total: number
  passed: number
  failed: number
  blocked: number
  notRun: number
}): { label: string; tone: RunStatusTone } {
  const executed = run.passed + run.failed + run.blocked

  if (run.total === 0) {
    return { label: 'Empty', tone: 'idle' }
  }

  if (executed === 0) {
    return { label: 'Not started', tone: 'idle' }
  }

  if (run.notRun > 0) {
    return { label: 'In progress', tone: 'progress' }
  }

  if (run.failed > 0) {
    return { label: 'Needs review', tone: 'failed' }
  }

  if (run.blocked > 0) {
    return { label: 'Blocked', tone: 'blocked' }
  }

  return { label: 'Passed', tone: 'passed' }
}

function runToneChipClass(tone: RunStatusTone): string {
  if (tone === 'passed') return 'tms-chip-run-passed'
  if (tone === 'failed') return 'tms-chip-run-failed'
  if (tone === 'blocked') return 'tms-chip-run-blocked'
  if (tone === 'progress') return 'tms-chip-primary'
  return 'tms-chip-run-not-run'
}

type KpiTone = 'good' | 'caution' | 'risk'

const KPI_GOOD_THRESHOLD = 80
const KPI_CAUTION_THRESHOLD = 40

function kpiTone(percent: number): KpiTone {
  if (percent >= KPI_GOOD_THRESHOLD) return 'good'
  if (percent >= KPI_CAUTION_THRESHOLD) return 'caution'
  return 'risk'
}

function OnboardingStep({
  step,
  title,
  description,
}: {
  step: string
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] p-4">
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--tms-primary)] text-sm font-semibold text-white">
        {step}
      </span>
      <div>
        <p className="m-0 text-sm font-semibold text-[var(--tms-text)]">
          {title}
        </p>
        <p className="m-0 mt-0.5 text-sm leading-5 text-[var(--tms-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  )
}

function ProjectOverviewPage() {
  const t = useT()

  const { project, dashboard, runs } = Route.useLoaderData()
  const { projectSlug: routeProjectSlug } = Route.useParams()
  const location = useLocation()
  const projectRootPath = `/project/${routeProjectSlug}`
  const currentPath = location.pathname.replace(/\/+$/, '')

  if (currentPath !== projectRootPath) {
    return <Outlet />
  }

  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const totalActive = activeTests.length
  const readyCases = activeTests.filter((test) => test.status === 'Ready').length
  const readiness =
    totalActive > 0 ? Math.round((readyCases / totalActive) * 100) : 0
  const projectSlug = project.slug ?? project.id.toString()

  const recentRuns = [...runs].sort((a, b) => b.id - a.id).slice(0, 5)
  const activeRuns = runs.filter((run) => run.total > 0 && run.notRun > 0).length
  const executedTotal = runs.reduce(
    (sum, run) => sum + run.passed + run.failed + run.blocked,
    0,
  )
  const passedTotal = runs.reduce((sum, run) => sum + run.passed, 0)
  const passRate =
    executedTotal > 0 ? Math.round((passedTotal / executedTotal) * 100) : 0
  const isEmptyProject = dashboard.tests.length === 0 && runs.length === 0
  const readinessTone = kpiTone(readiness)
  const passRateTone = kpiTone(passRate)

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            eyebrow={null}
            description={t('At-a-glance readiness and recent execution health.')}
            actions={
              <>
                <LinkButton
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug }}
                  variant="secondary"
                >{t('Open repository')}</LinkButton>
                <LinkButton
                  to="/project/$projectSlug/runs"
                  params={{ projectSlug }}
                  variant="primary"
                >{t('Open runs')}</LinkButton>
              </>
            }
          />

          {isEmptyProject ? (
            <Panel className="overview-panel px-6 py-8">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="m-0 text-lg font-semibold text-[var(--tms-text)]">{t('Let\'s set up {name}', { name: project.name })}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--tms-text-muted)]">{t('This project is empty. Follow these steps to start tracking your testing.')}</p>
              </div>
              <div className="mx-auto mt-6 grid max-w-2xl gap-3">
                <OnboardingStep
                  step="1"
                  title={t('Create a suite')}
                  description={t('Group related test cases into a suite in the repository.')}
                />
                <OnboardingStep
                  step="2"
                  title={t('Add test cases')}
                  description={t('Write manual cases with clear steps and expected results.')}
                />
                <OnboardingStep
                  step="3"
                  title={t('Run and track')}
                  description={t('Create a run to execute cases and watch the pass rate.')}
                />
              </div>
              <div className="mx-auto mt-6 flex max-w-2xl justify-center">
                <LinkButton
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug }}
                  variant="primary"
                >{t('Open repository to start')}</LinkButton>
              </div>
            </Panel>
          ) : (
            <>
          <section className="overview-kpis">
            <article className={`overview-kpi overview-kpi--${readinessTone}`}>
              <span className="overview-kpi__label">{t('Readiness')}</span>
              <span className={`overview-kpi__value overview-kpi__value--${readinessTone}`}>
                {readiness}%
              </span>
              <span className="overview-kpi__sub">{t('{readyCases} of {totalActive} ready', { readyCases, totalActive })}</span>
              <span className="overview-kpi__bar">
                <span
                  className={`overview-kpi__bar-fill overview-kpi__bar-fill--${readinessTone}`}
                  style={{ width: `${readiness}%` }}
                />
              </span>
            </article>

            <article className="overview-kpi">
              <span className="overview-kpi__label">{t('Test cases')}</span>
              <span className="overview-kpi__value">{totalActive}</span>
              <span className="overview-kpi__sub">{t('across {length} suites', { length: dashboard.sections.length })}</span>
            </article>

            <article className="overview-kpi">
              <span className="overview-kpi__label">{t('Runs')}</span>
              <span className="overview-kpi__value">{runs.length}</span>
              <span className="overview-kpi__sub">{t('{activeRuns} in progress', { activeRuns })}</span>
            </article>

            <article className={`overview-kpi overview-kpi--${passRateTone}`}>
              <span className="overview-kpi__label">{t('Pass rate')}</span>
              <span className={`overview-kpi__value overview-kpi__value--${passRateTone}`}>
                {passRate}%
              </span>
              <span className="overview-kpi__sub">{t('{executedTotal} executed', { executedTotal })}</span>
              <span className="overview-kpi__bar">
                <span
                  className={`overview-kpi__bar-fill overview-kpi__bar-fill--${passRateTone}`}
                  style={{ width: `${passRate}%` }}
                />
              </span>
            </article>
          </section>

          <Panel className="overview-panel px-4 py-4">
            <WorkspaceSectionHeader
              dense
              title={t('Recent runs')}
              description={t('Latest execution activity and pass health.')}
              actions={
                <Link
                  to="/project/$projectSlug/runs"
                  params={{ projectSlug }}
                  className="tms-button min-h-0 px-2.5 py-1 text-xs no-underline"
                >{t('View all runs')}</Link>
              }
              className="mb-3"
            />

            {recentRuns.length === 0 ? (
              <EmptyState
                title={t('No runs yet')}
                description={t('Execution runs will appear here once created.')}
              />
            ) : (
              <div className="overview-runs">
                {recentRuns.map((run) => {
                  const status = deriveRunStatus(run)
                  const executed = run.passed + run.failed + run.blocked
                  const progress =
                    run.total > 0 ? Math.round((executed / run.total) * 100) : 0
                  const widthOf = (value: number) =>
                    run.total > 0 ? `${(value / run.total) * 100}%` : '0%'

                  return (
                    <Link
                      key={run.id}
                      to="/run/$runId"
                      params={{ runId: run.id.toString() }}
                      className="overview-run-row no-underline"
                    >
                      <div className="overview-run-row__head">
                        <span className="overview-run-row__name">{run.name}</span>
                        <span
                          className={`overview-run-row__status ${runToneChipClass(
                            status.tone,
                          )}`}
                        >
                          {t(status.label)}
                        </span>
                      </div>
                      <div className="overview-run-row__progress">
                        <span className="overview-run-row__percent">
                          {progress}%
                        </span>
                        <span className="tms-run-progress-track overview-run-row__track">
                          <span
                            className="tms-run-progress-segment tms-run-progress-segment--passed"
                            style={{ width: widthOf(run.passed) }}
                          />
                          <span
                            className="tms-run-progress-segment tms-run-progress-segment--failed"
                            style={{ width: widthOf(run.failed) }}
                          />
                          <span
                            className="tms-run-progress-segment tms-run-progress-segment--blocked"
                            style={{ width: widthOf(run.blocked) }}
                          />
                        </span>
                      </div>
                      <div className="overview-run-row__meta">
                        <span>{t('{total} cases', { total: run.total })}</span>
                        <span className="overview-run-row__dot overview-run-row__dot--passed">{t('{passed} passed', { passed: run.passed })}</span>
                        <span className="overview-run-row__dot overview-run-row__dot--failed">{t('{failed} failed', { failed: run.failed })}</span>
                        <span className="overview-run-row__dot overview-run-row__dot--blocked">{t('{blocked} blocked', { blocked: run.blocked })}</span>
                        <span className="overview-run-row__dot">{t('{notRun} not run', { notRun: run.notRun })}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </Panel>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
