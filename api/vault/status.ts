import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isStorageConfigured, vaultConfigured } from '../lib/vault'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!isStorageConfigured()) {
      return res.status(503).json({
        configured: false,
        storageReady: false,
        message: 'Cloud storage is not set up on Vercel yet.',
      })
    }

    const configured = await vaultConfigured()
    return res.status(200).json({ configured, storageReady: true })
  } catch (error) {
    console.error('vault status error', error)
    return res.status(500).json({ error: 'Could not read vault status' })
  }
}
