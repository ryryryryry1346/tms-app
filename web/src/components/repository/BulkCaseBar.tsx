import { useState } from 'react'
import { Alert } from '../ui/Alert'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ConfirmActionAlert } from '../ui/ConfirmActionAlert'
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
  isExporting: boolean
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
  onExportSelected: () => void
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
  isExporting,
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
  onExportSelected,
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
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4">
      <div className="pointer-events-auto w-full max-w-3xl rounded-[var(--tms-radius-overlay)] border-2 border-[var(--tms-primary-border)] bg-[var(--tms-surface)] px-4 py-3 shadow-[0_16px_40px_-12px_rgba(2,6,23,0.45)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant="primary">{selectedCount} selected</Badge>
        <div className="repository-suite-header__actions">
          <PopoverMenu
            isOpen={openMenu === 'move'}
            onClose={closeMenu}
            onOpenChange={(nextOpen) => setOpenMenu(nextOpen ? 'move' : null)}
            align="left"
            className="max-h-[280px] min-w-[220px] overflow-y-auto"
            trigger={
              <Button
                disabled={isApplying || suites.length === 0}
                variant="secondary"
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
                variant="secondary"
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
                variant="secondary"
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

          <Button
            onClick={() => {
              closeMenu()
              onExportSelected()
            }}
            disabled={isApplying || isExporting}
            variant="secondary"
          >
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            onClick={() => {
              closeMenu()
              onClearSelection()
            }}
            disabled={isApplying}
            variant="secondary"
          >
            Clear selection
          </Button>
        </div>
      </div>

      {isArchiveConfirming ? (
        <ConfirmActionAlert
          className="mt-3"
          title={`Archive ${selectedArchivableCount} selected case${
            selectedArchivableCount === 1 ? '' : 's'
          }?`}
          description="Archived cases leave the active repository and can be restored from the Archived filter."
          confirmLabel="Archive selected"
          pendingLabel="Archiving..."
          confirmVariant="primary"
          isPending={isApplying}
          onCancel={onCancelArchive}
          onConfirm={onConfirmArchive}
        />
      ) : null}

      {isDeleteConfirming ? (
        <ConfirmActionAlert
          className="mt-3"
          title={`Permanently delete ${selectedArchivedCount} archived case${
            selectedArchivedCount === 1 ? '' : 's'
          }?`}
          description="This action cannot be undone. Deleted test cases will be removed from the repository."
          confirmLabel="Delete permanently"
          pendingLabel="Deleting..."
          confirmVariant="danger"
          isPending={isApplying}
          onCancel={onCancelDeleteArchived}
          onConfirm={onConfirmDeleteArchived}
        />
      ) : null}

      {errorMessage ? (
        <Alert variant="danger" className="mt-3">
          {errorMessage}
        </Alert>
      ) : null}
      </div>
    </div>
  )
}
