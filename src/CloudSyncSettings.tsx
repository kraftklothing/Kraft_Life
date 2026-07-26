import { useState, type FormEvent } from 'react'
import { useCloudSync } from './CloudSyncProvider'
import type { AppState } from './types'

const VERCEL_STORAGE_URL =
  'https://vercel.com/kraftklothings-projects/kraft-life/stores'

interface CloudSyncSettingsProps {
  state: AppState
  onCloudStateLoaded: (state: AppState) => void
}

export default function CloudSyncSettings({
  state,
  onCloudStateLoaded,
}: CloudSyncSettingsProps) {
  const cloud = useCloudSync()
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')

  function resetFields() {
    setPin('')
    setConfirmPin('')
    cloud.clearError()
  }

  async function handleSetup(event: FormEvent) {
    event.preventDefault()
    const ok = await cloud.setupPin(pin, confirmPin, state)
    if (ok) resetFields()
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault()
    if (!/^\d{4,6}$/.test(pin)) {
      return
    }
    const loaded = await cloud.unlockPin(pin)
    if (loaded) {
      onCloudStateLoaded(loaded)
      resetFields()
    }
  }

  function handleLock() {
    cloud.lock()
    resetFields()
  }

  return (
    <section className="task-group cloud-sync-settings" aria-label="Cloud sync">
      <h2 className="category-heading">Cloud sync</h2>

      {cloud.unlocked ? (
        <>
          <p className="cloud-status cloud-status-on">Connected — tasks save to the cloud.</p>
          <p className="muted view-hint">
            Use the same PIN on your phone and computer to see the same tasks.
          </p>
          <button type="button" className="btn lock-btn" onClick={handleLock}>
            Lock Kraft Life
          </button>
        </>
      ) : cloud.vaultConfigured ? (
        <form className="cloud-sync-form" onSubmit={handleUnlock}>
          {!cloud.storageReady ? (
            <div className="cloud-notice">
              <p>Cloud storage still needs to be connected on Vercel before sync works.</p>
              <a className="cloud-link" href={VERCEL_STORAGE_URL} target="_blank" rel="noreferrer">
                Open Vercel Storage setup
              </a>
            </div>
          ) : null}
          <p className="muted view-hint">
            Enter your PIN to load and save tasks in the cloud.
          </p>
          <label className="pin-field">
            <span>PIN</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <label className="pin-remember">
            <input
              type="checkbox"
              checked={cloud.remember}
              onChange={(e) => cloud.setRemember(e.target.checked)}
            />
            Remember on this device
          </label>
          {cloud.error ? <p className="pin-error">{cloud.error}</p> : null}
          <button
            type="submit"
            className="btn btn-primary pin-submit"
            disabled={cloud.busy || !cloud.storageReady}
          >
            {cloud.busy ? 'Opening…' : 'Connect cloud sync'}
          </button>
        </form>
      ) : (
        <form className="cloud-sync-form" onSubmit={handleSetup}>
          {!cloud.storageReady ? (
            <div className="cloud-notice">
              <p>
                One quick Vercel step is needed before cloud save works. Tasks still
                save on this device until then.
              </p>
              <ol className="cloud-steps">
                <li>Open Vercel Storage below</li>
                <li>Add <strong>Upstash for Redis</strong></li>
                <li>Connect it to <strong>kraft-life</strong></li>
                <li>Redeploy, then come back here</li>
              </ol>
              <a className="cloud-link" href={VERCEL_STORAGE_URL} target="_blank" rel="noreferrer">
                Open Vercel Storage setup
              </a>
            </div>
          ) : (
            <p className="muted view-hint">
              Create a 4–6 digit PIN to save tasks in the cloud. No account needed — use
              the same PIN on every device.
            </p>
          )}
          <label className="pin-field">
            <span>Create PIN (4–6 digits)</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </label>
          <label className="pin-field">
            <span>Confirm PIN</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="\d{4,6}"
              autoComplete="off"
              value={confirmPin}
              onChange={(e) =>
                setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
            />
          </label>
          <label className="pin-remember">
            <input
              type="checkbox"
              checked={cloud.remember}
              onChange={(e) => cloud.setRemember(e.target.checked)}
            />
            Remember on this device
          </label>
          {cloud.error ? <p className="pin-error">{cloud.error}</p> : null}
          <button
            type="submit"
            className="btn btn-primary pin-submit"
            disabled={cloud.busy || !cloud.storageReady}
          >
            {cloud.busy ? 'Saving…' : 'Save tasks to the cloud'}
          </button>
        </form>
      )}
    </section>
  )
}
