type RepositoryErrorBannerProps = {
  message: string
}

export function RepositoryErrorBanner({ message }: RepositoryErrorBannerProps) {
  return (
    <div className="mx-5 mt-4 rounded-xl border border-rose-300/70 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      {message}
    </div>
  )
}
