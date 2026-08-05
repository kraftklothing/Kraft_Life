import { useState, type ChangeEvent, type FormEvent } from 'react'
import SettingsSection from './SettingsSection'
import { fetchCalendarEvents } from './calendarApi'
import {
  clearCalendarIcsUrl,
  getCalendarIcsUrl,
  saveCalendarIcsUrl,
} from './calendarSession'

interface CalendarSettingsProps {
  onConnectionChange: () => void
}

export default function CalendarSettings({ onConnectionChange }: CalendarSettingsProps) {
  const [icsUrl, setIcsUrl] = useState(() => getCalendarIcsUrl() ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setError('')
    setMessage('')

    const trimmed = icsUrl.trim()
    if (!trimmed) {
      setError('Paste your Google Calendar secret iCal link first.')
      return
    }

    setBusy(true)
    try {
      const today = new Date()
      const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const events = await fetchCalendarEvents(trimmed, dateKey)
      saveCalendarIcsUrl(trimmed)
      onConnectionChange()
      setMessage(
        events.length === 0
          ? 'Connected. No events on today — swipe to another day to check.'
          : `Connected. Found ${events.length} event${events.length === 1 ? '' : 's'} today.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect calendar.')
    } finally {
      setBusy(false)
    }
  }

  function handleDisconnect() {
    clearCalendarIcsUrl()
    setIcsUrl('')
    setMessage('')
    setError('')
    onConnectionChange()
  }

  return (
    <SettingsSection title="Calendar" ariaLabel="Calendar" className="calendar-settings">
      <p className="muted view-hint">
        Paste the secret iCal link from Google Calendar. Events show at the top of
        each day under <strong>Calendar</strong>, using Mountain Time (MST/MDT).
      </p>
      <form className="calendar-settings-form" onSubmit={(event) => void handleSave(event)}>
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
          {busy ? 'Connecting…' : getCalendarIcsUrl() ? 'Save calendar link' : 'Connect calendar'}
        </button>
        {getCalendarIcsUrl() ? (
          <button
            type="button"
            className="btn lock-btn"
            disabled={busy}
            onClick={handleDisconnect}
          >
            Disconnect calendar
          </button>
        ) : null}
      </form>
    </SettingsSection>
  )
}
