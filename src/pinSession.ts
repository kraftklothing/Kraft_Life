const REMEMBER_KEY = 'kraft-life-pin-remember'

export function getRememberedPin(): string | null {
  try {
    const pin = localStorage.getItem(REMEMBER_KEY)
    return pin && /^\d{4,6}$/.test(pin) ? pin : null
  } catch {
    return null
  }
}

export function rememberPin(pin: string): void {
  localStorage.setItem(REMEMBER_KEY, pin)
}

export function forgetPin(): void {
  localStorage.removeItem(REMEMBER_KEY)
}
