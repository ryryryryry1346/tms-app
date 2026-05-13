import { lazy } from 'react'

let richTextEditorPromise: Promise<typeof import('./RichTextEditor')> | null = null

export function preloadRichTextEditor(): Promise<typeof import('./RichTextEditor')> {
  richTextEditorPromise ??= import('./RichTextEditor')

  return richTextEditorPromise
}

export const LazyRichTextEditor = lazy(() =>
  preloadRichTextEditor().then((module) => ({
    default: module.RichTextEditor,
  })),
)
