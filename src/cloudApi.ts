import type { AppState } from './types'

const PIN_HEADER = 'X-Kraft-Pin'

export interface VaultStatus {
  configured: boolean
  storageReady: boolean
  message?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : `Request failed (${response.status})`,
    )
  }
  return data
}

export async function fetchVaultStatus(): Promise<VaultStatus> {
  const response = await fetch('/api/vault/status')
  return parseJson<VaultStatus>(response)
}

export async function setupVault(pin: string, state: AppState): Promise<void> {
  const response = await fetch('/api/vault/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, state }),
  })
  await parseJson<{ ok: boolean }>(response)
}

export async function loadCloudState(pin: string): Promise<AppState> {
  const response = await fetch('/api/vault/state', {
    headers: { [PIN_HEADER]: pin },
  })
  const data = await parseJson<{ state: AppState | null }>(response)
  if (!data.state) {
    throw new Error('No saved data found for this PIN.')
  }
  return data.state
}

export async function saveCloudState(pin: string, state: AppState): Promise<void> {
  const response = await fetch('/api/vault/state', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      [PIN_HEADER]: pin,
    },
    body: JSON.stringify({ state }),
  })
  await parseJson<{ ok: boolean }>(response)
}
