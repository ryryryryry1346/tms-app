import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

const alertVariants = cva(
  'rounded-[var(--tms-radius-overlay)] border px-4 py-3 text-sm',
  {
    variants: {
      variant: {
        default:
          'border-[var(--tms-border)] bg-[var(--tms-surface-muted)] text-[var(--tms-text-muted)]',
        info:
          'border-[var(--tms-primary-border)] bg-[var(--tms-primary-soft)] text-[var(--tms-primary)]',
        success:
          'border-[var(--tms-success-border)] bg-[var(--tms-success-soft)] text-[var(--tms-success)]',
        warning:
          'border-[var(--tms-warning-border)] bg-[var(--tms-warning-soft)] text-[var(--tms-warning)]',
        danger:
          'border-[var(--tms-danger-border)] bg-[var(--tms-danger-soft)] text-[var(--tms-danger)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    children: ReactNode
  }

export function Alert({ variant, className, children, ...props }: AlertProps) {
  return (
    <div className={cx(alertVariants({ variant }), className)} {...props}>
      {children}
    </div>
  )
}

export { alertVariants }
