import { Redis } from '@upstash/redis'
import { findRedisCredentials, isStorageConfigured } from './redis-env'
import type { VaultAppState, VaultMeta } from './types'

const META_KEY = 'kraft-life:vault:meta'
const DATA_KEY = 'kraft-life:vault:data'

let redisClient: Redis | null | undefined

function getRedis(): Redis | null {
  if (!isStorageConfigured()) return null
  if (redisClient === undefined) {
    try {
      const creds = findRedisCredentials()
      redisClient = creds ? new Redis(creds) : Redis.fromEnv()
    } catch {
      redisClient = null
    }
  }
  return redisClient
}

export async function vaultConfigured(): Promise<boolean> {
  const client = getRedis()
  if (!client) return false
  const meta = await client.get<VaultMeta>(META_KEY)
  return meta !== null && typeof meta.pinHash === 'string'
}

export async function readVaultMeta(): Promise<VaultMeta | null> {
  const client = getRedis()
  if (!client) return null
  return client.get<VaultMeta>(META_KEY)
}

export async function readVaultState(): Promise<VaultAppState | null> {
  const client = getRedis()
  if (!client) return null
  return client.get<VaultAppState>(DATA_KEY)
}

export async function createVault(
  pinHash: string,
  state: VaultAppState,
): Promise<void> {
  const client = getRedis()
  if (!client) throw new Error('STORAGE_NOT_CONFIGURED')
  if (await vaultConfigured()) {
    throw new Error('ALREADY_CONFIGURED')
  }
  await client.set(META_KEY, { pinHash, createdAt: Date.now() } satisfies VaultMeta)
  await client.set(DATA_KEY, state)
}

export async function writeVaultState(state: VaultAppState): Promise<void> {
  const client = getRedis()
  if (!client) throw new Error('STORAGE_NOT_CONFIGURED')
  await client.set(DATA_KEY, state)
}

export { isStorageConfigured } from './redis-env'
