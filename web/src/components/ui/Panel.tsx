import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

type PanelProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
}

type PanelHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

export function Panel({ className, children, ...props }: PanelProps) {
  return (
    <section className={cx('tms-panel', className)} {...props}>
      {children}
    </section>
  )
}

export function PanelHeader({
  className,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <div className={cx('tms-panel-header', className)} {...props}>
      {children}
    </div>
  )
}
