import { ModeIcon, MODE_ICON_OPTIONS } from './modeIcons'
import type { Mode, ModeIconId } from './types'

interface ModeSettingsPanelProps {
  modes: Mode[]
  newName: string
  newIcon: ModeIconId
  onNewNameChange: (value: string) => void
  onNewIconChange: (icon: ModeIconId) => void
  editingId: string | null
  draggingId: string | null
  onStartEdit: (id: string) => void
  onFinishEdit: (id: string, name: string) => void
  onCancelEdit: () => void
  onLiveRename: (id: string, name: string) => void
  onChangeIcon: (id: string, icon: ModeIconId) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onBeginDrag: (id: string, clientY: number) => void
}

export default function ModeSettingsPanel({
  modes,
  newName,
  newIcon,
  onNewNameChange,
  onNewIconChange,
  editingId,
  draggingId,
  onStartEdit,
  onFinishEdit,
  onCancelEdit,
  onLiveRename,
  onChangeIcon,
  onDelete,
  onAdd,
  onBeginDrag,
}: ModeSettingsPanelProps) {
  return (
    <>
      <p className="muted reorder-hint view-hint">
        Drag to reorder. Tap the pencil to rename or pick an icon — delete shows
        while editing. Vacation stays on the day view and is not listed here.
        Starter modes can be removed or replaced anytime.
      </p>
      <ul className="task-list category-settings-list mode-settings-list">
        {modes.map((mode) => {
          const editing = editingId === mode.id
          return (
            <li
              key={mode.id}
              className={`category-settings-row mode-settings-row${
                draggingId === mode.id ? ' dragging' : ''
              }`}
            >
              <button
                type="button"
                className="drag-handle"
                aria-label={`Reorder ${mode.name}`}
                onPointerDown={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  event.currentTarget.setPointerCapture?.(event.pointerId)
                  onBeginDrag(mode.id, event.clientY)
                }}
              >
                <BarsIcon />
              </button>
              <span className="mode-settings-icon" aria-hidden="true">
                <ModeIcon icon={mode.icon} size={18} />
              </span>
              {editing ? (
                <input
                  className="category-name-input category-settings-name-input"
                  value={mode.name}
                  aria-label="Mode name"
                  autoFocus
                  onChange={(e) => onLiveRename(mode.id, e.target.value)}
                  onBlur={(e) => onFinishEdit(mode.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onFinishEdit(mode.id, (e.target as HTMLInputElement).value)
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault()
                      onCancelEdit()
                    }
                  }}
                />
              ) : (
                <span className="category-settings-name">
                  {mode.name.trim() || 'Untitled'}
                </span>
              )}
              <div className="category-settings-actions">
                {editing ? (
                  <button
                    type="button"
                    className="delete-btn"
                    aria-label={`Delete ${mode.name}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onDelete(mode.id)}
                  >
                    <TrashIcon />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="edit-btn"
                    aria-label={`Edit ${mode.name}`}
                    onClick={() => onStartEdit(mode.id)}
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
              {editing ? (
                <div className="mode-edit-extras">
                  <div
                    className="mode-icon-picker"
                    role="group"
                    aria-label="Mode icon"
                  >
                    {MODE_ICON_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`mode-icon-option${
                          mode.icon === option.id ? ' selected' : ''
                        }`}
                        aria-label={option.label}
                        aria-pressed={mode.icon === option.id}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => onChangeIcon(mode.id, option.id)}
                      >
                        <ModeIcon icon={option.id} size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <div className="add-inline-panel mode-add-panel">
        <div
          className="mode-icon-picker mode-icon-picker-add"
          role="group"
          aria-label="New mode icon"
        >
          {MODE_ICON_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`mode-icon-option${
                newIcon === option.id ? ' selected' : ''
              }`}
              aria-label={option.label}
              aria-pressed={newIcon === option.id}
              onClick={() => onNewIconChange(option.id)}
            >
              <ModeIcon icon={option.id} size={16} />
            </button>
          ))}
        </div>
        <div className="inline-add">
          <input
            value={newName}
            onChange={(e) => onNewNameChange(e.target.value)}
            placeholder="New mode"
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
