/** Short chime when a focus timer earns a dollar and resets. */

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AudioCtx =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioCtx) return null
  if (!audioContext) audioContext = new AudioCtx()
  return audioContext
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  gainPeak: number,
) {
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

/** Play a soft two-note ding. Safe to call after the user has started a timer. */
export function playTimerDing(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    void ctx.resume()
    const t = ctx.currentTime
    tone(ctx, 880, t, 0.18, 0.12)
    tone(ctx, 1174.66, t + 0.12, 0.28, 0.1)
  } catch {
    // Ignore autoplay / audio failures — toast still shows.
  }
}

/**
 * Attention chime for the long-run review prompt.
 * Plays when the page is foreground again — browsers will not sound this
 * while the phone is asleep or the tab is suspended.
 */
export function playLongRunAlert(): void {
  try {
    const ctx = getAudioContext()
    if (!ctx) return
    void ctx.resume()
    const t = ctx.currentTime
    tone(ctx, 523.25, t, 0.22, 0.14)
    tone(ctx, 659.25, t + 0.2, 0.22, 0.14)
    tone(ctx, 783.99, t + 0.4, 0.35, 0.12)
  } catch {
    // Ignore autoplay / audio failures — review modal still shows.
  }
}
