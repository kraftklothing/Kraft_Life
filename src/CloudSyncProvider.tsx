import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchVaultStatus,
  loadCloudState,
  saveCloudState,
  setupVault,
} from './cloudApi'
import { forgetPin, getRememberedPin, rememberPin } from './pinSession'
import type { AppState } from './types'

export interface CloudSyncContextValue {
  storageReady: boolean
  vaultConfigured: boolean
  unlocked: boolean
  loading: boolean
  busy: boolean
  error: string
  remember: boolean
  cloudLoadCount: number
  setRemember: (value: boolean) => void
  clearError: () => void
  setupPin: (pin: string, confirmPin: string, state: AppState) => Promise<boolean>
  unlockPin: (pin: string) => Promise<AppState | null>
  lock: () => void
  scheduleSave: (state: AppState) => void
  takeLoadedState: () => AppState | null
  refreshCloudStatus: () => Promise<void>
}

const CloudSyncContext = createContext<CloudSyncContextValue | null>(null)

export function useCloudSync(): CloudSyncContextValue {
  const value = useContext(CloudSyncContext)
  if (!value) {
    throw new Error('useCloudSync must be used within CloudSyncProvider')
  }
  return value
}

interface CloudSyncProviderProps {
  children: ReactNode
}

export function CloudSyncProvider({ children }: CloudSyncProviderProps) {
  const [loading, setLoading] = useState(true)
  const [storageReady, setStorageReady] = useState(false)
  const [vaultConfigured, setVaultConfigured] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(true)
  const [cloudLoadCount, setCloudLoadCount] = useState(0)
  const activePinRef = useRef('')
  const saveTimerRef = useRef<number | null>(null)
  const loadedStateRef = useRef<AppState | null>(null)
  const pendingStateRef = useRef<AppState | null>(null)

  const applyUnlock = useCallback((pin: string, state: AppState, persist: boolean) => {
    if (persist) rememberPin(pin)
    else forgetPin()
    activePinRef.current = pin
    loadedStateRef.current = state
    setCloudLoadCount((n) => n + 1)
    setUnlocked(true)
    setError('')
  }, [])

  const tryUnlock = useCallback(
    async (candidate: string, persist: boolean) => {
      setBusy(true)
      setError('')
      try {
        const state = await loadCloudState(candidate)
        applyUnlock(candidate, state, persist)
        return state
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not unlock')
        return null
      } finally {
        setBusy(false)
      }
    },
    [applyUnlock],
  )

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const status = await fetchVaultStatus()
        if (cancelled) return
        setStorageReady(status.storageReady)
        setVaultConfigured(status.configured)

        if (status.storageReady && status.configured) {
          const savedPin = getRememberedPin()
          if (savedPin) {
            setBusy(true)
            try {
              const state = await loadCloudState(savedPin)
              if (cancelled) return
              applyUnlock(savedPin, state, true)
            } catch {
              // Wrong/stale remembered PIN — stay locked; user can unlock in Settings.
              if (!cancelled) forgetPin()
            } finally {
              if (!cancelled) setBusy(false)
            }
          }
        }
      } catch {
        if (!cancelled) {
          setStorageReady(false)
          setVaultConfigured(false)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [applyUnlock])

  const scheduleSave = useCallback((state: AppState) => {
    const pin = activePinRef.current
    if (!pin) return
    pendingStateRef.current = state
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null
      const toSave = pendingStateRef.current
      pendingStateRef.current = null
      if (!toSave) return
      void saveCloudState(pin, toSave).catch(() => {
        // Local cache still holds data; next edit retries.
      })
    }, 700)
  }, [])

  const flushSave = useCallback(() => {
    const pin = activePinRef.current
    const toSave = pendingStateRef.current
    if (!pin || !toSave) return
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    pendingStateRef.current = null
    void saveCloudState(pin, toSave).catch(() => {
      // Local cache still holds data; next edit retries.
    })
  }, [])

  useEffect(() => {
    function onHide() {
      if (document.visibilityState === 'hidden') flushSave()
    }
    window.addEventListener('pagehide', flushSave)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', flushSave)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [flushSave])

  const lock = useCallback(() => {
    flushSave()
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }
    forgetPin()
    activePinRef.current = ''
    setUnlocked(false)
    setError('')
  }, [flushSave])

  const setupPin = useCallback(
    async (pin: string, confirmPin: string, state: AppState) => {
      setError('')
      const normalizedPin = pin.trim()
      const normalizedConfirm = confirmPin.trim()
      if (!/^\d{4,6}$/.test(normalizedPin)) {
        setError('Choose a PIN with 4–6 digits.')
        return false
      }
      if (normalizedPin !== normalizedConfirm) {
        setError(`PINs do not match (${normalizedPin} vs ${normalizedConfirm}).`)
        return false
      }

      setBusy(true)
      try {
        await setupVault(normalizedPin, state)
        setVaultConfigured(true)
        applyUnlock(normalizedPin, state, remember)
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not set up PIN')
        return false
      } finally {
        setBusy(false)
      }
    },
    [applyUnlock, remember],
  )

  const unlockPin = useCallback(
    async (pin: string) => tryUnlock(pin, remember),
    [remember, tryUnlock],
  )

  const takeLoadedState = useCallback(() => {
    const state = loadedStateRef.current
    loadedStateRef.current = null
    return state
  }, [])

  const refreshCloudStatus = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const status = await fetchVaultStatus()
      setStorageReady(status.storageReady)
      setVaultConfigured(status.configured)
    } catch (err) {
      setStorageReady(false)
      setVaultConfigured(false)
      setError(err instanceof Error ? err.message : 'Could not check cloud status')
    } finally {
      setBusy(false)
    }
  }, [])

  const value: CloudSyncContextValue = {
    storageReady,
    vaultConfigured,
    unlocked,
    loading,
    busy,
    error,
    remember,
    cloudLoadCount,
    setRemember,
    clearError: () => setError(''),
    setupPin,
    unlockPin,
    lock,
    scheduleSave,
    takeLoadedState,
    refreshCloudStatus,
  }

  return (
    <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>
  )
}
