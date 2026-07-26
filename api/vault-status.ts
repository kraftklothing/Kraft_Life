import type { VercelRequest, VercelResponse } from '@vercel/node'

function isStorageConfigured(): boolean {
  return Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
      (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
  )
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isStorageConfigured()) {
    return res.status(503).json({
      configured: false,
      storageReady: false,
      message: 'Cloud storage is not set up on Vercel yet.',
    })
  }

  try {
    const { vaultConfigured } = await import('./lib/vault')
    const configured = await vaultConfigured()
    return res.status(200).json({ configured, storageReady: true })
  } catch (error) {
    console.error('vault status error', error)
    return res.status(503).json({
      configured: false,
      storageReady: false,
      message: 'Cloud storage is not set up on Vercel yet.',
    })
  }
}
