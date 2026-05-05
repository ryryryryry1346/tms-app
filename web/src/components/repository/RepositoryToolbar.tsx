import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PanelHeader } from '../ui/Panel'
import { Select } from '../ui/Select'

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

type RepositorySuiteOption = {
  id: number
  name: string
}

type RepositoryToolbarProps = {
  visibleCount: number
  searchValue: string
  suiteFilterId: string
  priorityFilter: RepositoryPriorityFilter
  caseTypeFilter: RepositoryCaseTypeFilter
  caseFilter: RepositoryCaseFilter
  allSuitesFilter: string
  suites: RepositorySuiteOption[]
  priorityOptions: Exclude<RepositoryPriorityFilter, 'All'>[]
  caseTypeOptions: Exclude<RepositoryCaseTypeFilter, 'All'>[]
  onSearchChange: (value: string) => void
  onSuiteFilterChange: (value: string) => void
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

function getCaseFilterChipClass(filter: RepositoryCaseFilter): string {
  if (filter === 'Ready') {
    return 'tms-chip-status-ready'
  }

  if (filter === 'Draft') {
    return 'tms-chip-status-draft'
  }

  if (filter === 'Archived') {
    return 'tms-chip-status-archived'
  }

  return 'tms-chip-primary'
}

export function RepositoryToolbar({
  visibleCount,
  searchValue,
  suiteFilterId,
  priorityFilter,
  caseTypeFilter,
  caseFilter,
  allSuitesFilter,
  suites,
  priorityOptions,
  caseTypeOptions,
  onSearchChange,
  onSuiteFilterChange,
  onPriorityFilterChange,
  onCaseTypeFilterChange,
  onCaseFilterChange,
}: RepositoryToolbarProps) {
  return (
    <PanelHeader>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="m-0 text-xl font-semibold text-[var(--tms-text)]">
            Test suites and cases
          </h2>
          <div className="tms-kicker mt-1">
            {visibleCount} visible cases
          </div>
        </div>
        <div className="tms-toolbar justify-end">
          <label className="flex items-center gap-2">
            <span className="shrink-0 whitespace-nowrap font-semibold">
              Search
            </span>
            <Input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              className="w-[260px]"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold">Suite</span>
            <Select
              value={suiteFilterId}
              onChange={(event) => onSuiteFilterChange(event.target.value)}
              className="min-w-[160px]"
            >
              <option value={allSuitesFilter}>All suites</option>
              {suites.map((section) => (
                <option key={section.id} value={section.id.toString()}>
                  {section.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold">Priority</span>
            <Select
              value={priorityFilter}
              onChange={(event) =>
                onPriorityFilterChange(
                  event.target.value as RepositoryPriorityFilter,
                )
              }
              className="min-w-[110px]"
            >
              <option value="All">All</option>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex items-center gap-2">
            <span className="font-semibold">Type</span>
            <Select
              value={caseTypeFilter}
              onChange={(event) =>
                onCaseTypeFilterChange(
                  event.target.value as RepositoryCaseTypeFilter,
                )
              }
              className="min-w-[120px]"
            >
              <option value="All">All</option>
              {caseTypeOptions.map((caseType) => (
                <option key={caseType} value={caseType}>
                  {caseType}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap gap-2">
            {CASE_FILTER_OPTIONS.map((filter) => (
              <Button
                key={filter}
                onClick={() => onCaseFilterChange(filter)}
                variant={caseFilter === filter ? 'primary' : 'default'}
                className={`${
                  caseFilter === filter ? getCaseFilterChipClass(filter) : ''
                }`}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </PanelHeader>
  )
}
