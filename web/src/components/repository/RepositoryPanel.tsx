import type { ReactNode } from 'react'
import { Panel } from '../ui/Panel'

type RepositoryPanelProps = {
  children: ReactNode
  className?: string
}

export function RepositoryPanel({ children, className }: RepositoryPanelProps) {
  return (
    <Panel
      id="project-suites"
      className={className ?? 'overflow-visible'}
    >
      {children}
    </Panel>
  )
}
