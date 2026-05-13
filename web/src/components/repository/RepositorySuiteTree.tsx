import { Button } from '../ui/Button'

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
  onSelectSuite: (suiteId: string) => void
  onCreateSuite: () => void
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
  onSelectSuite,
  onCreateSuite,
}: RepositorySuiteTreeProps) {
  const statsBySectionId = new Map(
    suiteStats.map((stats) => [stats.sectionId, stats]),
  )

  return (
    <aside className="repository-browser-tree" aria-label="Repository suites">
      <div className="repository-browser-tree__header">
        <div>
          <div className="tms-kicker">Suites</div>
          <div className="repository-browser-tree__title">Repository</div>
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
        <span className="repository-browser-tree__count">{totalActiveCases}</span>
      </button>

      <div className="repository-browser-tree__list">
        {sections.map((section) => {
          const stats = statsBySectionId.get(section.id)
          const activeCases = stats?.activeCases ?? 0

          return (
            <button
              key={section.id}
              type="button"
              className={`repository-browser-tree__item ${
                selectedSuiteId === section.id.toString()
                  ? 'repository-browser-tree__item--active'
                  : ''
              }`}
              onClick={() => onSelectSuite(section.id.toString())}
            >
              <span className="repository-browser-tree__item-main">
                <FolderIcon />
                <span className="truncate">{section.name}</span>
              </span>
              <span className="repository-browser-tree__count">{activeCases}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
