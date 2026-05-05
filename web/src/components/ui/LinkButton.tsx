import { Link, type LinkProps } from '@tanstack/react-router'
import { type VariantProps } from 'class-variance-authority'
import { buttonVariants } from './Button'
import { cx } from './utils'

export type LinkButtonProps = LinkProps &
  VariantProps<typeof buttonVariants> & {
    className?: string
  }

export function LinkButton({
  variant,
  size,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cx(buttonVariants({ variant, size }), 'no-underline', className)}
      {...props}
    />
  )
}
