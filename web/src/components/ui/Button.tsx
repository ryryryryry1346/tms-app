import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cx } from './utils'

const buttonVariants = cva(
  'tms-button disabled:cursor-not-allowed disabled:opacity-55',
  {
    variants: {
      variant: {
        default: '',
        primary: 'tms-button-primary',
        danger: 'tms-button-danger',
        success:
          'border-[var(--tms-success)] bg-[var(--tms-success-soft)] text-[var(--tms-success)]',
        warning:
          'border-[var(--tms-warning)] bg-[var(--tms-warning-soft)] text-[var(--tms-warning)]',
      },
      size: {
        sm: 'min-h-0 px-2.5 py-1 text-xs',
        md: '',
        lg: 'px-6 py-3 text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { buttonVariants }
