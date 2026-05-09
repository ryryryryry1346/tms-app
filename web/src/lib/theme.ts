export type ThemePreference = 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'tms-theme-preference'

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference
}

export function applyResolvedTheme(
  root: HTMLElement,
  preference: ThemePreference,
  resolvedTheme: ResolvedTheme,
): void {
  root.setAttribute('data-theme', resolvedTheme)
  root.setAttribute('data-theme-preference', preference)
  root.style.colorScheme = resolvedTheme
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'light'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'light'
}

export const THEME_INIT_SCRIPT = `(function(){try{var key='${THEME_STORAGE_KEY}';var stored=window.localStorage.getItem(key);var preference=(stored==='light'||stored==='dark')?stored:'light';var root=document.documentElement;root.setAttribute('data-theme',preference);root.setAttribute('data-theme-preference',preference);root.style.colorScheme=preference;}catch(e){}})();`
