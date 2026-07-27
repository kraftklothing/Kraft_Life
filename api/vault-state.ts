import { createHash, timingSafeEqual } from 'crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const META_KEY = 'kraft-life:vault:meta'
const DATA_KEY = 'kraft-life:vault:data'
const SALT = process.env.KRAFT_LIFE_PIN_SALT ?? 'kraft-life-v1'

function findRedisCredentials(): { url: string; token: string } | null {
  const env = process.env
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return { url: env.UPSTASH_REDIS_REST_URL.replace(/\/$/, ''), token: env.UPSTASH_REDIS_REST_TOKEN }
  }
  if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
    return { url: env.KV_REST_API_URL.replace(/\/$/, ''), token: env.KV_REST_API_TOKEN }
  }
  for (const key of Object.keys(env)) {
    let tokenKey: string | null = null
    if (key.endsWith('_REST_API_URL')) tokenKey = key.replace('_REST_API_URL', '_REST_API_TOKEN')
    else if (key.endsWith('_REST_URL')) tokenKey = key.replace('_REST_URL', '_REST_TOKEN')
    if (tokenKey && env[key] && env[tokenKey]) {
      return { url: env[key]!.replace(/\/$/, ''), token: env[tokenKey]! }
    }
  }
  return null
}

function decodeResult(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

async function redisGet<T>(key: string): Promise<T | null> {
  const creds = findRedisCredentials()
  if (!creds) throw new Error('STORAGE_NOT_CONFIGURED')

  const response = await fetch(creds.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  })
  if (!response.ok) throw new Error(`Redis GET failed (${response.status})`)

  const data = (await response.json()) as { result?: unknown; error?: string }
  if (data.error) throw new Error(data.error)
  const decoded = decodeResult(data.result)
  return (decoded ?? null) as T | null
}

async function redisSet(key: string, value: unknown): Promise<void> {
  const creds = findRedisCredentials()
  if (!creds) throw new Error('STORAGE_NOT_CONFIGURED')

  const stored = typeof value === 'string' ? value : JSON.stringify(value)
  const response = await fetch(creds.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${creds.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['SET', key, stored]),
  })
  if (!response.ok) throw new Error(`Redis SET failed (${response.status})`)

  const data = (await response.json()) as { error?: string }
  if (data.error) throw new Error(data.error)
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

function readPin(req: VercelRequest): string {
  const header = req.headers['x-kraft-pin']
  if (typeof header === 'string') return header.trim()
  if (Array.isArray(header)) return header[0]?.trim() ?? ''
  return ''
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!findRedisCredentials()) {
      return res.status(503).json({ error: 'Cloud storage is not set up on Vercel yet.' })
    }

    if (req.method === 'GET') {
      const pin = readPin(req)
      if (!isValidPin(pin)) {
        return res.status(401).json({ error: 'Invalid PIN.' })
      }

      const meta = await redisGet<{ pinHash?: string }>(META_KEY)
      if (!meta?.pinHash) {
        return res.status(404).json({ error: 'No PIN has been set up yet.' })
      }
      if (!verifyPin(pin, meta.pinHash)) {
        return res.status(401).json({ error: 'Wrong PIN.' })
      }

      const state = await redisGet<Record<string, unknown>>(DATA_KEY)
      return res.status(200).json({ state: state ?? null })
    }

    if (req.method === 'PUT') {
      const pin = readPin(req)
      if (!isValidPin(pin)) {
        return res.status(401).json({ error: 'Invalid PIN.' })
      }

      const meta = await redisGet<{ pinHash?: string }>(META_KEY)
      if (!meta?.pinHash) {
        return res.status(404).json({ error: 'No PIN has been set up yet.' })
      }
      if (!verifyPin(pin, meta.pinHash)) {
        return res.status(401).json({ error: 'Wrong PIN.' })
      }

      const body = req.body as { state?: Record<string, unknown> }
      if (!body?.state || typeof body.state !== 'object') {
        return res.status(400).json({ error: 'Missing state body' })
      }

      await redisSet(DATA_KEY, body.state)
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
