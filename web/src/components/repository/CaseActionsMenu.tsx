import { Link } from '@tanstack/react-router'
import { Button } from '../ui/Button'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuSeparator,
} from '../ui/PopoverMenu'

type CaseActionsMenuProps = {
  testId: number
  isOpen: boolean
  isArchived: boolean
  isPending: boolean
  onToggle: () => void
  onClose: () => void
  onPreview: () => void
  onDuplicate: () => void
  onRestore: () => void
  onDeletePermanently: () => void
  onArchive: () => void
}

export function CaseActionsMenu({
  testId,
  isOpen,
  isArchived,
  isPending,
  onToggle,
  onClose,
  onPreview,
  onDuplicate,
  onRestore,
  onDeletePermanently,
  onArchive,
}: CaseActionsMenuProps) {
  return (
    <div className="flex justify-end">
      <PopoverMenu
        isOpen={isOpen}
        onClose={onClose}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            onToggle()
          }
        }}
        className="min-w-[170px] text-left"
        trigger={
          <Button
            size="sm"
            disabled={isPending}
            variant="secondary"
            aria-label="Open test case actions"
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            ...
          </Button>
        }
      >
          <Link
            to="/test/$testId"
            params={{ testId: testId.toString() }}
            className="tms-menu-item no-underline"
          >
            Open
          </Link>
          <PopoverMenuItem onClick={onPreview}>
            Preview
          </PopoverMenuItem>
          <Link
            to="/edit-test/$testId"
            params={{ testId: testId.toString() }}
            className="tms-menu-item no-underline"
          >
            Edit
          </Link>
          <PopoverMenuItem
            disabled={isPending}
            onClick={onDuplicate}
          >
            Duplicate
          </PopoverMenuItem>
          {isArchived ? (
            <>
              <PopoverMenuSeparator />
              <PopoverMenuItem
                disabled={isPending}
                onClick={onRestore}
                tone="success"
              >
                Restore
              </PopoverMenuItem>
              <PopoverMenuItem
                disabled={isPending}
                onClick={onDeletePermanently}
                tone="danger"
              >
                Delete permanently
              </PopoverMenuItem>
            </>
          ) : (
            <>
              <PopoverMenuSeparator />
              <PopoverMenuItem
                disabled={isPending}
                onClick={onArchive}
                tone="warning"
              >
                Archive
              </PopoverMenuItem>
            </>
          )}
      </PopoverMenu>
    </div>
  )
}
