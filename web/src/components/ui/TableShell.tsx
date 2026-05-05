import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

type TableShellProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
}

type TableGridProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  columns: string
  minWidth?: string
}

export function TableShell({
  className,
  children,
  ...props
}: TableShellProps) {
  return (
    <div
      className={cx(
        'overflow-x-auto rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border-subtle)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function TableHead({
  className,
  children,
  columns,
  minWidth = '0',
  style,
  ...props
}: TableGridProps) {
  return (
    <div
      className={cx('tms-table-head px-5 py-3', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        minWidth,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function TableRow({
  className,
  children,
  columns,
  minWidth = '0',
  style,
  ...props
}: TableGridProps) {
  return (
    <div
      className={cx('tms-table-row px-5 py-3', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        minWidth,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}
