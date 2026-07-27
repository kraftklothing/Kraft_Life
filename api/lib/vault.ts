import { findRedisCredentials, isStorageConfigured } from './redis-env'
import type { VaultAppState, VaultMeta } from './types'

const META_KEY = 'kraft-life:vault:meta'
const DATA_KEY = 'kraft-life:vault:data'

async function upstashCommand<T>(command: unknown[]): Promise<T> {
  const creds = findRedisCredentials()
  if (!creds) throw new Error('STORAGE_NOT_CONFIGURED')

  const response = await fetch(`${creds.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
  })

  if (!response.ok) {
    throw new Error(`Redis request failed (${response.status})`)
  }

  const data = (await response.json()) as Array<{ result?: T; error?: string }>
  const first = data[0]
  if (first?.error) throw new Error(first.error)
  return first?.result as T
}

async function redisGet<T>(key: string): Promise<T | null> {
  const result = await upstashCommand<T | null>(['GET', key])
  return result ?? null
}

async function redisSet(key: string, value: unknown): Promise<void> {
  await upstashCommand(['SET', key, value])
}

export async function vaultConfigured(): Promise<boolean> {
  const meta = await redisGet<VaultMeta>(META_KEY)
  return meta !== null && typeof meta.pinHash === 'string'
}

export async function readVaultMeta(): Promise<VaultMeta | null> {
  return redisGet<VaultMeta>(META_KEY)
}

export async function readVaultState(): Promise<VaultAppState | null> {
  return redisGet<VaultAppState>(DATA_KEY)
}

export async function createVault(
  pinHash: string,
  state: VaultAppState,
): Promise<void> {
  if (!isStorageConfigured()) throw new Error('STORAGE_NOT_CONFIGURED')
  if (await vaultConfigured()) throw new Error('ALREADY_CONFIGURED')
  await redisSet(META_KEY, { pinHash, createdAt: Date.now() } satisfies VaultMeta)
  await redisSet(DATA_KEY, state)
}

export async function writeVaultState(state: VaultAppState): Promise<void> {
  if (!isStorageConfigured()) throw new Error('STORAGE_NOT_CONFIGURED')
  await redisSet(DATA_KEY, state)
}

export { isStorageConfigured } from './redis-env'
