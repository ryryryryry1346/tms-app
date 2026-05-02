type RepositoryEmptyReason = 'no-suites' | 'no-matching-cases'
type RepositoryCaseFilter = 'All' | 'Ready' | 'Draft' | 'Archived'

type RepositoryEmptyStateProps = {
  reason: RepositoryEmptyReason
  caseFilter?: RepositoryCaseFilter
}

function getEmptyMessage({
  reason,
  caseFilter = 'All',
}: RepositoryEmptyStateProps): string {
  if (reason === 'no-suites') {
    return 'This project does not have test suites yet.'
  }

  if (caseFilter === 'All') {
    return 'No test cases match the current search and suite filters.'
  }

  if (caseFilter === 'Archived') {
    return 'No archived test cases match the current search and suite filters.'
  }

  return `No ${caseFilter.toLowerCase()} test cases match the current search and suite filters.`
}

export function RepositoryEmptyState(props: RepositoryEmptyStateProps) {
  return (
    <div className="m-5 rounded-2xl border border-dashed border-[#dbe4f4] bg-[#f8faff] p-6 text-sm text-[#63759a]">
      {getEmptyMessage(props)}
    </div>
  )
}
