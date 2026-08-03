import type { Category } from './types'

interface CategorySettingsPanelProps {
  categories: Category[]
  newName: string
  onNewNameChange: (value: string) => void
  editingId: string | null
  draggingId: string | null
  onStartEdit: (id: string) => void
  onFinishEdit: (id: string, name: string) => void
  onCancelEdit: () => void
  onLiveRename: (id: string, name: string) => void
  onToggleAttention: (id: string) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onBeginDrag: (id: string, clientY: number) => void
}

export default function CategorySettingsPanel({
  categories,
  newName,
  onNewNameChange,
  editingId,
  draggingId,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onLiveRename,
  onToggleAttention,
  onDelete,
  onAdd,
  onBeginDrag,
}: CategorySettingsPanelProps) {
  return (
    <>
      <p className="muted reorder-hint view-hint">
        Drag the bars to reorder. Tap the pencil to edit — delete shows while
        editing. Tap the highlight to make a category stand out on the day view.
      </p>
      <ul className="task-list category-settings-list">
        {categories.map((cat) => {
          const editing = editingId === cat.id
          const attention = cat.attention === true
          return (
            <li
              key={cat.id}
              className={`category-settings-row${
                draggingId === cat.id ? ' dragging' : ''
              }${attention ? ' attention' : ''}`}
            >
              <button
                type="button"
                className="drag-handle"
                aria-label={`Reorder ${cat.name}`}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture?.(event.pointerId)
                  onBeginDrag(cat.id, event.clientY)
                }}
              >
                <BarsIcon />
              </button>
              {editing ? (
                <input
                  className="category-name-input category-settings-name-input"
                  value={cat.name}
                  aria-label="Category name"
                  autoFocus
                  onChange={(e) => onLiveRename(cat.id, e.target.value)}
                  onBlur={(e) => onFinishEdit(cat.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onFinishEdit(cat.id, (e.target as HTMLInputElement).value)
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      onCancelEdit()
                    }
                  }}
                />
              ) : (
                <span
                  className={`category-settings-name${
                    attention ? ' attention' : ''
                  }`}
                >
                  {cat.name.trim() || 'Untitled'}
                </span>
              )}
              <div className="category-settings-actions">
                <button
                  type="button"
                  className={`attention-btn${attention ? ' active' : ''}`}
                  aria-label={
                    attention
                      ? `Turn off highlight for ${cat.name}`
                      : `Highlight ${cat.name}`
                  }
                  aria-pressed={attention}
                  onClick={() => onToggleAttention(cat.id)}
                >
                  <AttentionIcon filled={attention} />
                </button>
                {editing ? (
                  <button
                    type="button"
                    className="delete-btn"
                    aria-label={`Delete ${cat.name}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onDelete(cat.id)}
                  >
                    <TrashIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="edit-btn"
                    aria-label={`Edit ${cat.name}`}
                    onClick={() => onStartEdit(cat.id)}
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
            placeholder="New category"
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

function AttentionIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.2 14.4 9l6.1.5-4.7 3.9 1.5 5.9L12 16.7 6.7 19.3l1.5-5.9-4.7-3.9L9.6 9 12 3.2Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
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
