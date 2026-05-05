import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

const cardVariants = cva(
  'tms-card',
  {
    variants: {
      padding: {
        none: '',
        sm: 'p-4',
        md: 'p-5',
        lg: 'p-6',
      },
      shadow: {
        none: 'shadow-none',
        sm: '',
        panel: 'tms-panel',
      },
      tone: {
        default: '',
        muted: 'tms-card-muted',
        soft: 'tms-card-soft',
      },
    },
    defaultVariants: {
      padding: 'md',
      shadow: 'sm',
      tone: 'default',
    },
  },
)

export type CardProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants> & {
    children: ReactNode
  }

export function Card({
  padding,
  shadow,
  tone,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cx(cardVariants({ padding, shadow, tone }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

export { cardVariants }
