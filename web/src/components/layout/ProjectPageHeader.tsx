import type { ReactNode } from 'react'

type ProjectPageHeaderProps = {
  projectName: string
  description: string
  actions?: ReactNode
}

export function ProjectPageHeader({
  projectName,
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
    </section>
  )
}
