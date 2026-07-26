import type { VercelRequest, VercelResponse } from '@vercel/node'
import { hashPin, isValidPin } from '../_lib/pin'
import type { VaultAppState } from '../_lib/types'
import {
  createVault,
  isStorageConfigured,
  vaultConfigured,
} from '../_lib/vault'

function defaultState(): VaultAppState {
  return {
    tasks: [],
    categories: [
      { id: 'general', name: 'General' },
      { id: 'personal', name: 'Personal' },
      { id: 'work', name: 'Work' },
    ],
    dollars: 0,
    rewards: [
      { id: 'coffee', name: 'Coffee treat', cost: 3 },
      { id: 'movie', name: 'Movie night', cost: 8 },
      { id: 'dinner', name: 'Nice dinner', cost: 15 },
    ],
    projects: [],
    goals: [],
    vacationDays: {},
    showPercent: false,
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isStorageConfigured()) {
    return res.status(503).json({ error: 'Cloud storage is not set up on Vercel yet.' })
  }

  const body = req.body as { pin?: string; state?: VaultAppState }
  const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''

  if (!isValidPin(pin)) {
    return res.status(400).json({ error: 'PIN must be 4–6 digits.' })
  }

  try {
    if (await vaultConfigured()) {
      return res.status(409).json({ error: 'A PIN is already set for this app.' })
    }

    const initialState =
      body.state && typeof body.state === 'object' ? body.state : defaultState()

    await createVault(hashPin(pin), initialState)
    return res.status(201).json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_CONFIGURED') {
      return res.status(409).json({ error: 'A PIN is already set for this app.' })
    }
    return res.status(500).json({ error: 'Could not create vault' })
  }
}
