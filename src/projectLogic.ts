import type { Project, ProjectStep, ProjectStepRepetition } from './types'

export function stepRepetition(step: ProjectStep): ProjectStepRepetition {
  return step.repetition === 'daily' ? 'daily' : 'none'
}

export function stepRepeats(step: ProjectStep): boolean {
  return stepRepetition(step) !== 'none'
}

/**
 * Whether a step counts as done for a given local date.
 * One-shot steps use the permanent `completed` flag; daily steps only count
 * when they were completed on that date.
 */
export function stepCompleteForDate(
  step: ProjectStep,
  dateKey: string,
): boolean {
  if (stepRepetition(step) === 'daily') {
    return Boolean(step.completed && step.completedOn === dateKey)
  }
  return Boolean(step.completed)
}

/** First incomplete step in order for dateKey, or null when none left. */
export function nextIncompleteStep(
  project: Project,
  dateKey: string,
): ProjectStep | null {
  return (
    [...project.steps]
      .sort((a, b) => a.order - b.order)
      .find((step) => !stepCompleteForDate(step, dateKey)) ?? null
  )
}
