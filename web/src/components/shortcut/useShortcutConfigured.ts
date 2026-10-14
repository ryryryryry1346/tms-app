import { useEffect, useState } from 'react'
import { getShortcutStatus } from '../../features/shortcut/server'

/**
 * Whether Shortcut is connected for the project. Starts as false and is
 * loaded in the background so pages render without waiting for it; failures
 * simply keep the Shortcut actions hidden.
 */
export function useShortcutConfigured(projectId: number | null | undefined): boolean {
  const [configured, setConfigured] = useState(false)

  useEffect(() => {
    if (!projectId) {
      setConfigured(false)
      return
    }

    let cancelled = false

    getShortcutStatus({ data: { projectId } })
      .then((status) => {
        if (!cancelled) {
          setConfigured(status.configured)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfigured(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  return configured
}
