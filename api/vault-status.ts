import type { VercelRequest, VercelResponse } from '@vercel/node'

const META_KEY = 'kraft-life:vault:meta'

function findRedisCredentials(): { url: string; token: string } | null {
  const env = process.env
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL.replace(/\/$/, ''), token: env.UPSTASH_REDIS_REST_TOKEN }
  }
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    return { url: env.KV_REST_API_URL.replace(/\/$/, ''), token: env.KV_REST_API_TOKEN }
  }
  for (const key of Object.keys(env)) {
    let tokenKey: string | null = null
    if (key.endsWith('_REST_API_URL')) tokenKey = key.replace('_REST_API_URL', '_REST_API_TOKEN')
    else if (key.endsWith('_REST_URL')) tokenKey = key.replace('_REST_URL', '_REST_TOKEN')
    if (tokenKey && env[key] && env[tokenKey]) {
      return { url: env[key]!.replace(/\/$/, ''), token: env[tokenKey]! }
    }
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

async function vaultConfigured(): Promise<boolean> {
  const creds = findRedisCredentials()
  if (!creds) return false

  const response = await fetch(creds.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', META_KEY]),
  })
  if (!response.ok) return false

  const data = (await response.json()) as { result?: unknown; error?: string }
  if (data.error) return false
  const meta = decodeResult(data.result) as { pinHash?: string } | null
  return meta !== null && typeof meta?.pinHash === 'string'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!findRedisCredentials()) {
    return res.status(503).json({
      configured: false,
      storageReady: false,
      message:
        'Cloud storage is not connected to kraft-life yet. Tap Show Connections on your Redis database, confirm kraft-life is listed, then redeploy.',
    })
  }

  try {
    const configured = await vaultConfigured()
    return res.status(200).json({ configured, storageReady: true })
  } catch {
    return res.status(200).json({ configured: false, storageReady: true })
  }
}
