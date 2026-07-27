import { Redis } from '@upstash/redis'
import type { VaultAppState, VaultMeta } from './types'

const META_KEY = 'kraft-life:vault:meta'
const DATA_KEY = 'kraft-life:vault:data'

let redisClient: Redis | null | undefined

export function findRedisCredentials(): { url: string; token: string } | null {
  const env = process.env

  const explicitPairs: [string | undefined, string | undefined][] = [
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN],
    [env.UPSTASH_KV_REST_URL, env.UPSTASH_KV_REST_TOKEN],
  ]

  for (const [url, token] of explicitPairs) {
    if (url && token) return { url, token }
  }

  // Vercel Storage can prefix vars when connecting a database to a project.
  for (const key of Object.keys(env)) {
    let tokenKey: string | null = null
    if (key.endsWith('_REST_API_URL')) {
      tokenKey = key.replace('_REST_API_URL', '_REST_API_TOKEN')
    } else if (key.endsWith('_REST_URL')) {
      tokenKey = key.replace('_REST_URL', '_REST_TOKEN')
    }
    if (!tokenKey) continue
    const url = env[key]
    const token = env[tokenKey]
    if (url && token) return { url, token }
  }

  return null
}

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

export function isStorageConfigured(): boolean {
  return findRedisCredentials() !== null
}
