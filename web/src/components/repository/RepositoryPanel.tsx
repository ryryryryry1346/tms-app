import type { ReactNode } from 'react'

type RepositoryPanelProps = {
  children: ReactNode
}

export function RepositoryPanel({ children }: RepositoryPanelProps) {
  return (
    <section id="project-suites" className="tms-panel overflow-visible">
      {children}
    </section>
  )
}
