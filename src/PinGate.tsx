import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  fetchVaultStatus,
  loadCloudState,
  saveCloudState,
  setupVault,
} from './cloudApi'
import { forgetPin, getRememberedPin, rememberPin } from './pinSession'
import { loadState } from './storage'
import type { AppState } from './types'

type GateMode = 'loading' | 'setup' | 'unlock' | 'offline' | 'ready'

export interface CloudSync {
  pin: string
  scheduleSave: (state: AppState) => void
  lock: () => void
}

interface PinGateProps {
  children: (initialState: AppState, cloudSync: CloudSync) => ReactNode
}

export default function PinGate({ children }: PinGateProps) {
  const [mode, setMode] = useState<GateMode>('loading')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [initialState, setInitialState] = useState<AppState | null>(null)
  const [activePin, setActivePin] = useState('')
  const saveTimerRef = useRef<number | null>(null)
  const latestStateRef = useRef<AppState | null>(null)

  const tryUnlock = useCallback(async (candidate: string) => {
    setBusy(true)
    setError('')
    try {
      const state = await loadCloudState(candidate)
      if (remember) rememberPin(candidate)
      else forgetPin()
      setActivePin(candidate)
      setInitialState(state)
      latestStateRef.current = state
      setMode('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unlock')
    } finally {
      setBusy(false)
    }
  }, [remember])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const status = await fetchVaultStatus()
        if (cancelled) return

        if (!status.storageReady) {
          setMode('offline')
          setInitialState(loadState())
          return
        }

        if (!status.configured) {
          setMode('setup')
          return
        }

        const savedPin = getRememberedPin()
        if (savedPin) {
          await tryUnlock(savedPin)
          return
        }

        setMode('unlock')
      } catch {
        if (!cancelled) {
          setMode('offline')
          setInitialState(loadState())
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [tryUnlock])

  const scheduleSave = useCallback(
    (state: AppState) => {
      latestStateRef.current = state
      if (!activePin) return
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = window.setTimeout(() => {
        void saveCloudState(activePin, state).catch(() => {
          // Local cache still holds data; cloud retry happens on next edit.
        })
      }, 700)
    },
    [activePin],
  )

  const lock = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }
    forgetPin()
    setActivePin('')
    setInitialState(null)
    setPin('')
    setConfirmPin('')
    setMode('unlock')
  }, [])

  async function handleSetup(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!/^\d{4,6}$/.test(pin)) {
      setError('Choose a PIN with 4–6 digits.')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.')
      return
    }

    setBusy(true)
    try {
      const local = loadState()
      await setupVault(pin, local)
      if (remember) rememberPin(pin)
      setActivePin(pin)
      setInitialState(local)
      latestStateRef.current = local
      setMode('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set up PIN')
    } finally {
      setBusy(false)
    }
  }

  async function handleUnlock(event: FormEvent) {
    event.preventDefault()
    if (!/^\d{4,6}$/.test(pin)) {
      setError('Enter your 4–6 digit PIN.')
      return
    }
    await tryUnlock(pin)
  }

  if (mode === 'loading') {
    return (
      <div className="pin-screen">
        <div className="pin-card panel">
          <p className="pin-kicker">Kraft Life</p>
          <h1>Loading your life…</h1>
        </div>
      </div>
    )
  }

  if (mode === 'offline' && initialState) {
    return (
      <>
        <div className="cloud-banner">
          Cloud sync is not available — saving on this device only.
        </div>
        {children(initialState, {
          pin: '',
          scheduleSave: () => {},
          lock: () => {},
        })}
      </>
    )
  }

  if (mode === 'setup') {
    return (
      <div className="pin-screen">
        <form className="pin-card panel" onSubmit={handleSetup}>
          <p className="pin-kicker">Kraft Life</p>
          <h1>Create your PIN</h1>
          <p className="pin-copy">
            This PIN saves your tasks to the cloud. Use the same PIN on your phone
            and computer — no account needed.
          </p>
          <label className="pin-field">
            <span>PIN (4–6 digits)</span>
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
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember on this device
          </label>
          {error ? <p className="pin-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary pin-submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save my life to the cloud'}
          </button>
        </form>
      </div>
    )
  }

  if (mode === 'unlock') {
    return (
      <div className="pin-screen">
        <form className="pin-card panel" onSubmit={handleUnlock}>
          <p className="pin-kicker">Kraft Life</p>
          <h1>Enter your PIN</h1>
          <p className="pin-copy">
            Your tasks live in the cloud. Enter the PIN you created to open them.
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
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember on this device
          </label>
          {error ? <p className="pin-error">{error}</p> : null}
          <button type="submit" className="btn btn-primary pin-submit" disabled={busy}>
            {busy ? 'Opening…' : 'Open Kraft Life'}
          </button>
        </form>
      </div>
    )
  }

  if (mode === 'ready' && initialState) {
    return children(initialState, { pin: activePin, scheduleSave, lock })
  }

  return null
}
