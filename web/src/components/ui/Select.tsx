import type { SelectHTMLAttributes } from 'react'
import { cx } from './utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className, ...props }: SelectProps) {
  return <select className={cx('tms-select', className)} {...props} />
}
