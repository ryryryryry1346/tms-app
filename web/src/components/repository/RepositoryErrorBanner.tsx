type RepositoryErrorBannerProps = {
  message: string
}

export function RepositoryErrorBanner({ message }: RepositoryErrorBannerProps) {
  return (
    <div className="mx-5 mt-4 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-danger-soft)] px-4 py-3 text-sm text-[var(--tms-danger)]">
      {message}
    </div>
  )
}
