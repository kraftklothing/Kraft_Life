import { Redis } from '@upstash/redis'
import type { VaultAppState, VaultMeta } from './types'

const META_KEY = 'kraft-life:vault:meta'
const DATA_KEY = 'kraft-life:vault:data'

function redis(): Redis | null {
  if (!isStorageConfigured()) return null
  return Redis.fromEnv()
}

export async function vaultConfigured(): Promise<boolean> {
  const client = redis()
  if (!client) return false
  const meta = await client.get<VaultMeta>(META_KEY)
  return meta !== null && typeof meta.pinHash === 'string'
}

export async function readVaultMeta(): Promise<VaultMeta | null> {
  const client = redis()
  if (!client) return null
  return client.get<VaultMeta>(META_KEY)
}

export async function readVaultState(): Promise<VaultAppState | null> {
  const client = redis()
  if (!client) return null
  return client.get<VaultAppState>(DATA_KEY)
}

export async function createVault(
  pinHash: string,
  state: VaultAppState,
): Promise<void> {
  const client = redis()
  if (!client) throw new Error('STORAGE_NOT_CONFIGURED')
  if (await vaultConfigured()) {
    throw new Error('ALREADY_CONFIGURED')
  }
  await client.set(META_KEY, { pinHash, createdAt: Date.now() } satisfies VaultMeta)
  await client.set(DATA_KEY, state)
}

export async function writeVaultState(state: VaultAppState): Promise<void> {
  const client = redis()
  if (!client) throw new Error('STORAGE_NOT_CONFIGURED')
  await client.set(DATA_KEY, state)
}

export function isStorageConfigured(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  )
}
