import type { VercelRequest, VercelResponse } from '@vercel/node'

function isStorageConfigured(): boolean {
  const env = process.env
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return true
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) return true
  for (const key of Object.keys(env)) {
    let tokenKey: string | null = null
    if (key.endsWith('_REST_API_URL')) tokenKey = key.replace('_REST_API_URL', '_REST_API_TOKEN')
    else if (key.endsWith('_REST_URL')) tokenKey = key.replace('_REST_URL', '_REST_TOKEN')
    if (tokenKey && env[key] && env[tokenKey]) return true
  }
  return false
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isStorageConfigured()) {
    return res.status(503).json({
      configured: false,
      storageReady: false,
      message:
        'Cloud storage is not connected to kraft-life yet. Tap Show Connections on your Redis database, confirm kraft-life is listed, then redeploy.',
    })
  }

  return res.status(200).json({ configured: false, storageReady: true })
}
