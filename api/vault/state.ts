import { isValidPin, readJsonBody, readPinHeader, verifyPin } from '../../lib/server/pin'
import type { VaultAppState } from '../../lib/server/types'
import {
  isStorageConfigured,
  readVaultMeta,
  readVaultState,
  vaultConfigured,
  writeVaultState,
} from '../../lib/server/vault'

export const config = {
  runtime: 'nodejs',
}

async function authorizePin(pin: string): Promise<boolean> {
  const meta = await readVaultMeta()
  if (!meta?.pinHash) return false
  return verifyPin(pin, meta.pinHash)
}

export async function GET(request: Request): Promise<Response> {
  try {
    if (!isStorageConfigured()) {
      return Response.json(
        { error: 'Cloud storage is not set up on Vercel yet.' },
        { status: 503 },
      )
    }

    if (!(await vaultConfigured())) {
      return Response.json({ error: 'No PIN has been set up yet.' }, { status: 404 })
    }

    const pin = readPinHeader(request)
    if (!isValidPin(pin)) {
      return Response.json({ error: 'Invalid PIN.' }, { status: 401 })
    }

    if (!(await authorizePin(pin))) {
      return Response.json({ error: 'Wrong PIN.' }, { status: 401 })
    }

    const state = await readVaultState()
    return Response.json({ state: state ?? null })
  } catch (error) {
    console.error('vault state GET error', error)
    return Response.json({ error: 'Could not load your data' }, { status: 500 })
  }
}

export async function PUT(request: Request): Promise<Response> {
  try {
    if (!isStorageConfigured()) {
      return Response.json(
        { error: 'Cloud storage is not set up on Vercel yet.' },
        { status: 503 },
      )
    }

    if (!(await vaultConfigured())) {
      return Response.json({ error: 'No PIN has been set up yet.' }, { status: 404 })
    }

    const pin = readPinHeader(request)
    if (!isValidPin(pin)) {
      return Response.json({ error: 'Invalid PIN.' }, { status: 401 })
    }

    if (!(await authorizePin(pin))) {
      return Response.json({ error: 'Wrong PIN.' }, { status: 401 })
    }

    const body = await readJsonBody<{ state?: VaultAppState }>(request)
    if (!body?.state || typeof body.state !== 'object') {
      return Response.json({ error: 'Missing state body' }, { status: 400 })
    }

    await writeVaultState(body.state)
    return Response.json({ ok: true })
  } catch (error) {
    console.error('vault state PUT error', error)
    return Response.json({ error: 'Could not save your data' }, { status: 500 })
  }
}
