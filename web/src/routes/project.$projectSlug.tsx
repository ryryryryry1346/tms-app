import {
  Link,
  Outlet,
  createFileRoute,
  notFound,
  redirect,
  useLocation,
} from '@tanstack/react-router'
import { getRunsForProject } from '../features/runs/server'
import { getDashboardState } from '../features/tests/server'

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

function ProjectSubnav({
  projectSlug,
  active,
}: {
  projectSlug: string
  active: 'overview' | 'repository' | 'runs'
}) {
  const tabClass = (isActive: boolean): string =>
    `rounded-full px-4 py-2 text-sm font-semibold no-underline ${
      isActive
        ? 'bg-[#ecf2ff] text-[#2f6fe4]'
        : 'text-[#60718f] hover:bg-[#f5f8ff]'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to="/project/$projectSlug"
        params={{ projectSlug }}
        className={tabClass(active === 'overview')}
      >
        Overview
      </Link>
      <Link
        to="/project/$projectSlug/repository"
        params={{ projectSlug }}
        className={tabClass(active === 'repository')}
      >
        Repository
      </Link>
      <Link
        to="/project/$projectSlug/runs"
        params={{ projectSlug }}
        className={tabClass(active === 'runs')}
      >
        Runs
      </Link>
    </div>
  )
}

function ProjectOverviewPage() {
  const { project, dashboard, runs } = Route.useLoaderData()
  const location = useLocation()

  if (
    location.pathname.endsWith('/runs') ||
    location.pathname.endsWith('/repository')
  ) {
    return <Outlet />
  }

  const activeTests = dashboard.tests.filter((test) => test.status !== 'Archived')
  const readyCases = activeTests.filter((test) => test.status === 'Ready').length
  const draftCases = activeTests.filter((test) => test.status === 'Draft').length
  const archivedCases = dashboard.tests.filter(
    (test) => test.status === 'Archived',
  ).length
  const recentRuns = [...runs].sort((a, b) => b.id - a.id).slice(0, 3)
  const recentCases = [...dashboard.tests].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <main className="min-h-[calc(100vh-65px)] bg-[#f7f9fe]">
      <div className="mx-auto max-w-[1600px] px-6 py-6 lg:px-10">
        <section className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-3 text-sm text-[#6d7d9e]">
              <Link to="/" className="no-underline text-[#6d7d9e]">
                Workspace
              </Link>
              <span>/</span>
              <span>Project</span>
            </div>
            <h1 className="m-0 text-4xl font-bold tracking-tight text-[#1b2f5b] md:text-5xl">
              {project.name}
            </h1>
            <p className="mt-2 text-base text-[#63759a] md:text-lg">
              Project dashboard with repository health, recent activity, and execution summary.
            </p>
            <div className="mt-4">
              <ProjectSubnav
                projectSlug={project.slug ?? project.id.toString()}
                active="overview"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/project/$projectSlug/repository"
              params={{ projectSlug: project.slug ?? project.id.toString() }}
              className="rounded-2xl border border-[#9dbaf7] bg-white px-6 py-3 text-base font-semibold no-underline text-[#2f6fe4]"
            >
              Open repository
            </Link>
            <Link
              to="/project/$projectSlug/runs"
              params={{ projectSlug: project.slug ?? project.id.toString() }}
              className="rounded-2xl border border-[#2f6fe4] bg-[#2f6fe4] px-6 py-3 text-base font-semibold no-underline text-white"
            >
              Open runs
            </Link>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Suites', value: dashboard.sections.length, tone: 'text-[#2f6fe4]' },
            { label: 'Cases', value: activeTests.length, tone: 'text-[#2f6fe4]' },
            { label: 'Ready', value: readyCases, tone: 'text-[#2ea66b]' },
            { label: 'Draft', value: draftCases, tone: 'text-[#7b879f]' },
            { label: 'Runs', value: runs.length, tone: 'text-[#d05656]' },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-[#e6ecf8] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
            >
              <div className="text-sm font-semibold uppercase tracking-[0.08em] text-[#7686a7]">
                {item.label}
              </div>
              <div className={`mt-3 text-4xl font-semibold ${item.tone}`}>
                {item.value}
              </div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <div className="grid gap-6">
            <section className="rounded-3xl border border-[#e6ecf8] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">
                    Repository health
                  </h2>
                  <p className="mt-2 text-sm text-[#63759a]">
                    Snapshot of suite structure and test case readiness.
                  </p>
                </div>
                <Link
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug: project.slug ?? project.id.toString() }}
                  className="rounded-xl border border-[#dbe4f4] bg-white px-4 py-2 text-sm font-semibold no-underline text-[#60718f]"
                >
                  Open repository
                </Link>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {dashboard.sections.map((section) => {
                  const suiteTests = activeTests.filter(
                    (test) => test.sectionId === section.id,
                  )
                  const suiteReady = suiteTests.filter(
                    (test) => test.status === 'Ready',
                  ).length

                  return (
                    <div
                      key={section.id}
                      className="rounded-2xl border border-[#e9eef8] bg-[#fbfcff] px-5 py-4"
                    >
                      <div className="text-lg font-semibold text-[#1b2f5b]">
                        {section.name}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-[#6d7d9e]">
                        <span>{suiteTests.length} cases</span>
                        <span>Ready {suiteReady}</span>
                        <span>Draft {suiteTests.length - suiteReady}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-[#e6ecf8] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">
                    Recent test cases
                  </h2>
                  <p className="mt-2 text-sm text-[#63759a]">
                    Latest created cases across the project repository.
                  </p>
                </div>
                <div className="rounded-full border border-[#dbe4f4] bg-[#fbfcff] px-3 py-1 text-sm text-[#63759a]">
                  {archivedCases} archived
                </div>
              </div>

              {recentCases.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-5 text-sm text-[#63759a]">
                  No test cases yet.
                </div>
              ) : (
                <div className="grid gap-3">
                  {recentCases.map((test) => {
                    const suite =
                      dashboard.sections.find((section) => section.id === test.sectionId) ??
                      null

                    return (
                      <Link
                        key={test.id}
                        to="/test/$testId"
                        params={{ testId: test.id.toString() }}
                        className="rounded-2xl border border-[#e9eef8] bg-[#fbfcff] px-5 py-4 no-underline transition hover:border-[#cddaf3]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-lg font-semibold text-[#1b2f5b]">
                              #{test.id} {test.title}
                            </div>
                            <div className="mt-1 text-sm text-[#6d7d9e]">
                              {suite?.name ?? 'No suite'} • {test.status ?? 'Draft'}
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-[#2f6fe4]">
                            Open
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-6">
            <section className="rounded-3xl border border-[#e6ecf8] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
              <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">
                Recent runs
              </h2>
              <p className="mt-2 text-sm text-[#63759a]">
                Latest execution activity for this project.
              </p>

              <div className="mt-5 grid gap-3">
                {recentRuns.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-5 text-sm text-[#63759a]">
                    No runs yet.
                  </div>
                ) : (
                  recentRuns.map((run) => (
                    <Link
                      key={run.id}
                      to="/run/$runId"
                      params={{ runId: run.id.toString() }}
                      className="rounded-2xl border border-[#e9eef8] bg-[#fbfcff] px-5 py-4 no-underline transition hover:border-[#cddaf3]"
                    >
                      <div className="text-lg font-semibold text-[#1b2f5b]">
                        {run.name}
                      </div>
                      <div className="mt-1 text-sm text-[#6d7d9e]">Run ID: {run.id}</div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#e6ecf8] bg-white px-6 py-5 shadow-[0_10px_30px_rgba(31,57,102,0.05)]">
              <h2 className="m-0 text-2xl font-semibold text-[#1b2f5b]">
                Quick actions
              </h2>
              <p className="mt-2 text-sm text-[#63759a]">
                Jump straight into the most common project workflows.
              </p>

              <div className="mt-5 grid gap-3">
                <Link
                  to="/project/$projectSlug/repository"
                  params={{ projectSlug: project.slug ?? project.id.toString() }}
                  className="rounded-2xl border border-[#dbe4f4] bg-white px-4 py-3 text-sm font-semibold no-underline text-[#60718f]"
                >
                  Manage suites and cases
                </Link>
                <Link
                  to="/create-test"
                  search={{ projectId: project.id }}
                  className="rounded-2xl border border-[#9dbaf7] bg-white px-4 py-3 text-sm font-semibold no-underline text-[#2f6fe4]"
                >
                  Create test case
                </Link>
                <Link
                  to="/project/$projectSlug/runs"
                  params={{ projectSlug: project.slug ?? project.id.toString() }}
                  className="rounded-2xl border border-[#2f6fe4] bg-[#2f6fe4] px-4 py-3 text-sm font-semibold no-underline text-white"
                >
                  Start or continue runs
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}
