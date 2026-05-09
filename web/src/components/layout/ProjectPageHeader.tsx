import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

type ProjectNavTab = 'overview' | 'repository' | 'runs' | 'reports'

type ProjectPageHeaderProps = {
  projectName: string
  projectSlug: string
  activeTab: ProjectNavTab
  description: string
  actions?: ReactNode
}

export function ProjectSubnav({
  projectSlug,
  active,
}: {
  projectSlug: string
  active: ProjectNavTab
}) {
  const getClassName = (isActive: boolean): string =>
    `workspace-subnav__link ${isActive ? 'is-active' : ''}`

  return (
    <div className="workspace-subnav">
      <Link
        to="/project/$projectSlug"
        params={{ projectSlug }}
        className={getClassName(active === 'overview')}
      >
        Overview
      </Link>
      <Link
        to="/project/$projectSlug/repository"
        params={{ projectSlug }}
        className={getClassName(active === 'repository')}
      >
        Repository
      </Link>
      <Link
        to="/project/$projectSlug/runs"
        params={{ projectSlug }}
        className={getClassName(active === 'runs')}
      >
        Runs
      </Link>
      <Link
        to="/project/$projectSlug/reports"
        params={{ projectSlug }}
        className={getClassName(active === 'reports')}
      >
        Reports
      </Link>
    </div>
  )
}

export function ProjectPageHeader({
  projectName,
  projectSlug,
  activeTab,
  description,
  actions,
}: ProjectPageHeaderProps) {
  return (
    <section className="workspace-page-header">
      <div className="workspace-page-header__body">
        <div className="workspace-page-header__copy">
          <p className="workspace-page-header__eyebrow">Project workspace</p>
          <h1 className="workspace-page-header__title">{projectName}</h1>
          <p className="workspace-page-header__description">{description}</p>
        </div>
        {actions ? <div className="workspace-page-header__actions">{actions}</div> : null}
      </div>

      <ProjectSubnav projectSlug={projectSlug} active={activeTab} />
    </section>
  )
}
