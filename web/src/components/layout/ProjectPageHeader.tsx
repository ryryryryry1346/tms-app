import type { ReactNode } from 'react'

type ProjectPageHeaderProps = {
  projectName: string
  description?: string
  eyebrow?: string | null
  actions?: ReactNode
}

export function ProjectPageHeader({
  projectName,
  description,
  eyebrow = 'Project workspace',
  actions,
}: ProjectPageHeaderProps) {
  return (
    <section className="workspace-page-header">
      <div className="workspace-page-header__body">
        <div className="workspace-page-header__copy">
          {eyebrow ? (
            <p className="workspace-page-header__eyebrow">{eyebrow}</p>
          ) : null}
          <h1 className="workspace-page-header__title">{projectName}</h1>
          {description ? (
            <p className="workspace-page-header__description">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="workspace-page-header__actions">{actions}</div> : null}
      </div>
    </section>
  )
}
