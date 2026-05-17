import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import {
  PopoverMenu,
  PopoverMenuItem,
  PopoverMenuLabel,
} from '../ui/PopoverMenu'
import { SelectMenu } from '../ui/SelectMenu'
import type {
  RepositoryColumnKey,
  RepositoryVisibleColumns,
} from './CaseRow'
import { REPOSITORY_COLUMN_LABELS } from './CaseRow'

export type RepositoryCaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'
export type RepositoryPriorityFilter =
  | 'All'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Critical'
export type RepositoryCaseTypeFilter =
  | 'All'
  | 'Functional'
  | 'Regression'
  | 'Smoke'
  | 'E2E'
  | 'UI'
  | 'API'

type RepositoryToolbarProps = {
  searchValue: string
  priorityFilter: RepositoryPriorityFilter
  caseTypeFilter: RepositoryCaseTypeFilter
  caseFilter: RepositoryCaseFilter
  priorityOptions: Exclude<RepositoryPriorityFilter, 'All'>[]
  caseTypeOptions: Exclude<RepositoryCaseTypeFilter, 'All'>[]
  visibleColumns: RepositoryVisibleColumns
  onSearchChange: (value: string) => void
  onToggleColumn: (column: RepositoryColumnKey) => void
  onPriorityFilterChange: (value: RepositoryPriorityFilter) => void
  onCaseTypeFilterChange: (value: RepositoryCaseTypeFilter) => void
  onCaseFilterChange: (value: RepositoryCaseFilter) => void
}

const CASE_FILTER_OPTIONS: RepositoryCaseFilter[] = [
  'All',
  'Ready',
  'Draft',
  'Archived',
]

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="repository-toolbar__search-icon"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="4.25" />
      <path d="m10.25 10.25 2.75 2.75" />
    </svg>
  )
}

function ColumnsIcon() {
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
      <path d="M3 4h10" />
      <path d="M3 8h10" />
      <path d="M3 12h10" />
      <path d="M5.5 3v10" />
      <path d="M10.5 3v10" />
    </svg>
  )
}

export function RepositoryToolbar({
  searchValue,
  priorityFilter,
  caseTypeFilter,
  caseFilter,
  priorityOptions,
  caseTypeOptions,
  visibleColumns,
  onSearchChange,
  onToggleColumn,
  onPriorityFilterChange,
  onCaseTypeFilterChange,
  onCaseFilterChange,
}: RepositoryToolbarProps) {
  const [isTableSettingsOpen, setIsTableSettingsOpen] = useState(false)
  const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length

  return (
    <div className="repository-toolbar">
      <div className="repository-toolbar__search-wrap">
        <SearchIcon />
        <Input
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          className="repository-toolbar__search-input"
          placeholder="Search test suites or cases..."
          aria-label="Search test suites or cases"
        />
      </div>

      <div className="repository-toolbar__filter-wrap">
        <label className="repository-toolbar__filter">
          <span>Priority</span>
          <SelectMenu
            value={priorityFilter}
            onValueChange={(value) =>
              onPriorityFilterChange(value as RepositoryPriorityFilter)
            }
            options={[
              { value: 'All', label: 'All' },
              ...priorityOptions.map((priority) => ({
                value: priority,
                label: priority,
              })),
            ]}
            className="repository-toolbar__select"
            aria-label="Filter by priority"
          />
        </label>

        <label className="repository-toolbar__filter">
          <span>Type</span>
          <SelectMenu
            value={caseTypeFilter}
            onValueChange={(value) =>
              onCaseTypeFilterChange(value as RepositoryCaseTypeFilter)
            }
            options={[
              { value: 'All', label: 'All' },
              ...caseTypeOptions.map((caseType) => ({
                value: caseType,
                label: caseType,
              })),
            ]}
            className="repository-toolbar__select"
            aria-label="Filter by type"
          />
        </label>
      </div>

      <div
        className="repository-toolbar__status-segmented"
        role="group"
        aria-label="Filter by case status"
      >
        {CASE_FILTER_OPTIONS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onCaseFilterChange(filter)}
            className={`repository-toolbar__status-button ${
              caseFilter === filter ? 'is-active' : ''
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="repository-toolbar__spacer" />

      <PopoverMenu
        isOpen={isTableSettingsOpen}
        onClose={() => setIsTableSettingsOpen(false)}
        onOpenChange={setIsTableSettingsOpen}
        className="min-w-[220px]"
        trigger={
          <Button
            type="button"
            variant="secondary"
            aria-label="Configure repository table"
            className="repository-toolbar__columns-button"
          >
            <ColumnsIcon />
            Columns
          </Button>
        }
      >
        <PopoverMenuLabel>Columns</PopoverMenuLabel>
        {(Object.keys(REPOSITORY_COLUMN_LABELS) as RepositoryColumnKey[]).map(
          (column) => {
            const isChecked = visibleColumns[column]
            const isLocked = isChecked && visibleColumnCount <= 1

            return (
              <PopoverMenuItem
                key={column}
                role="menuitemcheckbox"
                aria-checked={isChecked}
                disabled={isLocked}
                onClick={(event) => {
                  event.preventDefault()

                  if (isLocked) {
                    return
                  }

                  onToggleColumn(column)
                }}
                className="repository-column-menu-item"
              >
                <span
                  aria-hidden="true"
                  className={`repository-column-checkbox ${
                    isChecked ? 'repository-column-checkbox--checked' : ''
                  }`}
                />
                <span className="repository-column-menu-item__label">
                  {REPOSITORY_COLUMN_LABELS[column]}
                </span>
              </PopoverMenuItem>
            )
          },
        )}
      </PopoverMenu>
    </div>
  )
}
