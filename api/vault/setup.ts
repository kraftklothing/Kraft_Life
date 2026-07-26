import { hashPin, isValidPin, readJsonBody } from '../../lib/server/pin'
import type { VaultAppState } from '../../lib/server/types'
import {
  createVault,
  isStorageConfigured,
  vaultConfigured,
} from '../../lib/server/vault'

export const config = {
  runtime: 'nodejs',
}

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

export async function POST(request: Request): Promise<Response> {
  try {
    if (!isStorageConfigured()) {
      return Response.json(
        { error: 'Cloud storage is not set up on Vercel yet.' },
        { status: 503 },
      )
    }

    const body = await readJsonBody<{ pin?: string; state?: VaultAppState }>(request)
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''

    if (!isValidPin(pin)) {
      return Response.json({ error: 'PIN must be 4–6 digits.' }, { status: 400 })
    }

    if (await vaultConfigured()) {
      return Response.json({ error: 'A PIN is already set for this app.' }, { status: 409 })
    }

    const initialState =
      body.state && typeof body.state === 'object' ? body.state : defaultState()

    await createVault(hashPin(pin), initialState)
    return Response.json({ ok: true }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === 'ALREADY_CONFIGURED') {
      return Response.json({ error: 'A PIN is already set for this app.' }, { status: 409 })
    }
    console.error('vault setup error', error)
    return Response.json({ error: 'Could not create vault' }, { status: 500 })
  }
}
