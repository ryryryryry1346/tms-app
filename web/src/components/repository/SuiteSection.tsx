import type { DragEvent, FormEvent } from 'react'
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
      <div className="grid grid-cols-[44px_82px_minmax(220px,1fr)_110px_110px_110px_110px_110px_96px] items-center border-t border-[#dbe4f4] bg-[#f8fbff] px-5 py-2.5">
        <div />
        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[#9aa7bf]">
          New
        </div>
        <input
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
          className="min-w-0 rounded-lg border border-[#c7d5ee] bg-white px-2 py-1 text-sm font-semibold text-[#1b2f5b] outline-none disabled:cursor-not-allowed disabled:opacity-55"
        />
        <select
          value={quickCreatePriority}
          onChange={(event) =>
            onQuickCreatePriorityChange(
              event.target.value as RepositoryCasePriority,
            )
          }
          disabled={isPending}
          className="w-fit rounded-full border-0 bg-[#eef6ff] px-2.5 py-1 text-xs font-semibold text-[#506487] outline-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          {priorityOptions.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <select
          value={quickCreateType}
          onChange={(event) =>
            onQuickCreateTypeChange(event.target.value as RepositoryCaseType)
          }
          disabled={isPending}
          className="w-fit rounded-full border-0 bg-[#f3f5f9] px-2.5 py-1 text-xs font-semibold text-[#60718f] outline-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          {caseTypeOptions.map((caseType) => (
            <option key={caseType} value={caseType}>
              {caseType}
            </option>
          ))}
        </select>
        <span className="text-sm font-semibold text-[#9aa7bf]">-</span>
        <span className="text-sm font-semibold text-[#9aa7bf]">-</span>
        <select
          value={quickCreateStatus}
          onChange={(event) =>
            onQuickCreateStatusChange(
              event.target.value as RepositoryQuickCreateStatus,
            )
          }
          disabled={isPending}
          className="w-fit rounded-full border-0 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 outline-none disabled:cursor-not-allowed disabled:opacity-55"
        >
          {quickCreateStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onSubmitQuickCreateCase(section.id)}
            disabled={isPending}
            className="rounded-lg border border-[#9dbaf7] bg-white px-2.5 py-1 text-sm font-semibold text-[#3369d6] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {isPending ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <section
      onDragOver={(event) => onSuiteDragOver(event, section.id)}
      onDragLeave={() => onSuiteDragLeave(section.id)}
      className={`overflow-visible rounded-3xl border transition ${
        dragOverSuiteId === section.id
          ? 'border-[#2f6fe4] bg-[#f8fbff] shadow-[0_0_0_3px_rgba(47,111,228,0.12)]'
          : 'border-[#dfe6f4]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9eef8] bg-[#fbfcff] px-5 py-4">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => onToggleCollapsed(section.id)}
            className="rounded-lg px-2 py-1 text-sm font-semibold text-[#506487]"
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
                <input
                  value={editingSuiteName}
                  onChange={(event) =>
                    onEditingSuiteNameChange(event.target.value)
                  }
                  className="min-w-[220px] rounded-xl border border-[#d9e2f2] bg-white px-3 py-2 text-base font-semibold text-[#1b2f5b] outline-none transition focus:border-[#2f6fe4]"
                />
                <button
                  type="submit"
                  disabled={isPendingSuiteAction}
                  className="rounded-xl border border-[#2f6fe4] bg-[#2f6fe4] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {isPendingSuiteAction ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={onCancelRenameSuite}
                  className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-[1.75rem] font-semibold text-[#1b2f5b]">
                  {section.name}
                </div>
                <div className="text-sm text-[#7f8da9]">
                  {sectionTests.length} case
                  {sectionTests.length === 1 ? '' : 's'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-xs font-semibold text-[#60718f]">
            Ready {readyCount}
          </span>
          <span className="rounded-full bg-[#f3f5f9] px-3 py-1 text-xs font-semibold text-[#60718f]">
            Draft {draftCount}
          </span>
          {dragOverSuiteId === section.id ? (
            <span className="rounded-full bg-[#ecf2ff] px-3 py-1 text-xs font-semibold text-[#2f6fe4]">
              Drop to move
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => onToggleSuiteSelection(visibleTestIds)}
            disabled={visibleTestIds.length === 0 || isApplyingBulkAction}
            className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {allVisibleSelected ? 'Clear cases' : 'Select cases'}
          </button>
          <button
            type="button"
            onClick={() => onStartQuickCreateCase(section.id)}
            className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6]"
          >
            + Case
          </button>
          {!isEditingSuite ? (
            <div className="relative">
              <button
                type="button"
                disabled={isPendingSuiteAction}
                onClick={() => onToggleSuiteMenu(section.id)}
                className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
                aria-label="Open suite actions"
              >
                ...
              </button>
              {isMenuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-2 min-w-[190px] rounded-2xl border border-[#dbe4f4] bg-white p-2 shadow-[0_12px_30px_rgba(31,57,102,0.12)]">
                  <button
                    type="button"
                    onClick={() => onStartRenameSuite(section.id, section.name)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#60718f] hover:bg-[#f5f8ff]"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleCollapsed(section.id)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#60718f] hover:bg-[#f5f8ff]"
                  >
                    {isCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDeleteSuite(section.id)}
                    className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Delete empty suite
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {isDeleteConfirming ? (
        <div className="border-b border-[#e9eef8] bg-amber-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-amber-950">
              Delete this suite? This only works when the suite has no test cases.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPendingSuiteAction}
                onClick={() => onConfirmDeleteSuite(section.id)}
                className="rounded-xl border border-rose-200 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700"
              >
                Confirm delete
              </button>
              <button
                type="button"
                onClick={onCancelDeleteSuite}
                className="rounded-xl border border-[#dbe4f4] bg-white px-3 py-2 text-sm font-semibold text-[#60718f]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {suiteActionErrorMessage && showSuiteActionError ? (
        <div className="border-b border-[#e9eef8] bg-rose-50 px-5 py-3 text-sm text-rose-900">
          {suiteActionErrorMessage}
        </div>
      ) : null}

      {isCollapsed ? null : visibleTests.length === 0 ? (
        <div className="bg-white">
          <div className="px-5 py-4 text-sm text-[#63759a]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>No test cases in this suite yet.</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onStartQuickCreateCase(section.id)}
                  className="rounded-xl border border-[#9dbaf7] bg-white px-3 py-2 text-sm font-semibold text-[#3369d6]"
                >
                  + Case
                </button>
              </div>
            </div>
          </div>
          {isQuickCreateOpen ? renderQuickCreateCaseRow() : null}
        </div>
      ) : (
        <div className="bg-white">
          <div className="grid grid-cols-[64px_82px_minmax(220px,1fr)_110px_110px_110px_110px_110px_96px] items-center border-t border-[#e9eef8] bg-[#fbfcff] px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#7f8da9]">
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
                ? 'border-[#9dbaf7] bg-[#ecf2ff] text-[#2f6fe4]'
                : 'border-[#e9eef8] text-[#9aa7bf]'
            }`}
          >
            Drop here to move to the end
          </div>
        </div>
      )}
    </section>
  )
}
