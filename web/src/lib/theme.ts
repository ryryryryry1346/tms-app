export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'tms-theme-preference'

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

export function getSystemTheme(): ResolvedTheme {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark'
  }

  return 'light'
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  return preference === 'system' ? getSystemTheme() : preference
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
    return 'system'
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemePreference(stored) ? stored : 'system'
}

export const THEME_INIT_SCRIPT = `(function(){try{var key='${THEME_STORAGE_KEY}';var stored=window.localStorage.getItem(key);var preference=(stored==='light'||stored==='dark'||stored==='system')?stored:'system';var system=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var resolved=preference==='system'?system:preference;var root=document.documentElement;root.setAttribute('data-theme',resolved);root.setAttribute('data-theme-preference',preference);root.style.colorScheme=resolved;}catch(e){}})();`
