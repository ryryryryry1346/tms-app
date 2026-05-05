import { type DragEvent, type FormEvent } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PopoverMenu, PopoverMenuItem } from '../ui/PopoverMenu'
import { Select } from '../ui/Select'
import {
  CaseRow,
  type RepositoryCasePriority,
  type RepositoryCaseRowTest,
  type RepositoryCaseStatus,
  type RepositoryCaseType,
} from './CaseRow'

type RepositoryQuickCreateStatus = Exclude<RepositoryCaseStatus, 'Archived'>

export type RepositorySuiteSectionModel = {
  id: number
  name: string
}

type SuiteSectionProps = {
  section: RepositorySuiteSectionModel
  sectionTests: RepositoryCaseRowTest[]
  visibleTests: RepositoryCaseRowTest[]
  sectionAllTestIds: number[]
  visibleTestIds: number[]
  selectedTestIdSet: Set<number>
  isCollapsed: boolean
  isEditingSuite: boolean
  isDeleteConfirming: boolean
  isPendingSuiteAction: boolean
  isMenuOpen: boolean
  allVisibleSelected: boolean
  editingSuiteName: string
  suiteActionErrorMessage: string | null
  showSuiteActionError: boolean
  dragOverSuiteId: number | null
  draggedTestIds: number[]
  dragOverTestDrop: { testId: number; position: 'before' | 'after' } | null
  isApplyingBulkAction: boolean
  quickCreateSuiteId: number | null
  pendingQuickCreateSuiteId: number | null
  quickCreateTitle: string
  quickCreatePriority: RepositoryCasePriority
  quickCreateType: RepositoryCaseType
  quickCreateStatus: RepositoryQuickCreateStatus
  priorityOptions: RepositoryCasePriority[]
  caseTypeOptions: RepositoryCaseType[]
  statusOptions: RepositoryCaseStatus[]
  quickCreateStatusOptions: RepositoryQuickCreateStatus[]
  openCaseMenuId: number | null
  pendingCaseActionId: number | null
  editingCaseTitleId: number | null
  editingCaseTitleValue: string
  formatDate: (value: string | null | undefined) => string
  onToggleCollapsed: (suiteId: number) => void
  onRenameSuite: (event: FormEvent<HTMLFormElement>, suiteId: number) => void
  onEditingSuiteNameChange: (value: string) => void
  onCancelRenameSuite: () => void
  onToggleSuiteSelection: (testIds: number[]) => void
  onStartQuickCreateCase: (suiteId: number) => void
  onQuickCreateTitleChange: (value: string) => void
  onQuickCreatePriorityChange: (priority: RepositoryCasePriority) => void
  onQuickCreateTypeChange: (caseType: RepositoryCaseType) => void
  onQuickCreateStatusChange: (status: RepositoryQuickCreateStatus) => void
  onSubmitQuickCreateCase: (suiteId: number) => void
  onCancelQuickCreateCase: () => void
  onToggleSuiteMenu: (suiteId: number) => void
  onCloseSuiteMenu: () => void
  onStartRenameSuite: (suiteId: number, suiteName: string) => void
  onRequestDeleteSuite: (suiteId: number) => void
  onConfirmDeleteSuite: (suiteId: number) => void
  onCancelDeleteSuite: () => void
  onSuiteDragOver: (event: DragEvent<HTMLElement>, suiteId: number) => void
  onSuiteDragLeave: (suiteId: number) => void
  onSuiteAppendDrop: (event: DragEvent<HTMLElement>, suiteId: number) => void
  onToggleTestSelection: (testId: number) => void
  onCaseDragStart: (event: DragEvent<HTMLElement>, testId: number) => void
  onCaseDragEnd: () => void
  onCaseDragOver: (
    event: DragEvent<HTMLElement>,
    testId: number,
    position: 'before' | 'after',
  ) => void
  onCaseDragLeave: (testId: number) => void
  onCaseDrop: (event: DragEvent<HTMLElement>, testId: number) => void
  onStartCaseTitleEdit: (testId: number, title: string) => void
  onCaseTitleEditChange: (value: string) => void
  onSaveCaseTitleEdit: (testId: number, currentTitle: string) => void
  onCancelCaseTitleEdit: () => void
  onCasePriorityChange: (testId: number, priority: RepositoryCasePriority) => void
  onCaseTypeChange: (testId: number, caseType: RepositoryCaseType) => void
  onCaseStatusChange: (testId: number, status: RepositoryCaseStatus) => void
  onToggleCaseMenu: (testId: number) => void
  onCloseCaseMenu: () => void
  onPreviewCase: (testId: number) => void
  onDuplicateCase: (testId: number) => void
  onRestoreCase: (testId: number) => void
  onDeleteCasePermanently: (testId: number) => void
  onArchiveCase: (testId: number) => void
}

