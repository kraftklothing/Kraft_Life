import type { FocusTimer } from './types'

/** Continuous run length that triggers the “still timing?” review. */
export const LONG_RUN_REVIEW_SECONDS = 2 * 60 * 60

/** Live elapsed seconds including the current wall-clock run segment. */
export function liveTimerElapsedSeconds(
  timer: FocusTimer,
  nowMs: number = Date.now(),
): number {
  const base = Math.max(0, Math.floor(timer.elapsedSeconds ?? 0))
  if (timer.runningStartedAtMs == null) return base
  const added = Math.max(
    0,
    Math.floor((nowMs - timer.runningStartedAtMs) / 1000),
  )
  return base + added
}

/** Uncommitted wall-clock seconds for the current run segment. */
export function timerRunSegmentSeconds(
  timer: FocusTimer,
  nowMs: number = Date.now(),
): number {
  if (timer.runningStartedAtMs == null) return 0
  return Math.max(0, Math.floor((nowMs - timer.runningStartedAtMs) / 1000))
}

/** Human-readable duration for long-run review copy (e.g. `3h 12m`). */
export function formatDurationHoursMinutes(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const mins = Math.floor((safe % 3600) / 60)
  if (hours <= 0) return `${mins}m`
  if (mins <= 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function shouldOfferLongRunReview(segmentSeconds: number): boolean {
  return segmentSeconds >= LONG_RUN_REVIEW_SECONDS
}

/**
 * Fold wall-clock run time into elapsedSeconds.
 * When `stop` is true, clears runningStartedAtMs (pause).
 * Otherwise advances the run anchor by whole seconds accrued (tick / catch-up).
 */
export function commitTimerRunProgress(
  timer: FocusTimer,
  nowMs: number = Date.now(),
  options: { stop?: boolean } = {},
): FocusTimer {
  if (timer.runningStartedAtMs == null) return timer
  const startedAt = timer.runningStartedAtMs
  const added = Math.max(0, Math.floor((nowMs - startedAt) / 1000))
  if (options.stop) {
    return {
      ...timer,
      elapsedSeconds: Math.max(0, timer.elapsedSeconds ?? 0) + added,
      runningStartedAtMs: null,
    }
  }
  if (added < 1) return timer
  return {
    ...timer,
    elapsedSeconds: Math.max(0, timer.elapsedSeconds ?? 0) + added,
    // Keep sub-second remainder so long catch-ups stay accurate.
    runningStartedAtMs: startedAt + added * 1000,
  }
}

/** Id of the timer currently running, if any (at most one). */
export function runningFocusTimerId(timers: FocusTimer[]): string | null {
  const running = timers.find((t) => t.runningStartedAtMs != null)
  return running?.id ?? null
}
