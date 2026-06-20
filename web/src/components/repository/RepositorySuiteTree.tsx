import { type FormEvent, useMemo, useState } from 'react'
import { Alert } from '../ui/Alert'
import { Button } from '../ui/Button'
import { ConfirmActionAlert } from '../ui/ConfirmActionAlert'
import { Input } from '../ui/Input'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuLabel,
  PopoverMenuSeparator,
} from '../ui/PopoverMenu'

type RepositorySuiteTreeSection = {
  id: number
  name: string
}

type RepositorySuiteTreeStats = {
  sectionId: number
  activeCases: number
  readyCases: number
  draftCases: number
  archivedCases: number
}

type RepositorySuiteTreeProps = {
  sections: RepositorySuiteTreeSection[]
  suiteStats: RepositorySuiteTreeStats[]
  selectedSuiteId: string
  allSuitesFilter: string
  totalActiveCases: number
  isLoadingCounts: boolean
  editingSuiteId: number | null
  editingSuiteName: string
  deleteConfirmSuiteId: number | null
  openSuiteMenuId: number | null
  pendingSuiteActionById: Record<number, boolean>
  suiteActionErrorMessage: string | null
  suiteActionSuiteId: number | null
  onSelectSuite: (suiteId: string) => void
  onCreateSuite: () => void
  onCreateCase: (suiteId: number) => void
  onStartRenameSuite: (suiteId: number, suiteName: string) => void
  onRenameSuite: (event: FormEvent<HTMLFormElement>, suiteId: number) => void
  onEditingSuiteNameChange: (value: string) => void
  onCancelRenameSuite: () => void
  onRequestDeleteSuite: (suiteId: number) => void
  onConfirmDeleteSuite: (suiteId: number) => void
  onCancelDeleteSuite: () => void
  onToggleSuiteMenu: (suiteId: number) => void
  onCloseSuiteMenu: () => void
}

function FolderIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 4.5h4l1.2 1.4h5.8v5.6a1 1 0 0 1-1 1h-10a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1Z" />
    </svg>
  )
}

function AllCasesIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3.5h10M3 8h10M3 12.5h10" />
    </svg>
  )
}

