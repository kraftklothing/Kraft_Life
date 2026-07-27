export function findRedisCredentials(): { url: string; token: string } | null {
  const env = process.env

  const explicitPairs: [string | undefined, string | undefined][] = [
    [env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN],
    [env.KV_REST_API_URL, env.KV_REST_API_TOKEN],
    [env.UPSTASH_KV_REST_URL, env.UPSTASH_KV_REST_TOKEN],
  ]

  for (const [url, token] of explicitPairs) {
    if (url && token) return { url: url.replace(/\/$/, ''), token }
  }

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
    if (url && token) return { url: url.replace(/\/$/, ''), token }
  }

  return null
}

function decodeResult(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function encodeValue(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value)
}

async function upstashCommand<T>(command: unknown[]): Promise<T> {
  const creds = findRedisCredentials()
  if (!creds) throw new Error('STORAGE_NOT_CONFIGURED')

  const response = await fetch(creds.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Redis request failed (${response.status}): ${text}`)
  }

  const data = (await response.json()) as { result?: unknown; error?: string }
  if (data.error) throw new Error(data.error)
  return decodeResult(data.result) as T
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const result = await upstashCommand<T | null>(['GET', key])
  return result ?? null
}

export async function redisSet(key: string, value: unknown): Promise<void> {
  await upstashCommand(['SET', key, encodeValue(value)])
}

export async function vaultExists(metaKey: string): Promise<boolean> {
  const meta = await redisGet<{ pinHash?: string }>(metaKey)
  return meta !== null && typeof meta.pinHash === 'string'
}
