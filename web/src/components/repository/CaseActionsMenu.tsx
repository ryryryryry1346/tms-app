import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuSeparator,
} from '../ui/PopoverMenu'
import { useT } from '../../lib/i18n'

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
  const t = useT()

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
        className="min-w-[184px] text-left"
        trigger={
          <button
            type="button"
            disabled={isPending}
            aria-label={t('Open test case actions')}
            aria-haspopup="menu"
            aria-expanded={isOpen}
            className="case-actions-trigger"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        }
      >
        <Link
          to="/test/$testId"
          params={{ testId: testId.toString() }}
          className="tms-menu-item tms-menu-item--icon no-underline"
        >
          <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Open')}</Link>
        <PopoverMenuItem className="tms-menu-item--icon" onClick={onPreview}>
          <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Preview')}</PopoverMenuItem>
        <Link
          to="/edit-test/$testId"
          params={{ testId: testId.toString() }}
          className="tms-menu-item tms-menu-item--icon no-underline"
        >
          <Pencil className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Full editor')}</Link>
        <PopoverMenuItem
          className="tms-menu-item--icon"
          disabled={isPending}
          onClick={onDuplicate}
        >
          <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Duplicate')}</PopoverMenuItem>
        {isArchived ? (
          <>
            <PopoverMenuSeparator />
            <PopoverMenuItem
              className="tms-menu-item--icon"
              disabled={isPending}
              onClick={onRestore}
              tone="success"
            >
              <ArchiveRestore className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Restore')}</PopoverMenuItem>
            <PopoverMenuItem
              className="tms-menu-item--icon"
              disabled={isPending}
              onClick={onDeletePermanently}
              tone="danger"
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Delete permanently')}</PopoverMenuItem>
          </>
        ) : (
          <>
            <PopoverMenuSeparator />
            <PopoverMenuItem
              className="tms-menu-item--icon"
              disabled={isPending}
              onClick={onArchive}
              tone="warning"
            >
              <Archive className="h-4 w-4 shrink-0" aria-hidden="true" />{t('Archive')}</PopoverMenuItem>
          </>
        )}
      </PopoverMenu>
    </div>
  )
}