function ChevronRightIcon() {
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
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  )
}

function ChevronDownIcon() {
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
      <path d="M3.5 6 8 10.5 12.5 6" />
    </svg>
  )
}

function getQuickCreatePriorityChipClass(priority: RepositoryCasePriority): string {
  if (priority === 'Critical') {
    return 'tms-chip-priority-critical'
  }

  if (priority === 'High') {
    return 'tms-chip-priority-high'
  }

  if (priority === 'Low') {
    return 'tms-chip-priority-low'
  }

  return 'tms-chip-priority-medium'
}

function getQuickCreateStatusChipClass(
  status: RepositoryQuickCreateStatus,
): string {
  if (status === 'Ready') {
    return 'tms-chip-status-ready'
  }

  return 'tms-chip-status-draft'
}

export function SuiteSection({
  section,
  sectionTests,
  visibleTests,
  sectionAllTestIds,
  visibleTestIds,
  selectedTestIdSet,
  isCollapsed,
  isEditingSuite,
  isDeleteConfirming,
  isPendingSuiteAction,
  isMenuOpen,
  allVisibleSelected,
  editingSuiteName,
  suiteActionErrorMessage,
  showSuiteActionError,
  dragOverSuiteId,
  draggedTestIds,
  dragOverTestDrop,
  isApplyingBulkAction,
  quickCreateSuiteId,
  pendingQuickCreateSuiteId,
  quickCreateTitle,
  quickCreatePriority,
  quickCreateType,
  quickCreateStatus,
  priorityOptions,
  caseTypeOptions,
  statusOptions,
  quickCreateStatusOptions,
  openCaseMenuId,
  pendingCaseActionId,
  editingCaseTitleId,
  editingCaseTitleValue,
  formatDate,
  onToggleCollapsed,
  onRenameSuite,
  onEditingSuiteNameChange,
  onCancelRenameSuite,
  onToggleSuiteSelection,
  onStartQuickCreateCase,
  onQuickCreateTitleChange,
  onQuickCreatePriorityChange,
  onQuickCreateTypeChange,
  onQuickCreateStatusChange,
  onSubmitQuickCreateCase,
  onCancelQuickCreateCase,
  onToggleSuiteMenu,
  onCloseSuiteMenu,
  onStartRenameSuite,
  onRequestDeleteSuite,
  onConfirmDeleteSuite,
  onCancelDeleteSuite,
  onSuiteDragOver,
  onSuiteDragLeave,
  onSuiteAppendDrop,
  onToggleTestSelection,
  onCaseDragStart,
  onCaseDragEnd,
  onCaseDragOver,
  onCaseDragLeave,
  onCaseDrop,
  onStartCaseTitleEdit,
  onCaseTitleEditChange,
  onSaveCaseTitleEdit,
  onCancelCaseTitleEdit,
  onCasePriorityChange,
  onCaseTypeChange,
  onCaseStatusChange,
  onToggleCaseMenu,
  onCloseCaseMenu,
  onPreviewCase,
  onDuplicateCase,
  onRestoreCase,
  onDeleteCasePermanently,
  onArchiveCase,
}: SuiteSectionProps) {
  const readyCount = sectionTests.filter((test) => test.status === 'Ready').length
  const draftCount = sectionTests.length - readyCount
  const isQuickCreateOpen = quickCreateSuiteId === section.id

  function renderQuickCreateCaseRow() {
    const isPending = pendingQuickCreateSuiteId === section.id

    return (
      <div className="tms-table-row grid grid-cols-[72px_82px_minmax(220px,1fr)_110px_132px_120px_120px_116px_96px] px-5 py-2.5">
        <div />
        <div className="tms-kicker">
          New
        </div>
        <Input
          value={quickCreateTitle}
          onChange={(event) => onQuickCreateTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSubmitQuickCreateCase(section.id)
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              onCancelQuickCreateCase()
            }
          }}
          disabled={isPending}
          autoFocus
          placeholder="Test case title"
          size="sm"
          className="min-w-0 rounded-lg"
        />
        <Select
          value={quickCreatePriority}
          onChange={(event) =>
            onQuickCreatePriorityChange(
              event.target.value as RepositoryCasePriority,
            )
          }
          disabled={isPending}
          size="sm"
          className={`tms-chip w-fit border-0 outline-none ${getQuickCreatePriorityChipClass(quickCreatePriority)}`}
        >
          {priorityOptions.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </Select>
        <Select
          value={quickCreateType}
          onChange={(event) =>
            onQuickCreateTypeChange(event.target.value as RepositoryCaseType)
          }
          disabled={isPending}
          size="sm"
          className="tms-chip w-fit border-0 outline-none"
        >
          {caseTypeOptions.map((caseType) => (
            <option key={caseType} value={caseType}>
              {caseType}
            </option>
          ))}
        </Select>
        <span className="text-sm font-semibold text-[var(--tms-text-soft)]">-</span>
        <span className="text-sm font-semibold text-[var(--tms-text-soft)]">-</span>
        <Select
          value={quickCreateStatus}
          onChange={(event) =>
            onQuickCreateStatusChange(
              event.target.value as RepositoryQuickCreateStatus,
            )
          }
          disabled={isPending}
          size="sm"
          className={`tms-chip w-fit border-0 outline-none ${getQuickCreateStatusChipClass(quickCreateStatus)}`}
        >
          {quickCreateStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Select>
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onClick={() => onSubmitQuickCreateCase(section.id)}
            disabled={isPending}
            variant="primary"
          >
            {isPending ? 'Saving' : 'Save'}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <section
      onDragOver={(event) => onSuiteDragOver(event, section.id)}
      onDragLeave={() => onSuiteDragLeave(section.id)}
      className={`overflow-visible rounded-[var(--tms-radius-panel)] border transition ${
        dragOverSuiteId === section.id
          ? 'border-[var(--tms-primary)] bg-[var(--tms-surface-muted)] shadow-[var(--tms-focus-ring)]'
          : 'border-[var(--tms-border)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--tms-border-subtle)] bg-[var(--tms-surface-soft)] px-5 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => onToggleCollapsed(section.id)}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-[var(--tms-text-muted)] hover:bg-[var(--tms-surface-muted)]"
            aria-label={isCollapsed ? 'Expand suite' : 'Collapse suite'}
          >
            {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          </button>
          <div className="min-w-0">
            {isEditingSuite ? (
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(event) => onRenameSuite(event, section.id)}
              >
                <Input
                  value={editingSuiteName}
                  onChange={(event) =>
                    onEditingSuiteNameChange(event.target.value)
                  }
                  size="lg"
                  className="min-w-[220px]"
                />
                <Button
                  type="submit"
                  disabled={isPendingSuiteAction}
                  variant="primary"
                >
                  {isPendingSuiteAction ? 'Saving...' : 'Save'}
                </Button>
                <Button
                  onClick={onCancelRenameSuite}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-[1.75rem] font-semibold text-[var(--tms-text)]">
                  {section.name}
                </div>
                <div className="text-sm text-[var(--tms-text-soft)]">
                  {sectionTests.length} case
                  {sectionTests.length === 1 ? '' : 's'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="statusReady">
            Ready {readyCount}
          </Badge>
          <Badge variant="statusDraft">
            Draft {draftCount}
          </Badge>
          {dragOverSuiteId === section.id ? (
            <Badge variant="primary">
              Drop to move
            </Badge>
          ) : null}
          <Button
            onClick={() => onToggleSuiteSelection(visibleTestIds)}
            disabled={visibleTestIds.length === 0 || isApplyingBulkAction}
          >
            {allVisibleSelected ? 'Clear cases' : 'Select cases'}
          </Button>
          <Button
            onClick={() => onStartQuickCreateCase(section.id)}
            variant="primary"
          >
            + Case
          </Button>
          {!isEditingSuite ? (
            <PopoverMenu
              isOpen={isMenuOpen}
              onClose={onCloseSuiteMenu}
              onOpenChange={(nextOpen) => {
                if (nextOpen) {
                  onToggleSuiteMenu(section.id)
                }
              }}
              className="min-w-[190px]"
              trigger={
                <Button
                  disabled={isPendingSuiteAction}
                  aria-label="Open suite actions"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                >
                  ...
                </Button>
              }
            >
              <PopoverMenuItem
                onClick={() => onStartRenameSuite(section.id, section.name)}
              >
                Rename
              </PopoverMenuItem>
              <PopoverMenuItem onClick={() => onToggleCollapsed(section.id)}>
                {isCollapsed ? 'Expand' : 'Collapse'}
              </PopoverMenuItem>
              <PopoverMenuItem
                onClick={() => onRequestDeleteSuite(section.id)}
                tone="danger"
              >
                Delete empty suite
              </PopoverMenuItem>
            </PopoverMenu>
          ) : null}
        </div>
      </div>

      {isDeleteConfirming ? (
        <div className="border-b border-[var(--tms-border-subtle)] bg-[var(--tms-warning-soft)] px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-[var(--tms-warning)]">
              Delete this suite? This only works when the suite has no test cases.
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isPendingSuiteAction}
                onClick={() => onConfirmDeleteSuite(section.id)}
                variant="danger"
                className="bg-[var(--tms-danger-soft)]"
              >
                Confirm delete
              </Button>
              <Button
                onClick={onCancelDeleteSuite}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {suiteActionErrorMessage && showSuiteActionError ? (
        <div className="border-b border-[var(--tms-border-subtle)] bg-[var(--tms-danger-soft)] px-5 py-3 text-sm text-[var(--tms-danger)]">
          {suiteActionErrorMessage}
        </div>
      ) : null}

      {isCollapsed ? null : visibleTests.length === 0 ? (
        <div className="bg-[var(--tms-surface)]">
          <div className="px-5 py-4 text-sm text-[var(--tms-text-muted)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>No test cases in this suite yet.</span>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onStartQuickCreateCase(section.id)}
                  variant="primary"
                >
                  + Case
                </Button>
              </div>
            </div>
          </div>
          {isQuickCreateOpen ? renderQuickCreateCaseRow() : null}
        </div>
      ) : (
        <div className="bg-[var(--tms-surface)]">
          <div className="tms-table-head grid grid-cols-[72px_82px_minmax(220px,1fr)_110px_132px_120px_120px_116px_96px] px-5 py-2">
            <div />
            <div>ID</div>
            <div>Title</div>
            <div>Priority</div>
            <div>Type</div>
            <div>Created</div>
            <div>Updated</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          {isQuickCreateOpen ? renderQuickCreateCaseRow() : null}
          {visibleTests.map((test) => (
            <CaseRow
              key={test.id}
              test={test}
              isSelected={selectedTestIdSet.has(test.id)}
              isMenuOpen={openCaseMenuId === test.id}
              isPending={pendingCaseActionId === test.id}
              isEditingTitle={editingCaseTitleId === test.id}
              editingTitleValue={editingCaseTitleValue}
              draggedTestIds={draggedTestIds}
              dragOverDrop={dragOverTestDrop}
              priorityOptions={priorityOptions}
              caseTypeOptions={caseTypeOptions}
              statusOptions={statusOptions}
              formatDate={formatDate}
              onToggleSelection={() => onToggleTestSelection(test.id)}
              onDragStart={(event) => onCaseDragStart(event, test.id)}
              onDragEnd={onCaseDragEnd}
              onDragOver={(event, position) =>
                onCaseDragOver(event, test.id, position)
              }
              onDragLeave={() => onCaseDragLeave(test.id)}
              onDrop={(event) => onCaseDrop(event, test.id)}
              onTitleEditChange={onCaseTitleEditChange}
              onStartTitleEdit={() => onStartCaseTitleEdit(test.id, test.title)}
              onSaveTitleEdit={() => onSaveCaseTitleEdit(test.id, test.title)}
              onCancelTitleEdit={onCancelCaseTitleEdit}
              onPriorityChange={(priority) => onCasePriorityChange(test.id, priority)}
              onCaseTypeChange={(caseType) => onCaseTypeChange(test.id, caseType)}
              onStatusChange={(status) => onCaseStatusChange(test.id, status)}
              onToggleMenu={() => onToggleCaseMenu(test.id)}
              onCloseMenu={onCloseCaseMenu}
              onPreview={() => onPreviewCase(test.id)}
              onDuplicate={() => onDuplicateCase(test.id)}
              onRestore={() => onRestoreCase(test.id)}
              onDeletePermanently={() => onDeleteCasePermanently(test.id)}
              onArchive={() => onArchiveCase(test.id)}
            />
          ))}
          <div
            onDragOver={(event) => {
              if (draggedTestIds.length === 0) {
                return
              }

              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = 'move'
              onSuiteDragOver(event, section.id)
            }}
            onDrop={(event) => onSuiteAppendDrop(event, section.id)}
            className={`border-t border-dashed px-5 py-3 text-center text-xs font-semibold uppercase tracking-[0.08em] transition ${
              dragOverSuiteId === section.id && !dragOverTestDrop
                ? 'border-[var(--tms-primary-border)] bg-[var(--tms-primary-soft)] text-[var(--tms-primary)]'
                : 'border-[var(--tms-border-subtle)] text-[var(--tms-text-soft)]'
            }`}
          >
            Drop here to move to the end
          </div>
        </div>
      )}
    </section>
  )
}
