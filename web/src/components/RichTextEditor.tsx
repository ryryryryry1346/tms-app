import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight } from 'lowlight'
import {
  FontFamily as TipTapFontFamily,
  FontSize as TipTapFontSize,
  TextStyle,
} from '@tiptap/extension-text-style'
import { mergeAttributes, Node } from '@tiptap/core'
import { useEffect, useRef, useState } from 'react'
import {
  Bold,
  CaseSensitive,
  Code as CodeIcon,
  Code2 as CodeBlockIcon,
  Wand2,
  Heading2 as HeadingIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Type,
  Underline as UnderlineIcon,
  Upload,
} from 'lucide-react'
import {
  analyzePastedText,
  CODE_LANGUAGES,
  CODE_LANGUAGE_GRAMMARS,
} from '../lib/codeHighlight'
import { Button } from './ui/Button'
import { FileInput } from './ui/FileInput'
import { Input } from './ui/Input'
import { SelectMenu } from './ui/SelectMenu'
import { cx } from './ui/utils'
import { useT } from '../lib/i18n'

const lowlight = createLowlight(CODE_LANGUAGE_GRAMMARS)

type FontSize = 'small' | 'normal' | 'large'
type FontFamily = 'default' | 'serif' | 'mono'
type HeadingStyle = 'paragraph' | 'h2' | 'h3'

type RichTextEditorProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onUploadMedia: (file: File) => Promise<string>
  /**
   * @deprecated No longer drives the "Uploading media..." status: that now
   * reflects only uploads started from this editor, so two editors on one
   * page (e.g. Preconditions + Description) don't both claim an upload that
   * belongs to just one of them. Callers may still use their own flag for
   * things like disabling a Save button.
   */
  isUploading?: boolean
  className?: string
  /** Tailwind min-height utility for the editable surface. Defaults to a
   * roomy 'min-h-36' for long-form content (docs); pass a smaller value
   * (e.g. 'min-h-20') for short fields like preconditions/description so
   * the form doesn't reserve space no one is using. */
  minHeightClassName?: string
}

type SelectionRange = {
  from: number
  to: number
}

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function firstMediaFile(files: FileList | null | undefined): File | null {
  if (!files) {
    return null
  }

  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      return file
    }
  }

  return null
}

function buildMediaHtml(url: string, file: File): string {
  const safeUrl = escapeAttribute(url)

  if (file.type.startsWith('video/')) {
    return `
      <video
        class="editor-media"
        src="${safeUrl}"
        data-media-url="${safeUrl}"
        playsinline
        muted
        preload="metadata"
        controls
      ></video>
      <p></p>
    `
  }

  return `
    <img
      class="editor-media"
      src="${safeUrl}"
      alt=""
      data-media-url="${safeUrl}"
    />
    <p></p>
  `
}

const fontSizeMap: Record<FontSize, string> = {
  small: '14px',
  normal: '16px',
  large: '20px',
}

// 'default' means "no inline font-family" so the surface keeps inheriting
// the app's own font instead of every doc pinning itself to a literal value.
const fontFamilyMap: Record<Exclude<FontFamily, 'default'>, string> = {
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'var(--font-mono)',
}

const MediaImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: 'editor-media',
      },
      'data-media-url': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-url'),
        renderHTML: (attributes) =>
          attributes['data-media-url']
            ? { 'data-media-url': attributes['data-media-url'] }
            : {},
      },
    }
  },
})

const MediaVideo = Node.create({
  name: 'mediaVideo',
  group: 'block',
  selectable: true,
  draggable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      class: {
        default: 'editor-media',
      },
      'data-media-url': {
        default: null,
      },
    }
  },

  parseHTML() {
    return [{ tag: 'video[src]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      { class: 'editor-media-frame', contenteditable: 'false' },
      [
        'video',
        mergeAttributes(HTMLAttributes, {
          playsinline: 'true',
          muted: 'true',
          preload: 'metadata',
          controls: 'true',
        }),
      ],
    ]
  },
})

function getCurrentFontSize(fontSize: string | null | undefined): FontSize {
  switch (fontSize) {
    case fontSizeMap.small:
      return 'small'
    case fontSizeMap.large:
      return 'large'
    default:
      return 'normal'
  }
}

function getCurrentFontFamily(fontFamily: string | null | undefined): FontFamily {
  switch (fontFamily) {
    case fontFamilyMap.serif:
      return 'serif'
    case fontFamilyMap.mono:
      return 'mono'
    default:
      return 'default'
  }
}

