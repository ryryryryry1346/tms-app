import type { InputHTMLAttributes } from 'react'
import { cx } from './utils'

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={cx('tms-checkbox', className)}
      {...props}
    />
  )
}
