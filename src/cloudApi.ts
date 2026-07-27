import type { AppState } from './types'

const PIN_HEADER = 'X-Kraft-Pin'

export interface VaultStatus {
  configured: boolean
  storageReady: boolean
  message?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  const raw = await response.text()
  let data: (T & { error?: string }) | null = null
  if (raw) {
    try {
      data = JSON.parse(raw) as T & { error?: string }
    } catch {
      throw new Error(
        response.ok
          ? 'Cloud save returned an unexpected response.'
          : `Cloud save failed (${response.status}). Try again in a moment.`,
      )
    }
  }
  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' ? data.error : `Request failed (${response.status})`,
    )
  }
  return (data ?? ({} as T)) as T
}

export async function fetchVaultStatus(): Promise<VaultStatus> {
  const response = await fetch('/api/vault-status')
  const data = (await response.json()) as VaultStatus & { error?: string }

  if (response.status === 503) {
    return {
      configured: false,
      storageReady: false,
      message: data.message ?? 'Cloud storage is not set up on Vercel yet.',
    }
  }

  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : `Request failed (${response.status})`,
    )
  }

  return data
}

export async function setupVault(pin: string, state: AppState): Promise<void> {
  const response = await fetch('/api/vault-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, state }),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function loadCloudState(pin: string): Promise<AppState> {
  const response = await fetch('/api/vault-state', {
    headers: { [PIN_HEADER]: pin },
  })
  const data = await parseJson<{ state: AppState | null }>(response)
  if (!data.state) {
    throw new Error('No saved data found for this PIN.')
  }
  return data.state
}

export async function saveCloudState(pin: string, state: AppState): Promise<void> {
  const response = await fetch('/api/vault-state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      [PIN_HEADER]: pin,
    },
    body: JSON.stringify({ state }),
  })
  await parseJson<{ ok: boolean }>(response)
}
