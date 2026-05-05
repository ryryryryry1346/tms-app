import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes, ReactNode } from 'react'
import { cx } from './utils'

const panelVariants = cva('tms-panel', {
  variants: {
    padding: {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    },
  },
  defaultVariants: {
    padding: 'none',
  },
})

const panelHeaderVariants = cva('tms-panel-header', {
  variants: {
    dense: {
      true: 'px-4 py-3',
      false: '',
    },
  },
  defaultVariants: {
    dense: false,
  },
})

export type PanelProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof panelVariants> & {
    children: ReactNode
  }

export type PanelHeaderProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof panelHeaderVariants> & {
    children: ReactNode
  }

export function Panel({ className, padding, children, ...props }: PanelProps) {
  return (
    <section className={cx(panelVariants({ padding }), className)} {...props}>
      {children}
    </section>
  )
}

export function PanelHeader({
  className,
  dense,
  children,
  ...props
}: PanelHeaderProps) {
  return (
    <div className={cx(panelHeaderVariants({ dense }), className)} {...props}>
      {children}
    </div>
  )
}

export { panelHeaderVariants, panelVariants }
