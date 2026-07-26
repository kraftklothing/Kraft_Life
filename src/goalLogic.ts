import type { AppState, Goal } from './types'

/** True if any linked task or project step was progressed on dateKey. */
export function goalProgressedOnDate(
  goal: Goal,
  state: AppState,
  dateKey: string,
): boolean {
  for (const taskId of goal.taskIds) {
    const task = state.tasks.find((t) => t.id === taskId)
    if (task?.completions[dateKey]) return true
  }

  for (const projectId of goal.projectIds) {
    const project = state.projects.find((p) => p.id === projectId)
    if (!project) continue
    if (project.steps.some((step) => step.completed && step.completedOn === dateKey)) {
      return true
    }
  }

  return false
}
