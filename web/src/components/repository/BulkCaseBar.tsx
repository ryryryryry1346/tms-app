import { useState } from 'react'
import { Button } from '../ui/Button'
import { PopoverMenu, PopoverMenuItem } from '../ui/PopoverMenu'

export type RepositoryBulkStatus = 'Draft' | 'Ready' | 'Archived'
export type RepositoryBulkPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type RepositoryBulkCaseType =
  | 'Functional'
  | 'Regression'
  | 'Smoke'
  | 'E2E'
  | 'UI'
  | 'API'

type RepositorySuiteOption = {
  id: number
  name: string
}

type BulkCaseBarProps = {
  selectedCount: number
  suites: RepositorySuiteOption[]
  priorities: RepositoryBulkPriority[]
  caseTypes: RepositoryBulkCaseType[]
  isApplying: boolean
  isArchivedView: boolean
  selectedArchivableCount: number
  selectedArchivedCount: number
  isArchiveConfirming: boolean
  isDeleteConfirming: boolean
  errorMessage: string | null
  onMoveToSuite: (suiteId: string) => void
  onStatusChange: (status: RepositoryBulkStatus) => void
  onPriorityChange: (priority: RepositoryBulkPriority) => void
  onCaseTypeChange: (caseType: RepositoryBulkCaseType) => void
  onRestoreArchived: () => void
  onRequestArchive: () => void
  onCancelArchive: () => void
  onConfirmArchive: () => void
  onRequestDeleteArchived: () => void
  onCancelDeleteArchived: () => void
  onConfirmDeleteArchived: () => void
  onClearSelection: () => void
}

type OpenMenu = 'move' | 'status' | 'more' | null

function menuButtonClass(isActive: boolean): string {
  return isActive ? 'tms-chip-primary' : ''
}

