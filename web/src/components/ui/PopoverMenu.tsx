import { Popover } from '@base-ui/react/popover'
import {
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react'
import { cx } from './utils'

type PopoverMenuAlign = 'left' | 'right'

type PopoverMenuProps = {
  isOpen: boolean
  onClose: () => void
  onOpenChange?: (isOpen: boolean) => void
  trigger: ReactElement
  children: ReactNode
  align?: PopoverMenuAlign
  sideOffset?: number
  className?: string
}

type PopoverMenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

type PopoverMenuLabelProps = {
  children: ReactNode
  className?: string
}

function getItemToneClass(tone: NonNullable<PopoverMenuItemProps['tone']>): string {
  if (tone === 'success') {
    return 'text-[var(--tms-success)] hover:bg-[var(--tms-success-soft)]'
  }

  if (tone === 'warning') {
    return 'text-[var(--tms-warning)] hover:bg-[var(--tms-warning-soft)]'
  }

  if (tone === 'danger') {
    return 'tms-menu-item-danger'
  }

  return ''
}

export function PopoverMenu({
  isOpen,
  onClose,
  onOpenChange,
  trigger,
  children,
  align = 'right',
  sideOffset = 8,
  className,
}: PopoverMenuProps) {
  return (
    <Popover.Root
      open={isOpen}
      modal={false}
      onOpenChange={(nextOpen) => {
        onOpenChange?.(nextOpen)

        if (!nextOpen) {
          onClose()
        }
      }}
    >
      <Popover.Trigger render={trigger} />
      {isOpen ? (
        <Popover.Portal>
          <Popover.Positioner
            className="tms-transient-layer"
            align={align === 'right' ? 'end' : 'start'}
            sideOffset={sideOffset}
          >
            <Popover.Popup
              role="menu"
              className={cx('tms-popover min-w-[11rem]', className)}
            >
              {children}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      ) : null}
    </Popover.Root>
  )
}

export function PopoverMenuItem({
  tone = 'default',
  className,
  type = 'button',
  ...props
}: PopoverMenuItemProps) {
  return (
    <button
      type={type}
      role="menuitem"
      className={cx(
        'tms-menu-item disabled:cursor-not-allowed disabled:opacity-55',
        getItemToneClass(tone),
        className,
      )}
      {...props}
    />
  )
}

export function PopoverMenuLabel({
  children,
  className,
}: PopoverMenuLabelProps) {
  return <div className={cx('tms-popover-label', className)}>{children}</div>
}

export function PopoverMenuSeparator() {
  return <div className="tms-popover-separator" />
}
