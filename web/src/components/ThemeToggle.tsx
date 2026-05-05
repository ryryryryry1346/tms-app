import { useEffect } from 'react'
import { Button } from './ui/Button'

type ThemeMode = 'light'

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') {
    return 'light'
  }

  window.localStorage.setItem('theme', 'light')
  return 'light'
}

function applyThemeMode(mode: ThemeMode) {
  document.documentElement.classList.remove('dark')
  document.documentElement.classList.add(mode)
  document.documentElement.setAttribute('data-theme', mode)
  document.documentElement.style.colorScheme = mode
}

export default function ThemeToggle() {
  useEffect(() => {
    const initialMode = getInitialMode()
    applyThemeMode(initialMode)
  }, [])

  function toggleMode() {
    applyThemeMode('light')
    window.localStorage.setItem('theme', 'light')
  }

  const label = 'Theme mode: light.'

  return (
    <Button
      type="button"
      onClick={toggleMode}
      aria-label={label}
      title={label}
      size="sm"
      className="rounded-full border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-semibold text-[var(--sea-ink)] shadow-[0_8px_22px_rgba(30,90,72,0.08)] transition hover:-translate-y-0.5"
    >
      Light
    </Button>
  )
}
