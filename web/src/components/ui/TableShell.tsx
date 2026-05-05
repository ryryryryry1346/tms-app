import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

const tableShellVariants = cva(
  'overflow-x-auto rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border-subtle)]',
  {
    variants: {
      surface: {
        default: '',
        panel: 'bg-[var(--tms-surface)]',
      },
    },
    defaultVariants: {
      surface: 'default',
    },
  },
)

const tableHeadVariants = cva('tms-table-head', {
  variants: {
    padding: {
      sm: 'px-4 py-2',
      md: 'px-5 py-3',
    },
  },
  defaultVariants: {
    padding: 'md',
  },
})

const tableRowVariants = cva('tms-table-row', {
  variants: {
    padding: {
      sm: 'px-4 py-2',
      md: 'px-5 py-3',
    },
  },
  defaultVariants: {
    padding: 'md',
  },
})

export type TableShellProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof tableShellVariants> & {
    children: ReactNode
  }

export type TableGridProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof tableHeadVariants> & {
    children: ReactNode
    columns: string
    minWidth?: string
  }

export function TableShell({
  className,
  surface,
  children,
  ...props
}: TableShellProps) {
  return (
    <div
      className={cx(tableShellVariants({ surface }), className)}
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
  padding,
  style,
  ...props
}: TableGridProps) {
  return (
    <div
      className={cx(tableHeadVariants({ padding }), className)}
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
  padding,
  style,
  ...props
}: TableGridProps) {
  return (
    <div
      className={cx(tableRowVariants({ padding }), className)}
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

export { tableHeadVariants, tableRowVariants, tableShellVariants }
