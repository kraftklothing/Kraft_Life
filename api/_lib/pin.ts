import { pbkdf2Sync, timingSafeEqual } from 'node:crypto'

const SALT = process.env.KRAFT_LIFE_PIN_SALT ?? 'kraft-life-v1'

export function hashPin(pin: string): string {
  return pbkdf2Sync(pin, SALT, 120_000, 32, 'sha256').toString('hex')
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const attempt = hashPin(pin)
  const a = Buffer.from(attempt, 'hex')
  const b = Buffer.from(storedHash, 'hex')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,6}$/.test(pin)
}
