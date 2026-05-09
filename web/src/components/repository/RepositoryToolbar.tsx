import { WorkspaceSectionHeader } from '../layout/WorkspaceSectionHeader'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { PanelHeader } from '../ui/Panel'
import { SelectMenu } from '../ui/SelectMenu'

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
    <PanelHeader dense>
      <WorkspaceSectionHeader
        dense
        title="Test suites and cases"
        meta={`${visibleCount} visible cases`}
        actions={
          <div className="tms-toolbar repository-toolbar__controls justify-end">
            <label className="repository-toolbar__field">
              <span className="shrink-0 whitespace-nowrap font-semibold">
                Search
              </span>
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                className="repository-toolbar__input"
              />
            </label>
            <label className="repository-toolbar__field">
              <span className="font-semibold">Suite</span>
              <SelectMenu
                value={suiteFilterId}
                onValueChange={onSuiteFilterChange}
                options={[
                  { value: allSuitesFilter, label: 'All suites' },
                  ...suites.map((section) => ({
                    value: section.id.toString(),
                    label: section.name,
                  })),
                ]}
                className="min-w-[140px]"
                aria-label="Filter by suite"
              />
            </label>
            <label className="repository-toolbar__field">
              <span className="font-semibold">Priority</span>
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
                className="min-w-[96px]"
                aria-label="Filter by priority"
              />
            </label>
            <label className="repository-toolbar__field">
              <span className="font-semibold">Type</span>
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
                className="min-w-[104px]"
                aria-label="Filter by type"
              />
            </label>
            <div className="repository-toolbar__chips">
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
        }
      />
    </PanelHeader>
  )
}
