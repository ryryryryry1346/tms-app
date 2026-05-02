import type { ReactNode } from 'react'

type RepositoryPanelProps = {
  children: ReactNode
}

export function RepositoryPanel({ children }: RepositoryPanelProps) {
  return (
    <section
      id="project-suites"
      className="overflow-visible rounded-3xl border border-[#e6ecf8] bg-white shadow-[0_10px_30px_rgba(31,57,102,0.05)]"
    >
      {children}
    </section>
  )
}
