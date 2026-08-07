import type { Project, ProjectStep } from './types'

/** First incomplete step in order, or null when there are none left. */
export function nextIncompleteStep(project: Project): ProjectStep | null {
  return (
    [...project.steps]
      .sort((a, b) => a.order - b.order)
      .find((step) => !step.completed) ?? null
  )
}
