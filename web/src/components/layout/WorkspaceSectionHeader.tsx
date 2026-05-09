import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../ui/utils'

type WorkspaceSectionHeaderProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  dense?: boolean
}

export function WorkspaceSectionHeader({
  title,
  description,
  eyebrow,
  meta,
  actions,
  dense = false,
  className,
  ...props
}: WorkspaceSectionHeaderProps) {
  return (
    <div
      className={cx(
        'workspace-section-header',
        dense && 'workspace-section-header--dense',
        className,
      )}
      {...props}
    >
      <div className="workspace-section-header__copy">
        {eyebrow ? (
          <p className="workspace-section-header__eyebrow">{eyebrow}</p>
        ) : null}
        <div className="workspace-section-header__title-row">
          <h2 className="workspace-section-header__title">{title}</h2>
          {meta ? <div className="workspace-section-header__meta">{meta}</div> : null}
        </div>
        {description ? (
          <p className="workspace-section-header__description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="workspace-section-header__actions">{actions}</div> : null}
    </div>
  )
}
