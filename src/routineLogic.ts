import type { Routine, RoutineStep, Task } from './types'

/** Format seconds as MM:SS for routine countdowns. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/** Total planned duration of a routine (sum of step durations). */
export function routineTotalSeconds(routine: Routine): number {
  return routine.steps.reduce((sum, step) => sum + Math.max(0, step.durationSeconds), 0)
}

/**
 * Remaining max-time seconds: current step's remaining countdown plus
 * full duration of every later step.
 */
export function remainingMaxSeconds(
  routine: Routine,
  stepIndex: number,
  currentRemainingSeconds: number,
): number {
  const steps = [...routine.steps].sort((a, b) => a.order - b.order)
  let total = Math.max(0, currentRemainingSeconds)
  for (let i = stepIndex + 1; i < steps.length; i += 1) {
    total += Math.max(0, steps[i]!.durationSeconds)
  }
  return total
}

/**
 * Estimated finish clock time in America/Denver (MST/MDT),
 * assuming max time is taken for every remaining step.
 */
export function formatEstimatedFinishMst(
  remainingSeconds: number,
  nowMs: number = Date.now(),
): string {
  const finish = new Date(nowMs + Math.max(0, remainingSeconds) * 1000)
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(finish)
  return formatted
}

export function sortedRoutineSteps(routine: Routine): RoutineStep[] {
  return [...routine.steps].sort((a, b) => a.order - b.order)
}

export function stepTitle(step: RoutineStep, tasks: Task[]): string {
  if (step.kind === 'custom') return step.title
  const task = tasks.find((t) => t.id === step.taskId)
  return task?.title ?? 'Missing task'
}

export function parseDurationFields(
  minutesRaw: string,
  secondsRaw: string,
): number | null {
  const minutes = Number(minutesRaw)
  const seconds = Number(secondsRaw)
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null
  if (minutes < 0 || seconds < 0 || seconds > 59) return null
  const total = Math.floor(minutes) * 60 + Math.floor(seconds)
  if (total < 1) return null
  return total
}

export function durationToFields(durationSeconds: number): {
  minutes: string
  seconds: string
} {
  const safe = Math.max(0, Math.floor(durationSeconds))
  return {
    minutes: String(Math.floor(safe / 60)),
    seconds: String(safe % 60),
  }
}
