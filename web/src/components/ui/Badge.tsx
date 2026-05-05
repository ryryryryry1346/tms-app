import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'
import { cx } from './utils'

const badgeVariants = cva('tms-chip', {
  variants: {
    variant: {
      default: '',
      primary: 'tms-chip-primary',
      success: 'tms-chip-success',
      warning: 'tms-chip-warning',
      danger: 'tms-chip-danger',
      draft: 'tms-chip-draft',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
})

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

export function Badge({
  variant,
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cx(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { badgeVariants }
