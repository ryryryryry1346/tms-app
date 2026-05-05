import type { ReactNode } from 'react'
import { Panel } from '../ui/Panel'

type RepositoryPanelProps = {
  children: ReactNode
}

export function RepositoryPanel({ children }: RepositoryPanelProps) {
  return (
    <Panel id="project-suites" className="overflow-visible">
      {children}
    </Panel>
  )
}
