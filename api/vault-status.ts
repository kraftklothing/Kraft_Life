import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isStorageConfigured } from './lib/vault'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isStorageConfigured()) {
    return res.status(503).json({
      configured: false,
      storageReady: false,
      message:
        'Cloud storage is not connected to kraft-life yet. In Vercel, open your Redis database → Connect to kraft-life → redeploy.',
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
      message: 'Cloud storage is connected but not responding. Try redeploying kraft-life.',
    })
  }
}
