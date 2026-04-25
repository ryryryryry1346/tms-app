import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
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

type FontSize = 'small' | 'normal' | 'large'

type RichTextEditorProps = {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  onUploadMedia: (file: File) => Promise<string>
  isUploading?: boolean
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
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
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
          'editor-surface min-h-36 rounded-xl border border-[var(--line)] bg-white/85 px-4 py-3 text-base outline-none transition focus-within:border-[var(--lagoon-deep)]',
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) {
      return
    }

    const currentHtml = editor.getHTML()

    if (value !== currentHtml) {
      editor.commands.setContent(value || '', false)
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

    if (file.type.startsWith('video/')) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mediaVideo',
          attrs: {
            src: url,
            class: 'editor-media',
            'data-media-url': url,
          },
        })
        .insertContent({ type: 'paragraph' })
        .run()
      return
    }

    editor
      .chain()
      .focus()
      .setImage({
        src: url,
        alt: '',
        class: 'editor-media',
        'data-media-url': url,
      })
      .insertContent({ type: 'paragraph' })
      .run()
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
    } catch {
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
          } catch {
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
    <label className="grid gap-2 text-sm font-semibold text-[var(--sea-ink)]">
      {label}
      <div className="editor-shell">
        <div className="editor-toolbar" role="toolbar" aria-label={`${label} formatting`}>
          <div className="editor-tool-group">
            <button
              type="button"
              className={`editor-tool-icon-button ${editor?.isActive('bold') ? 'is-active' : ''}`}
              aria-label="Bold"
              aria-pressed={editor?.isActive('bold') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={16} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className={`editor-tool-icon-button ${editor?.isActive('italic') ? 'is-active' : ''}`}
              aria-label="Italic"
              aria-pressed={editor?.isActive('italic') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={16} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className={`editor-tool-icon-button ${editor?.isActive('underline') ? 'is-active' : ''}`}
              aria-label="Underline"
              aria-pressed={editor?.isActive('underline') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={16} strokeWidth={2.2} />
            </button>
          </div>

          <div className="editor-tool-group">
            <button
              type="button"
              className={`editor-tool-icon-button ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
              aria-label="Bullet list"
              aria-pressed={editor?.isActive('bulletList') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List size={16} strokeWidth={2.2} />
            </button>
            <button
              type="button"
              className={`editor-tool-icon-button ${editor?.isActive('orderedList') ? 'is-active' : ''}`}
              aria-label="Numbered list"
              aria-pressed={editor?.isActive('orderedList') ?? false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={16} strokeWidth={2.2} />
            </button>
          </div>

          <div className="editor-tool-group">
            <label className="editor-select-label">
              <Type size={15} strokeWidth={2.1} />
              <select
                value={currentFontSize}
                onChange={(event) => {
                  const size = event.target.value as FontSize
                  editor?.chain().focus().setFontSize(fontSizeMap[size]).run()
                }}
                className="editor-tool-select"
              >
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            className="editor-media-button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={15} strokeWidth={2.2} />
            Add media
          </button>

          <div className="editor-tool-note">
            Click media to open the original file.
          </div>
        </div>

        <div className="editor-status-row">
          {isUploading
            ? 'Uploading media...'
            : 'Images, GIFs, and videos become inline previews.'}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          void handleFiles(event.target.files)
          event.target.value = ''
        }}
      />

      <div
        onPaste={(event) => void handlePaste(event)}
        onDrop={(event) => void handleDrop(event)}
        onDragOver={(event) => event.preventDefault()}
        onClick={(event) => {
          if (openMediaFromTarget(event.target)) {
            event.preventDefault()
          }
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </label>
  )
}
