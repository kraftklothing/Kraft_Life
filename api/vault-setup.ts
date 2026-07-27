import { createHash, timingSafeEqual } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { findRedisCredentials, redisGet, redisSet } from './lib/upstash-rest'

const META_KEY = 'kraft-life:vault:meta'
const DATA_KEY = 'kraft-life:vault:data'
const SALT = process.env.KRAFT_LIFE_PIN_SALT ?? 'kraft-life-v1'

function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

function hashPin(pin: string): string {
  return createHash('sha256').update(`${SALT}:${pin}`).digest('hex')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    if (!findRedisCredentials()) {
      return res.status(503).json({ error: 'Cloud storage is not set up on Vercel yet.' })
    }

    const body = req.body as { pin?: string; state?: Record<string, unknown> }
    const pin = typeof body?.pin === 'string' ? body.pin.trim() : ''

    if (!isValidPin(pin)) {
      return res.status(400).json({ error: 'PIN must be 4–6 digits.' })
    }

    const existing = await redisGet<{ pinHash?: string }>(META_KEY)
    if (existing?.pinHash) {
      return res.status(409).json({ error: 'A PIN is already set for this app.' })
    }

    const initialState =
      body.state && typeof body.state === 'object'
        ? body.state
        : {
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
            dollarLedger: [],
          }

    await redisSet(META_KEY, { pinHash: hashPin(pin), createdAt: Date.now() })
    await redisSet(DATA_KEY, initialState)
    return res.status(201).json({ ok: true })
  } catch (error) {
    console.error('vault setup error', error)
    return res.status(500).json({ error: 'Could not create vault' })
  }
}

export { hashPin, timingSafeEqual }
