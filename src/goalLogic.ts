import type { AppState, Goal, Task } from './types'

/** Synthetic id for the goals-view Unassigned bubble (not persisted). */
export const UNASSIGNED_GOAL_ID = 'unassigned'

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

/** Recurring tasks that are not linked to any goal. */
export function unassignedRecurringTasks(state: AppState): Task[] {
  const assigned = new Set(state.goals.flatMap((goal) => goal.taskIds))
  return state.tasks.filter(
    (task) => task.repetition !== 'none' && !assigned.has(task.id),
  )
}

/** True if any unassigned recurring task was completed on dateKey. */
export function unassignedProgressedOnDate(
  tasks: Task[],
  dateKey: string,
): boolean {
  return tasks.some((task) => Boolean(task.completions[dateKey]))
}
