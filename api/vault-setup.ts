import { createHash, timingSafeEqual } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const META_KEY = 'kraft-life:vault:meta'
const DATA_KEY = 'kraft-life:vault:data'
const SALT = process.env.KRAFT_LIFE_PIN_SALT ?? 'kraft-life-v1'

function findRedisCredentials(): { url: string; token: string } | null {
  const env = process.env
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN }
  }
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    return { url: env.KV_REST_API_URL, token: env.KV_REST_API_TOKEN }
  }
  for (const key of Object.keys(env)) {
    let tokenKey: string | null = null
    if (key.endsWith('_REST_API_URL')) tokenKey = key.replace('_REST_API_URL', '_REST_API_TOKEN')
    else if (key.endsWith('_REST_URL')) tokenKey = key.replace('_REST_URL', '_REST_TOKEN')
    if (tokenKey && env[key] && env[tokenKey]) {
      return { url: env[key]!, token: env[tokenKey]! }
    }
  }
  return null
}

function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}

function hashPin(pin: string): string {
  return createHash('sha256').update(`${SALT}:${pin}`).digest('hex')
}

function verifyPin(pin: string, storedHash: string): boolean {
  const attempt = hashPin(pin)
  const a = Buffer.from(attempt, 'hex')
  const b = Buffer.from(storedHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

async function upstashCommand<T>(command: unknown[]): Promise<T> {
  const creds = findRedisCredentials()
  if (!creds) throw new Error('STORAGE_NOT_CONFIGURED')

  const response = await fetch(`${creds.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command]),
  })

  if (!response.ok) {
    throw new Error(`Redis request failed (${response.status})`)
  }

  const data = (await response.json()) as Array<{ result?: T; error?: string }>
  const first = data[0]
  if (first?.error) throw new Error(first.error)
  return first?.result as T
}

async function redisGet<T>(key: string): Promise<T | null> {
  const result = await upstashCommand<T | null>(['GET', key])
  return result ?? null
}

async function redisSet(key: string, value: unknown): Promise<void> {
  await upstashCommand(['SET', key, value])
}

function defaultState() {
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
    timers: [
      {
        id: 'room-cleaning',
        title: 'Room cleaning',
        minutesForDollar: 20,
        order: 0,
      },
      {
        id: 'kitchen-cleaning',
        title: 'Kitchen cleaning',
        minutesForDollar: 10,
        order: 1,
      },
    ],
    vacationDays: {},
    showPercent: false,
    dollarLedger: [],
  }
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
      body.state && typeof body.state === 'object' ? body.state : defaultState()

    await redisSet(META_KEY, { pinHash: hashPin(pin), createdAt: Date.now() })
    await redisSet(DATA_KEY, initialState)
    return res.status(201).json({ ok: true })
  } catch (error) {
    console.error('vault setup error', error)
    return res.status(500).json({ error: 'Could not create vault' })
  }
}

export { hashPin, verifyPin, timingSafeEqual }
