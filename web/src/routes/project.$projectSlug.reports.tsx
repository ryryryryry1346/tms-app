import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { ProjectPageHeader } from '../components/layout/ProjectPageHeader'
import { WorkspaceSectionHeader } from '../components/layout/WorkspaceSectionHeader'
import { MetricCard } from '../components/ui/MetricCard'
import { Panel } from '../components/ui/Panel'
import {
  getProjectQualityTrends,
  getRunsForProject,
  type ProjectRun,
} from '../features/runs/server'
import { getDashboardState } from '../features/tests/server'
import { useT } from '../lib/i18n'

type ReleaseReadiness = {
  name: string
  runs: number
  total: number
  passed: number
  failed: number
  blocked: number
  notRun: number
  executed: number
  passRate: number
}

function computeReleaseReadiness(runs: ProjectRun[]): ReleaseReadiness[] {
  const byRelease = new Map<string, ReleaseReadiness>()

  for (const run of runs) {
    if (!run.releaseName) {
      continue
    }

    const entry =
      byRelease.get(run.releaseName) ??
      ({
        name: run.releaseName,
        runs: 0,
        total: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        notRun: 0,
        executed: 0,
        passRate: 0,
      } satisfies ReleaseReadiness)

    entry.runs += 1
    entry.total += run.total
    entry.passed += run.passed
    entry.failed += run.failed
    entry.blocked += run.blocked
    entry.notRun += run.notRun

    byRelease.set(run.releaseName, entry)
  }

  return Array.from(byRelease.values())
    .map((entry) => ({
      ...entry,
      executed: entry.passed + entry.failed + entry.blocked,
      passRate:
        entry.total > 0 ? Math.round((entry.passed / entry.total) * 100) : 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export const Route = createFileRoute('/project/$projectSlug/reports')({
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
          to: '/project/$projectSlug/reports',
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

    const [runsState, trends] = await Promise.all([
      getRunsForProject({
        data: {
          projectId: selectedProjectId,
        },
      }),
      getProjectQualityTrends({
        data: {
          projectId: selectedProjectId,
        },
      }),
    ])

    return {
      project,
      dashboard,
      runs: runsState.runs,
      trends,
    }
  },
  component: ProjectReportsPage,
})

function ProjectReportsPage() {
  const t = useT()

  const { project, dashboard, runs, trends } = Route.useLoaderData()
  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const readyCases = activeTests.filter((test) => test.status === 'Ready').length
  const draftCases = activeTests.filter((test) => test.status === 'Draft').length
  const archivedCases = dashboard.tests.filter(
    (test) => test.status === 'Archived',
  ).length
  const readiness =
    activeTests.length > 0 ? Math.round((readyCases / activeTests.length) * 100) : 0
  const releaseReadiness = computeReleaseReadiness(runs)
  const maxExecuted = Math.max(1, ...trends.execution.map((w) => w.executed))
  const maxCumulative = Math.max(
    1,
    ...trends.repository.map((w) => w.cumulative),
  )
  const hasExecution = trends.execution.some((w) => w.executed > 0)

  const weekLabel = (weekStart: string) =>
    `${weekStart.slice(8, 10)}.${weekStart.slice(5, 7)}`

  return (
    <main className="workspace-view">
      <div className="workspace-view__inner">
        <div className="workspace-view__stack">
          <ProjectPageHeader
            projectName={project.name}
            eyebrow={null}
            description={t('Reporting workspace for quality trends, run outcomes, and project readiness.')}
          />

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: t('Readiness'), value: `${readiness}%`, tone: 'success' as const },
            { label: t('Ready'), value: readyCases, tone: 'primary' as const },
            { label: t('Draft'), value: draftCases, tone: 'muted' as const },
            { label: t('Archived'), value: archivedCases, tone: 'warning' as const },
            { label: t('Runs'), value: runs.length, tone: 'danger' as const },
          ].map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              tone={item.tone}
              density="compact"
            />
          ))}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            <Panel className="px-6 py-6">
              <WorkspaceSectionHeader
                title={t('Execution trend')}
                description={t('Executed cases and pass rate by week (8 weeks).')}
                className="mb-5"
              />
              {!hasExecution ? (
                <div className="rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-6 text-sm text-[var(--tms-text-muted)]">{t('No executed runs yet. The chart will appear as cases are executed.')}</div>
              ) : (
                <>
                  <div className="flex items-end gap-2" style={{ height: 120 }}>
                    {trends.execution.map((w) => (
                      <div
                        key={w.weekStart}
                        className="flex flex-1 flex-col items-center justify-end gap-1"
                        title={t('{v1} — {executed} executed, {passRate}% passed', { v1: weekLabel(w.weekStart), executed: w.executed, passRate: w.passRate })}
                      >
                        <span className="text-[10px] font-semibold text-[var(--tms-text-muted)]">
                          {w.executed || ''}
                        </span>
                        <div
                          className="relative w-full max-w-[26px] overflow-hidden rounded-t bg-[var(--tms-border-subtle)]"
                          style={{
                            height: `${Math.max(4, (w.executed / maxExecuted) * 96)}px`,
                          }}
                        >
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-[var(--tms-success)]"
                            style={{
                              height: `${w.executed > 0 ? (w.passed / w.executed) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex gap-2">
                    {trends.execution.map((w) => (
                      <div
                        key={w.weekStart}
                        className="flex-1 text-center text-[10px] text-[var(--tms-text-soft)]"
                      >
                        {weekLabel(w.weekStart)}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-[var(--tms-text-muted)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--tms-success)]" />{t('passed')}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--tms-border-subtle)]" />{t('not passed')}</span>
                  </div>
                </>
              )}
            </Panel>

            <Panel className="px-6 py-6">
              <WorkspaceSectionHeader
                title={t('Repository growth')}
                description={t('Cumulative number of test cases by week.')}
                className="mb-5"
              />
              <div className="flex items-end gap-2" style={{ height: 120 }}>
                {trends.repository.map((w) => (
                  <div
                    key={w.weekStart}
                    className="flex flex-1 flex-col items-center justify-end gap-1"
                    title={`${weekLabel(w.weekStart)} — ${t('total {count}', { count: w.cumulative })}${w.created ? `, +${w.created}` : ''}`}
                  >
                    <span className="text-[10px] font-semibold text-[var(--tms-primary)]">
                      {w.created ? `+${w.created}` : ''}
                    </span>
                    <div
                      className="w-full max-w-[26px] rounded-t bg-[var(--tms-primary)]"
                      style={{
                        height: `${Math.max(4, (w.cumulative / maxCumulative) * 96)}px`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex gap-2">
                {trends.repository.map((w) => (
                  <div
                    key={w.weekStart}
                    className="flex-1 text-center text-[10px] text-[var(--tms-text-soft)]"
                  >
                    {weekLabel(w.weekStart)}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs font-semibold text-[var(--tms-text-muted)]">{t('Total cases:')}{' '}
                <span className="text-[var(--tms-text)]">
                  {trends.repository.length > 0
                    ? trends.repository[trends.repository.length - 1].cumulative
                    : 0}
                </span>
              </div>
            </Panel>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
          <Panel className="px-6 py-6">
            <WorkspaceSectionHeader
              title={t('Release readiness')}
              description={t('Aggregated execution across every run linked to a release.')}
              className="mb-5"
            />

            {releaseReadiness.length === 0 ? (
              <div className="rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-6 text-sm text-[var(--tms-text-muted)]">{t('No runs are linked to a release yet. Pick a release when creating a run to see readiness here.')}</div>
            ) : (
              <div className="grid gap-3">
                {releaseReadiness.map((release) => (
                  <div
                    key={release.name}
                    className="rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[var(--tms-text)]">
                        {release.name}
                      </span>
                      <span className="text-lg font-semibold text-[var(--tms-text)]">
                        {release.passRate}%
                      </span>
                    </div>

                    <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[var(--tms-border-subtle)]">
                      <span
                        className="h-full bg-[var(--tms-success)]"
                        style={{ width: `${release.passRate}%` }}
                      />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[var(--tms-text-muted)]">
                      <span>
                        {release.runs}{' '}{t('run')}{release.runs === 1 ? '' : 's'}
                      </span>
                      <span>{t('{executed}/{total} executed', { executed: release.executed, total: release.total })}</span>
                      <span className="text-[var(--tms-success)]">{t('{passed} passed', { passed: release.passed })}</span>
                      <span className="text-[var(--tms-danger)]">{t('{failed} failed', { failed: release.failed })}</span>
                      <span className="text-[var(--tms-warning)]">{t('{blocked} blocked', { blocked: release.blocked })}</span>
                      <span>{t('{notRun} not run', { notRun: release.notRun })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel className="px-6 py-6">
            <WorkspaceSectionHeader
              title={t('Current snapshot')}
              description={t('High-level repository and execution indicators for this project.')}
              className="mb-5"
            />
            <div className="grid gap-3">
              {[
                ['Suites', dashboard.sections.length],
                ['Active cases', activeTests.length],
                ['Ready cases', readyCases],
                ['Total runs', runs.length],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-4 py-3"
                >
                  <span className="text-sm font-semibold text-[var(--tms-text-muted)]">
                    {label}
                  </span>
                  <span className="text-lg font-semibold text-[var(--tms-text)]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
          </section>
        </div>
      </div>
    </main>
  )
}