export function RichTextEditor({
  label,
  placeholder,
  value,
  onChange,
  onUploadMedia,
  className,
  minHeightClassName = 'min-h-36',
}: RichTextEditorProps) {
  const t = useT()

  const [pendingUploads, setPendingUploads] = useState(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const selectionRef = useRef<SelectionRange | null>(null)
  // ProseMirror's paste/drop handlers are created once with the editor, so
  // they reach the latest insertMedia through a ref.
  const insertMediaRef = useRef<(file: File) => Promise<void>>(async () => {})
  const editorRef = useRef<Editor | null>(null)
  const [isLinkEditorOpen, setIsLinkEditorOpen] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: {
          // Only real URLs auto-link. Without this, linkifyjs turns things
          // like `u.id` or `l.user_id` (valid TLDs) into links in pasted SQL.
          shouldAutoLink: (url) => /^(https?:\/\/|www\.|mailto:)/i.test(url),
        },
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: null }),
      TextStyle,
      TipTapFontSize,
      TipTapFontFamily,
      MediaImage,
      MediaVideo,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      // Handle pasted/dropped media inside ProseMirror itself. Doing it in a
      // React onPaste on the wrapper was too late: ProseMirror had already
      // inserted the clipboard's own <img>, and our upload inserted a second
      // copy (duplicated images on paste).
      handlePaste: (_view, event) => {
        const file = firstMediaFile(event.clipboardData?.files)

        if (file) {
          event.preventDefault()
          void insertMediaRef.current(file).catch((error) => {
            console.error('RichTextEditor paste insertMedia failed', error)
          })
          return true
        }

        // Smart paste: JSON / SQL / code from the clipboard becomes a code
        // block (minified JSON is pretty-printed). Undo restores plain paste.
        const currentEditor = editorRef.current

        if (!currentEditor || currentEditor.isActive('codeBlock')) {
          return false
        }

        const pasted = analyzePastedText(
          event.clipboardData?.getData('text/plain') ?? '',
        )

        if (!pasted) {
          return false
        }

        event.preventDefault()
        currentEditor
          .chain()
          .focus()
          .insertContent({
            type: 'codeBlock',
            attrs: { language: pasted.language },
            content: [{ type: 'text', text: pasted.text }],
          })
          .run()
        return true
      },
      handleDrop: (_view, event) => {
        const file = firstMediaFile(event.dataTransfer?.files)

        if (!file) {
          return false
        }

        event.preventDefault()
        void insertMediaRef.current(file).catch((error) => {
          console.error('RichTextEditor drop insertMedia failed', error)
        })
        return true
      },
      attributes: {
        class: cx(
          'editor-surface rounded-xl border border-[var(--tms-border)] bg-[var(--tms-surface)] px-4 py-3 text-base outline-none transition focus-within:border-[var(--tms-primary)]',
          minHeightClassName,
        ),
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML())
    },
    onSelectionUpdate: ({ editor: nextEditor }) => {
      selectionRef.current = {
        from: nextEditor.state.selection.from,
        to: nextEditor.state.selection.to,
      }
    },
  })

  editorRef.current = editor

  useEffect(() => {
    if (!editor) {
      return
    }

    const currentHtml = editor.getHTML()

    if (value !== currentHtml) {
      editor.commands.setContent(value || '', { emitUpdate: false })
    }
  }, [editor, value])

  const currentFontSize = getCurrentFontSize(
    editor?.getAttributes('textStyle').fontSize as string | null | undefined,
  )
  const currentFontFamily = getCurrentFontFamily(
    editor?.getAttributes('textStyle').fontFamily as string | null | undefined,
  )
  const currentHeadingStyle: HeadingStyle = editor?.isActive('heading', { level: 2 })
    ? 'h2'
    : editor?.isActive('heading', { level: 3 })
      ? 'h3'
      : 'paragraph'

  const isCodeBlockActive = editor?.isActive('codeBlock') ?? false
  const currentCodeLanguage =
    (editor?.getAttributes('codeBlock').language as string | null | undefined) ??
    'plain'

  function setCodeLanguage(language: string): void {
    editor
      ?.chain()
      .focus()
      .updateAttributes('codeBlock', { language: language === 'plain' ? null : language })
      .run()
  }

  function formatJsonBlock(): void {
    editor
      ?.chain()
      .focus()
      .command(({ state, tr }) => {
        const { $from } = state.selection

        if ($from.parent.type.name !== 'codeBlock') {
          return false
        }

        try {
          const formatted = JSON.stringify(JSON.parse($from.parent.textContent), null, 2)
          tr.insertText(formatted, $from.start(), $from.end())
          return true
        } catch {
          return false
        }
      })
      .run()
  }

  function setHeadingStyle(style: HeadingStyle): void {
    if (style === 'paragraph') {
      editor?.chain().focus().setParagraph().run()
      return
    }

    editor?.chain().focus().setHeading({ level: style === 'h2' ? 2 : 3 }).run()
  }

  function openLinkEditor(): void {
    const existingHref = editor?.getAttributes('link').href as string | undefined
    setLinkDraft(existingHref ?? '')
    setIsLinkEditorOpen(true)
  }

  function applyLink(): void {
    const url = linkDraft.trim()

    if (!url) {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }

    setIsLinkEditorOpen(false)
    setLinkDraft('')
  }

  function removeLink(): void {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    setIsLinkEditorOpen(false)
    setLinkDraft('')
  }

  async function insertMedia(file: File): Promise<void> {
    if (!editor) {
      return
    }

    setPendingUploads((count) => count + 1)
    let url: string

    try {
      url = await onUploadMedia(file)
    } finally {
      setPendingUploads((count) => count - 1)
    }

    const selection = selectionRef.current
    const chain = editor.chain().focus()

    if (selection) {
      chain.setTextSelection(selection)
    }

    const inserted = chain.insertContent(buildMediaHtml(url, file)).run()

    if (!inserted) {
      throw new Error('Failed to insert uploaded media into the editor.')
    }
  }

  insertMediaRef.current = insertMedia

  async function handleFiles(files: FileList | null): Promise<void> {
    const file = files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return
    }

    try {
      await insertMedia(file)
    } catch (error) {
      console.error('RichTextEditor insertMedia failed', error)
      return
    }
  }

  function openMediaFromTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false
    }

    const mediaElement = target.closest<HTMLElement>('[data-media-url]')
    const url = mediaElement?.dataset.mediaUrl

    if (!url) {
      return false
    }

    window.open(url, '_blank', 'noopener,noreferrer')
    return true
  }

  return (
    <div className={cx('editing-rich-editor', className)}>
      <div className="editing-field-group__label">{label}</div>
      <div
        className="editor-shell"
        onClick={(event) => {
          if (editor) {
            selectionRef.current = {
              from: editor.state.selection.from,
              to: editor.state.selection.to,
            }
          }
          if (openMediaFromTarget(event.target)) {
            event.preventDefault()
          }
        }}
      >
        <div className="editor-toolbar" role="toolbar" aria-label={t('{label} formatting', { label })}>
          <div className="editor-tool-group">
            <label className="editor-select-label">
              <HeadingIcon size={15} strokeWidth={2.1} />
              <SelectMenu
                value={currentHeadingStyle}
                onValueChange={(value) => setHeadingStyle(value as HeadingStyle)}
                options={[
                  { value: 'paragraph', label: t('Text') },
                  { value: 'h2', label: t('Heading') },
                  { value: 'h3', label: t('Subheading') },
                ]}
                className="editor-tool-select editor-tool-select--wide"
                aria-label={t('Paragraph style')}
              />
            </label>
          </div>

          <div className="editor-tool-group">
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('bold') ? 'is-active' : ''}`}
              aria-label={t('Bold')}
              aria-pressed={editor?.isActive('bold') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={16} strokeWidth={2.2} />
            </Button>
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('italic') ? 'is-active' : ''}`}
              aria-label={t('Italic')}
              aria-pressed={editor?.isActive('italic') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={16} strokeWidth={2.2} />
            </Button>
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('underline') ? 'is-active' : ''}`}
              aria-label={t('Underline')}
              aria-pressed={editor?.isActive('underline') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={16} strokeWidth={2.2} />
            </Button>
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('code') ? 'is-active' : ''}`}
              aria-label={t('Inline code')}
              aria-pressed={editor?.isActive('code') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleCode().run()}
            >
              <CodeIcon size={16} strokeWidth={2.2} />
            </Button>
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('link') ? 'is-active' : ''}`}
              aria-label={t('Link')}
              aria-pressed={editor?.isActive('link') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={openLinkEditor}
            >
              <LinkIcon size={16} strokeWidth={2.2} />
            </Button>
          </div>

          <div className="editor-tool-group">
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
              aria-label={t('Bullet list')}
              aria-pressed={editor?.isActive('bulletList') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List size={16} strokeWidth={2.2} />
            </Button>
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('orderedList') ? 'is-active' : ''}`}
              aria-label={t('Numbered list')}
              aria-pressed={editor?.isActive('orderedList') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={16} strokeWidth={2.2} />
            </Button>
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('codeBlock') ? 'is-active' : ''}`}
              aria-label={t('Code block')}
              aria-pressed={editor?.isActive('codeBlock') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <CodeBlockIcon size={16} strokeWidth={2.2} />
            </Button>
          </div>

          {isCodeBlockActive ? (
            <div className="editor-tool-group">
              <label className="editor-select-label">
                <CodeBlockIcon size={15} strokeWidth={2.1} />
                <SelectMenu
                  value={currentCodeLanguage}
                  onValueChange={setCodeLanguage}
                  options={CODE_LANGUAGES}
                  className="editor-tool-select editor-tool-select--wide"
                  aria-label={t('Code language')}
                />
              </label>
              {currentCodeLanguage === 'json' ? (
                <Button
                  type="button"
                  size="sm"
                  className="editor-tool-icon-button"
                  aria-label={t('Format JSON')}
                  title={t('Format JSON')}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={formatJsonBlock}
                >
                  <Wand2 size={16} strokeWidth={2.2} />
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="editor-tool-group editor-tool-group--fonts">
            <label className="editor-select-label">
              <CaseSensitive size={16} strokeWidth={2.1} />
              <SelectMenu
                value={currentFontFamily}
                onValueChange={(value) => {
                  const family = value as FontFamily

                  if (family === 'default') {
                    editor?.chain().focus().unsetFontFamily().run()
                  } else {
                    editor?.chain().focus().setFontFamily(fontFamilyMap[family]).run()
                  }
                }}
                options={[
                  { value: 'default', label: t('Default font') },
                  { value: 'serif', label: t('Serif') },
                  { value: 'mono', label: t('Monospace') },
                ]}
                className="editor-tool-select editor-tool-select--wide"
                aria-label={t('Font family')}
              />
            </label>
            <label className="editor-select-label">
              <Type size={15} strokeWidth={2.1} />
              <SelectMenu
                value={currentFontSize}
                onValueChange={(value) => {
                  const size = value as FontSize
                  editor?.chain().focus().setFontSize(fontSizeMap[size]).run()
                }}
                options={[
                  { value: 'small', label: t('Small') },
                  { value: 'normal', label: t('Normal') },
                  { value: 'large', label: t('Large') },
                ]}
                className="editor-tool-select"
                aria-label={t('Text size')}
              />
            </label>
          </div>

          <Button
            type="button"
            size="sm"
            className="editor-media-button"
            onMouseDown={(event) => {
              event.preventDefault()
              if (editor) {
                selectionRef.current = {
                  from: editor.state.selection.from,
                  to: editor.state.selection.to,
                }
              }
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} strokeWidth={2.2} />{t('Add media')}</Button>

          <div className="editor-tool-note">{t('Click media to open the original file.')}</div>
        </div>

        {isLinkEditorOpen ? (
          <div className="editor-link-editor">
            <Input
              type="url"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  applyLink()
                }

                if (event.key === 'Escape') {
                  event.preventDefault()
                  setIsLinkEditorOpen(false)
                }
              }}
              placeholder={t('https://…')}
              size="sm"
              autoFocus
            />
            <Button type="button" size="sm" variant="primary" onClick={applyLink}>{t('Apply')}</Button>
            {editor?.isActive('link') ? (
              <Button type="button" size="sm" variant="secondary" onClick={removeLink}>{t('Remove link')}</Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setIsLinkEditorOpen(false)}
            >{t('Cancel')}</Button>
          </div>
        ) : null}

        <div
          className={cx(
            'editor-status-row',
            pendingUploads > 0 && 'is-uploading',
          )}
        >
          {pendingUploads > 0
            ? t('Uploading media...')
            : t('Images, GIFs, and videos become inline previews.')}
        </div>

        <EditorContent editor={editor} />
      </div>

      <FileInput
        ref={fileInputRef}
        accept="image/*,video/*"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

    </div>
  )
}