export function RepositorySuiteTree({
  sections,
  suiteStats,
  selectedSuiteId,
  allSuitesFilter,
  totalActiveCases,
  isLoadingCounts,
  editingSuiteId,
  editingSuiteName,
  deleteConfirmSuiteId,
  openSuiteMenuId,
  pendingSuiteActionById,
  suiteActionErrorMessage,
  suiteActionSuiteId,
  onSelectSuite,
  onCreateSuite,
  onCreateCase,
  onStartRenameSuite,
  onRenameSuite,
  onEditingSuiteNameChange,
  onCancelRenameSuite,
  onRequestDeleteSuite,
  onConfirmDeleteSuite,
  onCancelDeleteSuite,
  onToggleSuiteMenu,
  onCloseSuiteMenu,
}: RepositorySuiteTreeProps) {
  const [suiteSearchValue, setSuiteSearchValue] = useState('')
  const statsBySectionId = new Map(
    suiteStats.map((stats) => [stats.sectionId, stats]),
  )
  const areSuiteCountsPending = isLoadingCounts || suiteStats.length === 0
  const normalizedSuiteSearch = suiteSearchValue.trim().toLowerCase()
  const filteredSections = useMemo(() => {
    if (!normalizedSuiteSearch) {
      return sections
    }

    return sections.filter((section) =>
      section.name.toLowerCase().includes(normalizedSuiteSearch),
    )
  }, [normalizedSuiteSearch, sections])

  return (
    <aside className="repository-browser-tree" aria-label="Repository suites">
      <div className="repository-browser-tree__header">
        <div>
          <div className="repository-browser-tree__title">Suites</div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="repository-browser-tree__add"
          onClick={onCreateSuite}
          aria-label="Create suite"
        >
          +
        </Button>
      </div>
      <Input
        value={suiteSearchValue}
        onChange={(event) => setSuiteSearchValue(event.currentTarget.value)}
        className="repository-browser-tree__search"
        placeholder="Search suites"
        aria-label="Search suites"
      />

      <button
        type="button"
        className={`repository-browser-tree__item ${
          selectedSuiteId === allSuitesFilter
            ? 'repository-browser-tree__item--active'
            : ''
        }`}
        onClick={() => onSelectSuite(allSuitesFilter)}
      >
        <span className="repository-browser-tree__item-main">
          <AllCasesIcon />
          <span>All test cases</span>
        </span>
        <span className="repository-browser-tree__count">
          {isLoadingCounts ? '...' : totalActiveCases}
        </span>
      </button>

      <div className="repository-browser-tree__list">
        {filteredSections.map((section) => {
          const stats = statsBySectionId.get(section.id)
          const activeCases = stats?.activeCases ?? 0
          const isActive = selectedSuiteId === section.id.toString()
          const isEditing = editingSuiteId === section.id
          const isDeleteConfirming = deleteConfirmSuiteId === section.id
          const isPending = pendingSuiteActionById[section.id] === true
          const showSuiteError =
            suiteActionSuiteId === section.id && suiteActionErrorMessage

          return (
            <div key={section.id} className="repository-browser-tree__suite">
              {isEditing ? (
                <form
                  className="repository-browser-tree__rename"
                  onSubmit={(event) => onRenameSuite(event, section.id)}
                >
                  <Input
                    value={editingSuiteName}
                    onChange={(event) =>
                      onEditingSuiteNameChange(event.currentTarget.value)
                    }
                    size="sm"
                    autoFocus
                  />
                  <div className="repository-browser-tree__rename-actions">
                    <Button type="submit" size="sm" variant="primary" disabled={isPending}>
                      {isPending ? 'Saving' : 'Save'}
                    </Button>
                    <Button type="button" size="sm" onClick={onCancelRenameSuite}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div
                  className={`repository-browser-tree__item ${
                    isActive ? 'repository-browser-tree__item--active' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="repository-browser-tree__item-button"
                    onClick={() => onSelectSuite(section.id.toString())}
                  >
                    <span className="repository-browser-tree__item-main">
                      <FolderIcon />
                      <span className="truncate">{section.name}</span>
                    </span>
                    <span className="repository-browser-tree__count">
                      {areSuiteCountsPending ? '...' : activeCases}
                    </span>
                  </button>
                  <PopoverMenu
                    isOpen={openSuiteMenuId === section.id}
                    onClose={onCloseSuiteMenu}
                    onOpenChange={(nextOpen) => {
                      if (nextOpen) {
                        onToggleSuiteMenu(section.id)
                      }
                    }}
                    align="right"
                    className="min-w-[190px]"
                    trigger={
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isPending}
                        className="repository-browser-tree__menu-trigger"
                        aria-label={`Open actions for ${section.name}`}
                      >
                        ...
                      </Button>
                    }
                  >
                    <PopoverMenuLabel>Suite</PopoverMenuLabel>
                    <PopoverMenuItem onClick={() => onCreateCase(section.id)}>
                      Create case
                    </PopoverMenuItem>
                    <PopoverMenuItem
                      onClick={() => onStartRenameSuite(section.id, section.name)}
                    >
                      Rename
                    </PopoverMenuItem>
                    <PopoverMenuSeparator />
                    <PopoverMenuItem
                      tone="danger"
                      onClick={() => onRequestDeleteSuite(section.id)}
                    >
                      Delete empty suite
                    </PopoverMenuItem>
                  </PopoverMenu>
                </div>
              )}

              {isDeleteConfirming ? (
                <div className="repository-browser-tree__confirm">
                  <ConfirmActionAlert
                    title="Delete empty suite?"
                    description="Only suites without test cases can be deleted."
                    confirmLabel="Delete"
                    pendingLabel="Deleting"
                    confirmVariant="danger"
                    isPending={isPending}
                    onCancel={onCancelDeleteSuite}
                    onConfirm={() => onConfirmDeleteSuite(section.id)}
                  />
                </div>
              ) : null}

              {showSuiteError ? (
                <Alert variant="danger" density="compact">
                  {suiteActionErrorMessage}
                </Alert>
              ) : null}
            </div>
          )
        })}
        {filteredSections.length === 0 ? (
          <div className="repository-browser-tree__empty">
            {sections.length === 0
              ? 'No suites yet. Use + to create one.'
              : 'No suites match your search.'}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
