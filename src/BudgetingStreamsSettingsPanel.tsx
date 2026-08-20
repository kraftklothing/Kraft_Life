import type { BudgetingStream } from './types'

interface BudgetingStreamsSettingsPanelProps {
  streams: BudgetingStream[]
  newName: string
  onNewNameChange: (value: string) => void
  editingId: string | null
  draggingId: string | null
  onStartEdit: (id: string) => void
  onFinishEdit: (id: string, name: string) => void
  onCancelEdit: () => void
  onLiveRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onBeginDrag: (id: string, clientY: number) => void
}

export default function BudgetingStreamsSettingsPanel({
  streams,
  newName,
  onNewNameChange,
  editingId,
  draggingId,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onLiveRename,
  onDelete,
  onAdd,
  onBeginDrag,
}: BudgetingStreamsSettingsPanelProps) {
  return (
    <>
      <p className="muted reorder-hint view-hint">
        Drag the bars to reorder Budgeting streams. Tap the pencil to edit —
        delete shows while editing. These are separate from task categories.
      </p>
      <ul className="task-list category-settings-list">
        {streams.map((stream) => {
          const editing = editingId === stream.id
          return (
            <li
              key={stream.id}
              className={`category-settings-row${
                draggingId === stream.id ? ' dragging' : ''
              }`}
            >
              <button
                type="button"
                className="drag-handle"
                aria-label={`Reorder ${stream.name}`}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture?.(event.pointerId)
                  onBeginDrag(stream.id, event.clientY)
                }}
              >
                <BarsIcon />
              </button>
              {editing ? (
                <input
                  className="category-name-input category-settings-name-input"
                  value={stream.name}
                  aria-label="Budgeting stream name"
                  autoFocus
                  onChange={(e) => onLiveRename(stream.id, e.target.value)}
                  onBlur={(e) => onFinishEdit(stream.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onFinishEdit(stream.id, (e.target as HTMLInputElement).value)
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      onCancelEdit()
                    }
                  }}
                />
              ) : (
                <span className="category-settings-name">
                  {stream.name.trim() || 'Untitled'}
                </span>
              )}
              <div className="category-settings-actions">
                {editing ? (
                  <button
                    type="button"
                    className="delete-btn"
                    aria-label={`Delete ${stream.name}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onDelete(stream.id)}
                  >
                    <TrashIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="edit-btn"
                    aria-label={`Edit ${stream.name}`}
                    onClick={() => onStartEdit(stream.id)}
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <div className="add-inline-panel">
        <div className="inline-add">
          <input
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="New budgeting stream"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onAdd()
              }
            }}
          />
          <button type="button" className="btn btn-primary" onClick={onAdd}>
            Add
          </button>
        </div>
      </div>
    </>
  )
}

function BarsIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
      <rect x="0" y="0" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="5.75" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="11.5" width="18" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a1.5 1.5 0 0 0 0-2.12L16.62 5.5a1.5 1.5 0 0 0-2.12 0L4 16v4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="m13.5 6.5 4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}
