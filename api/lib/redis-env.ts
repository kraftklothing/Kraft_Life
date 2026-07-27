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

export function isStorageConfigured(): boolean {
  return findRedisCredentials() !== null
}
