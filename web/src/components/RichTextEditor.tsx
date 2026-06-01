import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { FontSize as TipTapFontSize, TextStyle } from '@tiptap/extension-text-style'
import { mergeAttributes, Node } from '@tiptap/core'
import { useEffect, useRef } from 'react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Type,
  Underline as UnderlineIcon,
  Upload,
} from 'lucide-react'
import { Button } from './ui/Button'
import { FileInput } from './ui/FileInput'
import { SelectMenu } from './ui/SelectMenu'
import { cx } from './ui/utils'

type FontSize = 'small' | 'normal' | 'large'

type RichTextEditorProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onUploadMedia: (file: File) => Promise<string>
  isUploading?: boolean
  className?: string
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

export function RichTextEditor({
  label,
  placeholder,
  value,
  onChange,
  onUploadMedia,
  isUploading = false,
  className,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const selectionRef = useRef<SelectionRange | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      TipTapFontSize,
      MediaImage,
      MediaVideo,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          'editor-surface min-h-36 rounded-xl border border-[var(--tms-border)] bg-[var(--tms-surface)] px-4 py-3 text-base outline-none transition focus-within:border-[var(--tms-primary)]',
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

  async function insertMedia(file: File): Promise<void> {
    if (!editor) {
      return
    }

    const url = await onUploadMedia(file)
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

  async function handlePaste(
    event: React.ClipboardEvent<HTMLDivElement>,
  ): Promise<void> {
    const items = event.clipboardData.items

    for (const item of items) {
      if (item.type.startsWith('image/') || item.type.startsWith('video/')) {
        event.preventDefault()
        const file = item.getAsFile()

        if (file) {
          try {
            await insertMedia(file)
          } catch (error) {
            console.error('RichTextEditor paste insertMedia failed', error)
            return
          }
        }

        return
      }
    }
  }

  async function handleDrop(
    event: React.DragEvent<HTMLDivElement>,
  ): Promise<void> {
    event.preventDefault()
    await handleFiles(event.dataTransfer.files)
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
        onPaste={(event) => void handlePaste(event)}
        onDrop={(event) => void handleDrop(event)}
        onDragOver={(event) => event.preventDefault()}
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
        <div className="editor-toolbar" role="toolbar" aria-label={`${label} formatting`}>
          <div className="editor-tool-group">
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('bold') ? 'is-active' : ''}`}
              aria-label="Bold"
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
              aria-label="Italic"
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
              aria-label="Underline"
              aria-pressed={editor?.isActive('underline') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={16} strokeWidth={2.2} />
            </Button>
          </div>

          <div className="editor-tool-group">
            <Button
              type="button"
              size="sm"
              className={`editor-tool-icon-button ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
              aria-label="Bullet list"
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
              aria-label="Numbered list"
              aria-pressed={editor?.isActive('orderedList') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={16} strokeWidth={2.2} />
            </Button>
          </div>

          <div className="editor-tool-group">
            <label className="editor-select-label">
              <Type size={15} strokeWidth={2.1} />
              <SelectMenu
                value={currentFontSize}
                onValueChange={(value) => {
                  const size = value as FontSize
                  editor?.chain().focus().setFontSize(fontSizeMap[size]).run()
                }}
                options={[
                  { value: 'small', label: 'Small' },
                  { value: 'normal', label: 'Normal' },
                  { value: 'large', label: 'Large' },
                ]}
                className="editor-tool-select"
                aria-label="Text size"
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
            <Upload size={15} strokeWidth={2.2} />
            Add media
          </Button>

          <div className="editor-tool-note">
            Click media to open the original file.
          </div>
        </div>

        <div className="editor-status-row">
          {isUploading
            ? 'Uploading media...'
            : 'Images, GIFs, and videos become inline previews.'}
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