export function BulkCaseBar({
  selectedCount,
  suites,
  priorities,
  caseTypes,
  isApplying,
  isArchivedView,
  selectedArchivableCount,
  selectedArchivedCount,
  isArchiveConfirming,
  isDeleteConfirming,
  errorMessage,
  onMoveToSuite,
  onStatusChange,
  onPriorityChange,
  onCaseTypeChange,
  onRestoreArchived,
  onRequestArchive,
  onCancelArchive,
  onConfirmArchive,
  onRequestDeleteArchived,
  onCancelDeleteArchived,
  onConfirmDeleteArchived,
  onClearSelection,
}: BulkCaseBarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)

  function closeMenu(): void {
    setOpenMenu(null)
  }

  return (
    <div className="mx-5 mt-4 rounded-[var(--tms-radius-overlay)] border border-[var(--tms-border)] bg-[var(--tms-surface-muted)] px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--tms-text)]">
          {selectedCount} selected
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PopoverMenu
            isOpen={openMenu === 'move'}
            onClose={closeMenu}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? 'move' : null)}
            align="left"
            className="max-h-[280px] min-w-[220px] overflow-y-auto"
            trigger={
              <Button
                disabled={isApplying || suites.length === 0}
                className={menuButtonClass(openMenu === 'move')}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'move'}
              >
                Move to...
              </Button>
            }
          >
            {suites.map((suite) => (
              <PopoverMenuItem
                key={suite.id}
                disabled={isApplying}
                onClick={() => {
                  closeMenu()
                  onMoveToSuite(suite.id.toString())
                }}
              >
                {suite.name}
              </PopoverMenuItem>
            ))}
          </PopoverMenu>

          <PopoverMenu
            isOpen={openMenu === 'status'}
            onClose={closeMenu}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? 'status' : null)}
            align="left"
            className="min-w-[180px]"
            trigger={
              <Button
                disabled={isApplying}
                className={menuButtonClass(openMenu === 'status')}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'status'}
              >
                Status...
              </Button>
            }
          >
            <PopoverMenuItem
              disabled={isApplying}
              onClick={() => {
                closeMenu()
                onStatusChange('Ready')
              }}
              tone="success"
            >
              Mark Ready
            </PopoverMenuItem>
            <PopoverMenuItem
              disabled={isApplying}
              onClick={() => {
                closeMenu()
                onStatusChange('Draft')
              }}
            >
              Mark Draft
            </PopoverMenuItem>
            <PopoverMenuItem
              disabled={isApplying || selectedArchivableCount === 0}
              onClick={() => {
                closeMenu()
                onRequestArchive()
              }}
              tone="warning"
            >
              Archive
            </PopoverMenuItem>
          </PopoverMenu>

          <PopoverMenu
            isOpen={openMenu === 'more'}
            onClose={closeMenu}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? 'more' : null)}
            className="min-w-[230px]"
            trigger={
              <Button
                disabled={isApplying}
                className={menuButtonClass(openMenu === 'more')}
                aria-haspopup="menu"
                aria-expanded={openMenu === 'more'}
              >
                More...
              </Button>
            }
          >
            <div className="tms-kicker px-3 pb-1 pt-2">
              Priority
            </div>
            {priorities.map((priority) => (
              <PopoverMenuItem
                key={priority}
                disabled={isApplying}
                onClick={() => {
                  closeMenu()
                  onPriorityChange(priority)
                }}
              >
                {priority}
              </PopoverMenuItem>
            ))}
            <div className="tms-kicker mt-2 border-t border-[var(--tms-border-subtle)] px-3 pb-1 pt-3">
              Type
            </div>
            {caseTypes.map((caseType) => (
              <PopoverMenuItem
                key={caseType}
                disabled={isApplying}
                onClick={() => {
                  closeMenu()
                  onCaseTypeChange(caseType)
                }}
              >
                {caseType}
              </PopoverMenuItem>
            ))}
            {isArchivedView ? (
              <>
                <div className="tms-kicker mt-2 border-t border-[var(--tms-border-subtle)] px-3 pb-1 pt-3">
                  Archived
                </div>
                <PopoverMenuItem
                  disabled={isApplying}
                  onClick={() => {
                    closeMenu()
                    onRestoreArchived()
                  }}
                  tone="success"
                >
                  Restore
                </PopoverMenuItem>
                <PopoverMenuItem
                  disabled={isApplying || selectedArchivedCount === 0}
                  onClick={() => {
                    closeMenu()
                    onRequestDeleteArchived()
                  }}
                  tone="danger"
                >
                  Delete permanently
                </PopoverMenuItem>
              </>
            ) : null}
          </PopoverMenu>

          <button
            type="button"
            onClick={() => {
              closeMenu()
              onClearSelection()
            }}
            disabled={isApplying}
            className="tms-button disabled:cursor-not-allowed disabled:opacity-55"
          >
            Clear selection
          </button>
        </div>
      </div>

      {isArchiveConfirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-warning-soft)] px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--tms-warning)]">
              Archive {selectedArchivableCount} selected case
              {selectedArchivableCount === 1 ? '' : 's'}?
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--tms-warning)]">
              Archived cases leave the active repository and can be restored from
              the Archived filter.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancelArchive}
              disabled={isApplying}
              className="tms-button disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmArchive}
              disabled={isApplying}
              className="tms-button border-[var(--tms-warning)] bg-[var(--tms-warning)] text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isApplying ? 'Archiving...' : 'Confirm archive'}
            </button>
          </div>
        </div>
      ) : null}

      {isDeleteConfirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3">
          <div>
            <p className="m-0 text-sm font-semibold text-[var(--tms-danger)]">
              Permanently delete {selectedArchivedCount} archived case
              {selectedArchivedCount === 1 ? '' : 's'}?
            </p>
            <p className="m-0 mt-1 text-sm text-[var(--tms-danger)]">
              This action cannot be undone. Deleted test cases will be removed
              from the repository.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onCancelDeleteArchived}
              disabled={isApplying}
              className="tms-button disabled:cursor-not-allowed disabled:opacity-55"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirmDeleteArchived}
              disabled={isApplying}
              className="tms-button-danger bg-[var(--tms-danger)] text-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isApplying ? 'Deleting...' : 'Confirm delete'}
            </button>
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3 text-sm text-[var(--tms-danger)]">
          {errorMessage}
        </div>
      ) : null}
    </div>
  )
}
