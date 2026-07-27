import type { VercelRequest, VercelResponse } from '@vercel/node'
import { findRedisCredentials, vaultExists } from './lib/upstash-rest'

const META_KEY = 'kraft-life:vault:meta'

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
    const configured = await vaultExists(META_KEY)
    return res.status(200).json({ configured, storageReady: true })
  } catch {
    return res.status(200).json({ configured: false, storageReady: true })
  }
}
