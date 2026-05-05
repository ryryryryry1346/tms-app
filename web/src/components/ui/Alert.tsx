import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

const alertVariants = cva(
  'tms-alert',
  {
    variants: {
      variant: {
        default: 'tms-alert-default',
        info: 'tms-alert-info',
        success: 'tms-alert-success',
        warning: 'tms-alert-warning',
        danger: 'tms-alert-danger',
      },
      density: {
        regular: 'px-4 py-3',
        compact: 'px-3 py-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      density: 'regular',
    },
  },
)

export type AlertProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants> & {
    title?: ReactNode
    action?: ReactNode
    children: ReactNode
  }

export function Alert({
  variant,
  density,
  title,
  action,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div className={cx(alertVariants({ variant, density }), className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {title ? (
            <div className="font-semibold">
              {title}
            </div>
          ) : null}
          <div className={title ? 'mt-1' : ''}>
            {children}
          </div>
        </div>
        {action ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export { alertVariants }
