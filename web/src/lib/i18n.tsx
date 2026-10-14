/**
 * The interface is English-only. `t()` stays as a tiny helper so UI copy can
 * use `{name}` placeholders: `t('Run #{id}', { id: 3 })` -> "Run #3".
 */

type TranslateVars = Record<string, string | number>

export type TranslateFn = (text: string, vars?: TranslateVars) => string

function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) {
    return text
  }

  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

export const translate: TranslateFn = (text, vars) => interpolate(text, vars)

/** Returns the copy helper: `const t = useT(); t('Save')`. */
export function useT(): TranslateFn {
  return translate
}
