import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from '../ui/utils'
import { WorkspaceSectionHeader } from './WorkspaceSectionHeader'

type EditingSurfaceSectionProps = HTMLAttributes<HTMLElement> & {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  dense?: boolean
  bodyClassName?: string
  children: ReactNode
}

type EditingFieldGroupProps = HTMLAttributes<HTMLLabelElement> & {
  label: ReactNode
  children: ReactNode
}

export function EditingSurfaceSection({
  title,
  description,
  actions,
  dense = false,
  className,
  bodyClassName,
  children,
  ...props
}: EditingSurfaceSectionProps) {
  return (
    <section
      className={cx(
        'editing-surface-section',
        dense && 'editing-surface-section--dense',
        className,
      )}
      {...props}
    >
      <WorkspaceSectionHeader
        dense={dense}
        title={title}
        description={description}
        actions={actions}
      />
      <div className={cx('editing-surface-section__body', bodyClassName)}>
        {children}
      </div>
    </section>
  )
}

export function EditingFieldGroup({
  label,
  className,
  children,
  ...props
}: EditingFieldGroupProps) {
  return (
    <label className={cx('editing-field-group', className)} {...props}>
      <span className="editing-field-group__label">{label}</span>
      {children}
    </label>
  )
}
