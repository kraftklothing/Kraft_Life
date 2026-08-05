import { useMemo, useState } from 'react'
import { addDays, parseDateKey, toDateKey } from './dates'

interface DayPickerSheetProps {
  selectedKey: string
  todayKey: string
  onSelect: (dateKey: string) => void
  onClose: () => void
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export default function DayPickerSheet({
  selectedKey,
  todayKey,
  onSelect,
  onClose,
}: DayPickerSheetProps) {
  const selected = parseDateKey(selectedKey)
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(selected))

  const cells = useMemo(() => {
    const first = startOfMonth(monthCursor)
    const startOffset = first.getDay()
    const gridStart = addDays(first, -startOffset)
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index)
      const key = toDateKey(date)
      return {
        key,
        day: date.getDate(),
        inMonth: date.getMonth() === monthCursor.getMonth(),
        isToday: key === todayKey,
        isSelected: key === selectedKey,
      }
    })
  }, [monthCursor, selectedKey, todayKey])

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="panel modal-card day-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="day-picker-sheet-header">
          <h2 id="day-picker-title">Pick a day</h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close day picker"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="day-picker-month-nav">
          <button
            type="button"
            className="day-picker-nav-btn"
            aria-label="Previous month"
            onClick={() => setMonthCursor((m) => addMonths(m, -1))}
          >
            ‹
          </button>
          <p className="day-picker-month-label">{formatMonthLabel(monthCursor)}</p>
          <button
            type="button"
            className="day-picker-nav-btn"
            aria-label="Next month"
            onClick={() => setMonthCursor((m) => addMonths(m, 1))}
          >
            ›
          </button>
        </div>

        <div className="day-picker-weekdays" aria-hidden="true">
          {WEEKDAYS.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="day-picker-grid" role="grid" aria-label="Calendar">
          {cells.map((cell) => (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              className={`day-picker-day${cell.inMonth ? '' : ' outside'}${
                cell.isToday ? ' today' : ''
              }${cell.isSelected ? ' selected' : ''}`}
              aria-label={cell.key}
              aria-current={cell.isToday ? 'date' : undefined}
              aria-pressed={cell.isSelected}
              onClick={() => onSelect(cell.key)}
            >
              {cell.day}
            </button>
          ))}
        </div>

        <div className="day-picker-sheet-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onSelect(todayKey)}
          >
            Today
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
