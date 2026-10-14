import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

/**
 * Grammars supported in code blocks. Shared by the editor (lowlight) and by
 * read mode (highlightCodeInHtml) so both highlight identically.
 */
export const CODE_LANGUAGE_GRAMMARS = {
  json,
  sql,
  python,
  javascript,
  typescript,
  bash,
  xml,
  yaml,
}

for (const [name, grammar] of Object.entries(CODE_LANGUAGE_GRAMMARS)) {
  hljs.registerLanguage(name, grammar)
}

export const CODE_LANGUAGES: Array<{ value: string; label: string }> = [
  { value: 'plain', label: 'Plain text' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'bash', label: 'Bash' },
  { value: 'xml', label: 'XML / HTML' },
  { value: 'yaml', label: 'YAML' },
]

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
}

const CODE_BLOCK_PATTERN =
  /<pre><code(?:\s+class="language-([\w+-]+)")?>([\s\S]*?)<\/code><\/pre>/g

/**
 * Read mode: turn the plain `<pre><code class="language-x">` blocks stored by
 * the editor into highlighted markup (`hljs-*` spans) with a Copy button.
 * Must run before DOMPurify, which keeps the spans/classes/button.
 */
export function highlightCodeInHtml(html: string): string {
  if (!html.includes('<pre>')) {
    return html
  }

  return html.replace(
    CODE_BLOCK_PATTERN,
    (_match, rawLanguage: string | undefined, body: string) => {
      const code = decodeHtmlEntities(body)
      const language =
        rawLanguage && hljs.getLanguage(rawLanguage) ? rawLanguage : null
      let inner = escapeHtml(code)

      if (language) {
        try {
          inner = hljs.highlight(code, { language, ignoreIllegals: true }).value
        } catch {
          inner = escapeHtml(code)
        }
      }

      const codeClass = language ? `hljs language-${language}` : 'hljs'

      return `<pre><button type="button" class="code-copy-btn" data-code-copy aria-label="Copy code">Copy</button><code class="${codeClass}">${inner}</code></pre>`
    },
  )
}

export type PastedCode = {
  /** highlight.js language name, or null for a plain code block. */
  language: string | null
  /** Text to place in the block (JSON is pretty-printed when minified). */
  text: string
}

const SQL_START =
  /^\s*(select|insert\s+into|update|delete\s+from|create\s+(or\s+replace\s+)?(table|index|view|database|schema|function|procedure)|alter\s+table|drop\s+(table|index|view|database)|truncate\s+table|with\s+\w+\s+as)\b/i
const SQL_SIMPLE_SELECT =
  /^\s*select\s+(distinct\s+)?(\*|[\w.`"[\]]+\s*(,|\s+from\b|\s+as\b))/i
const SQL_BODY = /\b(from|into|set|values|table|where|join)\b/i

function tryParseJson(text: string): unknown {
  const trimmed = text.trim()

  if (
    !(
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    )
  ) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    return typeof parsed === 'object' && parsed !== null ? parsed : undefined
  } catch {
    return undefined
  }
}

// Leading `-- …` / `/* … */` comments are common at the top of a script.
const LEADING_SQL_COMMENTS = /^(\s*(--[^\n]*(\n|$)|\/\*[\s\S]*?\*\/))+/

function looksLikeSql(text: string): boolean {
  const trimmed = text.replace(LEADING_SQL_COMMENTS, '').trim()
  const multiline = trimmed.includes('\n')

  if (SQL_SIMPLE_SELECT.test(trimmed)) {
    return true
  }

  return (
    SQL_START.test(trimmed) &&
    SQL_BODY.test(trimmed) &&
    (multiline || trimmed.endsWith(';'))
  )
}

function looksLikeCode(text: string): boolean {
  const lines = text.split('\n').filter((line) => line.trim() !== '')

  if (lines.length < 3) {
    return false
  }

  const codeish = lines.filter(
    (line) =>
      /^(\s{2,}|\t)\S/.test(line) ||
      /[;{}()[\]]\s*$/.test(line) ||
      /^\s*(\/\/|#|\/\*|\*|import |from |def |class |function |const |let |var |return |if |for |while |<\/?\w)/.test(
        line,
      ),
  )

  return codeish.length / lines.length >= 0.6
}

function guessLanguage(text: string): string | null {
  const trimmed = text.trim()

  if (trimmed.startsWith('#!') || /^\$\s+\S/.test(trimmed)) {
    return 'bash'
  }

  if (/^<\?xml\b/i.test(trimmed) || /^<[\w!][\s\S]*>$/.test(trimmed)) {
    return 'xml'
  }

  const result = hljs.highlightAuto(text, [
    'python',
    'typescript',
    'javascript',
    'bash',
    'yaml',
    'xml',
    'sql',
  ])

  return result.language && result.relevance >= 5 ? result.language : null
}

/**
 * Smart paste: decide whether clipboard plain text is JSON / SQL / code that
 * should land in a code block. Returns null for ordinary prose (pasted
 * normally). Already multi-line JSON keeps its own formatting; only minified
 * JSON is pretty-printed, and never when it holds numbers beyond double
 * precision (re-serialising would silently change them).
 */
export function analyzePastedText(rawText: string): PastedCode | null {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\s+$/, '')

  if (text.trim().length < 2) {
    return null
  }

  const parsed = tryParseJson(text)

  if (parsed !== undefined) {
    const isMinified = !text.includes('\n')
    const hasBigNumbers = /\d{16,}/.test(text)

    return {
      language: 'json',
      text:
        isMinified && !hasBigNumbers ? JSON.stringify(parsed, null, 2) : text,
    }
  }

  if (looksLikeSql(text)) {
    return { language: 'sql', text }
  }

  if (looksLikeCode(text)) {
    return { language: guessLanguage(text), text }
  }

  return null
}
