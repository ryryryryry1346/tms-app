import { Select } from '@base-ui/react/select'
import type { PointerEventHandler, ReactNode } from 'react'
import { cx } from './utils'

export type SelectMenuOption = {
  value: string
  label?: ReactNode
  disabled?: boolean
}

type SelectMenuProps = {
  value: string
  options: SelectMenuOption[]
  onValueChange: (value: string) => void
  disabled?: boolean
  className?: string
  popupClassName?: string
  itemClassName?: string
  'aria-label'?: string
  onPointerDown?: PointerEventHandler<HTMLButtonElement>
}

function getOptionLabel(options: SelectMenuOption[], value: string): ReactNode {
  return options.find((option) => option.value === value)?.label ?? value
}

function ChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6 8 10 12 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  )
}

export function SelectMenu({
  value,
  options,
  onValueChange,
  disabled,
  className,
  popupClassName,
  itemClassName,
  onPointerDown,
  'aria-label': ariaLabel,
}: SelectMenuProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === 'string') {
          onValueChange(nextValue)
        }
      }}
      disabled={disabled}
      modal={false}
    >
      <Select.Trigger
        className={cx('tms-select-menu-trigger', className)}
        aria-label={ariaLabel}
        onPointerDown={onPointerDown}
      >
        <Select.Value>{() => getOptionLabel(options, value)}</Select.Value>
        <Select.Icon className="ml-auto shrink-0 text-current">
          <ChevronIcon />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner sideOffset={6} align="start">
          <Select.Popup className={cx('tms-popover p-1', popupClassName)}>
            <Select.List className="grid gap-1">
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cx('tms-select-menu-item', itemClassName)}
                >
                  <Select.ItemText>{option.label ?? option.value}</Select.ItemText>
                  <Select.ItemIndicator className="text-[var(--tms-primary)]">
                    <CheckIcon />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
