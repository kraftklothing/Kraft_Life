import type { VercelRequest, VercelResponse } from '@vercel/node'
import { isValidPin, verifyPin } from '../lib/pin'
import type { VaultAppState } from '../lib/types'
import {
  isStorageConfigured,
  readVaultMeta,
  readVaultState,
  vaultConfigured,
  writeVaultState,
} from '../lib/vault'

function readPin(req: VercelRequest): string {
  const header = req.headers['x-kraft-pin']
  if (typeof header === 'string') return header.trim()
  if (Array.isArray(header)) return header[0]?.trim() ?? ''
  return ''
}

async function authorizePin(pin: string): Promise<boolean> {
  const meta = await readVaultMeta()
  if (!meta?.pinHash) return false
  return verifyPin(pin, meta.pinHash)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!isStorageConfigured()) {
      return res.status(503).json({ error: 'Cloud storage is not set up on Vercel yet.' })
    }

    if (!(await vaultConfigured())) {
      return res.status(404).json({ error: 'No PIN has been set up yet.' })
    }

    const pin = readPin(req)
    if (!isValidPin(pin)) {
      return res.status(401).json({ error: 'Invalid PIN.' })
    }

    if (!(await authorizePin(pin))) {
      return res.status(401).json({ error: 'Wrong PIN.' })
    }

    if (req.method === 'GET') {
      const state = await readVaultState()
      return res.status(200).json({ state: state ?? null })
    }

    if (req.method === 'PUT') {
      const body = req.body as { state?: VaultAppState }
      if (!body?.state || typeof body.state !== 'object') {
        return res.status(400).json({ error: 'Missing state body' })
      }

      await writeVaultState(body.state)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, PUT')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error) {
    console.error('vault state error', error)
    return res.status(500).json({
      error: req.method === 'GET' ? 'Could not load your data' : 'Could not save your data',
    })
  }
}
