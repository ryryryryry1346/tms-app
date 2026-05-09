import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  THEME_STORAGE_KEY,
  applyResolvedTheme,
  readStoredThemePreference,
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../lib/theme'

type ThemeContextValue = {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getInitialPreference(): ThemePreference {
  if (typeof document === 'undefined') {
    return 'light'
  }

  const attribute = document.documentElement.getAttribute('data-theme-preference')
  return attribute === 'light' || attribute === 'dark' ? attribute : 'light'
}

function getInitialResolvedTheme(): ResolvedTheme {
  if (typeof document === 'undefined') {
    return 'light'
  }

  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? 'dark'
    : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(
    getInitialPreference,
  )
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    getInitialResolvedTheme,
  )

  useEffect(() => {
    const nextPreference = readStoredThemePreference()
    const nextResolvedTheme = resolveTheme(nextPreference)

    setPreferenceState(nextPreference)
    setResolvedTheme(nextResolvedTheme)
    applyResolvedTheme(document.documentElement, nextPreference, nextResolvedTheme)
  }, [])

  function setPreference(nextPreference: ThemePreference): void {
    const nextResolvedTheme = resolveTheme(nextPreference)
    window.localStorage.setItem(THEME_STORAGE_KEY, nextPreference)
    applyResolvedTheme(document.documentElement, nextPreference, nextResolvedTheme)
    setPreferenceState(nextPreference)
    setResolvedTheme(nextResolvedTheme)
  }

  const value = {
    preference,
    resolvedTheme,
    setPreference,
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext)

  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider.')
  }

  return value
}
