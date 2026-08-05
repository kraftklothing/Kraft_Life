import { useState, type ChangeEvent, type FormEvent } from 'react'
import SettingsSection from './SettingsSection'
import { fetchCalendarEvents } from './calendarApi'
import {
  addConnectedCalendar,
  getConnectedCalendars,
  removeConnectedCalendar,
  type ConnectedCalendar,
} from './calendarSession'

interface CalendarSettingsProps {
  onConnectionChange: () => void
}

function todayDateKey(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

export default function CalendarSettings({ onConnectionChange }: CalendarSettingsProps) {
  const [calendars, setCalendars] = useState<ConnectedCalendar[]>(() =>
    getConnectedCalendars(),
  )
  const [name, setName] = useState('')
  const [icsUrl, setIcsUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function refreshList() {
    setCalendars(getConnectedCalendars())
    onConnectionChange()
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    const trimmedUrl = icsUrl.trim()
    const trimmedName = name.trim()
    if (!trimmedUrl) {
      setError('Paste a Google Calendar secret iCal link first.')
      return
    }

    setBusy(true)
    try {
      const nextCalendars = [...getConnectedCalendars()]
      if (nextCalendars.some((calendar) => calendar.icsUrl === trimmedUrl)) {
        throw new Error('That calendar link is already connected.')
      }

      const testUrls = [...nextCalendars.map((calendar) => calendar.icsUrl), trimmedUrl]
      const events = await fetchCalendarEvents(testUrls, todayDateKey())
      addConnectedCalendar(trimmedName || 'Calendar', trimmedUrl)
      refreshList()
      setName('')
      setIcsUrl('')
      setMessage(
        events.length === 0
          ? 'Calendar added. No events today — swipe to another day to check.'
          : `Calendar added. Found ${events.length} event${events.length === 1 ? '' : 's'} today across your calendars.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect calendar.')
    } finally {
      setBusy(false)
    }
  }

  function handleRemove(id: string) {
    removeConnectedCalendar(id)
    refreshList()
    setMessage('')
    setError('')
  }

  return (
    <SettingsSection title="Calendar" ariaLabel="Calendar" className="calendar-settings">
      <p className="muted view-hint">
        Connect one or more Google calendars using their secret iCal links. Events
        show at the top of each day under <strong>Calendar</strong> in Mountain
        Time, like <strong>1:00–2:00pm</strong> or <strong>All day</strong>.
      </p>

      {calendars.length > 0 ? (
        <ul className="calendar-connected-list">
          {calendars.map((calendar) => (
            <li key={calendar.id} className="calendar-connected-item">
              <div className="calendar-connected-copy">
                <strong>{calendar.name}</strong>
                <span className="calendar-connected-url">Connected</span>
              </div>
              <button
                type="button"
                className="danger-btn"
                disabled={busy}
                onClick={() => handleRemove(calendar.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted view-hint">No calendars connected yet.</p>
      )}

      <form className="calendar-settings-form" onSubmit={(event) => void handleAdd(event)}>
        <label className="calendar-field">
          <span>Calendar name</span>
          <input
            type="text"
            value={name}
            placeholder="Work, Personal, Family…"
            autoComplete="off"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setName(event.target.value)
              setError('')
              setMessage('')
            }}
          />
        </label>
        <label className="calendar-field">
          <span>Google Calendar secret link</span>
          <input
            type="url"
            value={icsUrl}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setIcsUrl(event.target.value)
              setError('')
              setMessage('')
            }}
          />
        </label>
        {error ? <p className="pin-error">{error}</p> : null}
        {message ? <p className="cloud-status cloud-status-on">{message}</p> : null}
        <button type="submit" className="btn btn-primary pin-submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add calendar'}
        </button>
      </form>
    </SettingsSection>
  )
}
