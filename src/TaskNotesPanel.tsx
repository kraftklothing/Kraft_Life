import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'

interface TaskNotesPanelProps {
  title: string
  description: string
  onDescriptionChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

const BULLET_PREFIX = '- '

/** Split description into plain lines and bullet items for display. */
export function descriptionBlocks(
  text: string,
): { type: 'text' | 'bullet'; text: string }[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: { type: 'text' | 'bullet'; text: string }[] = []
  for (const line of lines) {
    const match = line.match(/^\s*[-•*]\s+(.*)$/)
    if (match) {
      blocks.push({ type: 'bullet', text: match[1] ?? '' })
    } else if (line.length > 0 || blocks.length > 0) {
      blocks.push({ type: 'text', text: line })
    }
  }
  while (
    blocks.length > 0 &&
    blocks[blocks.length - 1]?.type === 'text' &&
    blocks[blocks.length - 1]?.text === ''
  ) {
    blocks.pop()
  }
  return blocks
}

export function TaskDescriptionPreview({ text }: { text: string }) {
  const trimmed = text.trim()
  if (!trimmed) return null
  const blocks = descriptionBlocks(trimmed)
  const hasBullets = blocks.some((b) => b.type === 'bullet')
  if (!hasBullets) {
    return <p className="task-description-preview">{trimmed}</p>
  }

  const nodes: ReactNode[] = []
  let bulletBuf: string[] = []
  const flushBullets = (key: string) => {
    if (bulletBuf.length === 0) return
    nodes.push(
      <ul className="task-description-bullets" key={key}>
        {bulletBuf.map((item, index) => (
          <li key={`${key}-${index}`}>{item}</li>
        ))}
      </ul>,
    )
    bulletBuf = []
  }

  blocks.forEach((block, index) => {
    if (block.type === 'bullet') {
      bulletBuf.push(block.text)
      return
    }
    flushBullets(`b-${index}`)
    if (block.text) {
      nodes.push(
        <p className="task-description-preview" key={`t-${index}`}>
          {block.text}
        </p>,
      )
    }
  })
  flushBullets('b-end')
  return <div className="task-description-preview-wrap">{nodes}</div>
}

export default function TaskNotesPanel({
  title,
  description,
  onDescriptionChange,
  onClose,
  onSave,
}: TaskNotesPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const id = window.setTimeout(() => textareaRef.current?.focus(), 60)
    return () => window.clearTimeout(id)
  }, [])

  function setDescriptionWithCursor(next: string, cursor: number) {
    onDescriptionChange(next)
    window.requestAnimationFrame(() => {
      const el = textareaRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  function insertBullet() {
    const el = textareaRef.current
    const value = description
    if (!el) {
      const next =
        value.trim().length === 0
          ? BULLET_PREFIX
          : `${value.replace(/\s*$/, '')}\n${BULLET_PREFIX}`
      onDescriptionChange(next)
      return
    }

    const start = el.selectionStart
    const end = el.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const line = value.slice(lineStart, start)
    const alreadyBullet = /^\s*[-•*]\s+/.test(line)

    if (alreadyBullet) {
      const insert = `\n${BULLET_PREFIX}`
      const next = `${value.slice(0, start)}${insert}${value.slice(end)}`
      setDescriptionWithCursor(next, start + insert.length)
      return
    }

    if (line.length === 0) {
      const next = `${value.slice(0, lineStart)}${BULLET_PREFIX}${value.slice(end)}`
      setDescriptionWithCursor(next, lineStart + BULLET_PREFIX.length)
      return
    }

    const next = `${value.slice(0, lineStart)}${BULLET_PREFIX}${value.slice(lineStart, end)}${value.slice(end)}`
    setDescriptionWithCursor(next, lineStart + BULLET_PREFIX.length)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return
    const el = event.currentTarget
    const start = el.selectionStart
    const end = el.selectionEnd
    if (start !== end) return

    const value = description
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const line = value.slice(lineStart, start)
    const match = line.match(/^(\s*)([-•*]\s+)/)
    if (!match) return

    const indent = match[1] ?? ''
    const marker = match[2] ?? BULLET_PREFIX
    const content = line.slice(match[0].length)
    event.preventDefault()

    if (content.trim().length === 0) {
      const next = `${value.slice(0, lineStart)}${value.slice(start)}`
      setDescriptionWithCursor(next, lineStart)
      return
    }

    const insert = `\n${indent}${marker}`
    const next = `${value.slice(0, start)}${insert}${value.slice(end)}`
    setDescriptionWithCursor(next, start + insert.length)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="panel modal-card task-notes-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-notes-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="task-notes-title">{title}</h2>
        <p className="muted task-notes-hint">
          Add a description. Start a line with - for a bullet; Enter continues
          the list.
        </p>
        <label className="task-notes-label" htmlFor="task-notes-input">
          Description
          <textarea
            id="task-notes-input"
            ref={textareaRef}
            className="task-notes-input"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={'Notes for this task\n- First bullet\n- Second bullet'}
            rows={8}
          />
        </label>
        <div className="task-notes-toolbar">
          <button type="button" className="btn" onClick={insertBullet}>
            Add bullet
          </button>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onSave}>
            Done
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
