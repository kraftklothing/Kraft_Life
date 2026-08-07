import type { PointerEvent as ReactPointerEvent } from 'react'
import {
  formatCountdown,
  formatEstimatedFinishMst,
  remainingMaxSeconds,
  routineTotalSeconds,
  sortedRoutineSteps,
  stepTitle,
} from './routineLogic'
import type { Routine, RoutineStep, Task } from './types'

function BarsIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
      <rect x="0" y="0" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="5.75" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="11.5" width="18" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M11.5 3.5 14.5 6.5M3 15l.8-3.2L12.7 3l3 3L6.2 15.5 3 15Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6 4.5v9l8-4.5-8-4.5Z" fill="currentColor" />
    </svg>
  )
}

export interface ActiveRoutineRun {
  routineId: string
  stepIndex: number
  remainingSeconds: number
  /** Step ids completed (not skipped). */
  completedStepIds: string[]
  /** Step ids skipped. */
  skippedStepIds: string[]
}

interface RoutinesViewProps {
  routines: Routine[]
  tasks: Task[]
  activeRoutineId: string | null
  onSelectRoutine: (id: string | null) => void
  onEditRoutine: (routine: Routine) => void
  onEditStep: (step: RoutineStep) => void
  onStartRoutine: (routineId: string) => void
  onBeginRoutineDrag: (routineId: string, clientY: number) => void
  onBeginStepDrag: (
    routineId: string,
    stepId: string,
    clientY: number,
  ) => void
  draggingRoutineId: string | null
  draggingStepId: string | null
  activeRun: ActiveRoutineRun | null
  onCompleteStep: () => void
  onSkipStep: () => void
  onExitRun: () => void
  nowMs: number
}

export default function RoutinesView({
  routines,
  tasks,
  activeRoutineId,
  onSelectRoutine,
  onEditRoutine,
  onEditStep,
  onStartRoutine,
  onBeginRoutineDrag,
  onBeginStepDrag,
  draggingRoutineId,
  draggingStepId,
  activeRun,
  onCompleteStep,
  onSkipStep,
  onExitRun,
  nowMs,
}: RoutinesViewProps) {
  const sortedRoutines = [...routines].sort((a, b) => a.order - b.order)
  const activeRoutine =
    sortedRoutines.find((r) => r.id === activeRoutineId) ?? null
  const runningRoutine =
    activeRun != null
      ? sortedRoutines.find((r) => r.id === activeRun.routineId) ?? null
      : null

  if (activeRun && runningRoutine) {
    const steps = sortedRoutineSteps(runningRoutine)
    const current = steps[activeRun.stepIndex] ?? null
    const title = current ? stepTitle(current, tasks) : 'Done'
    const estSeconds = remainingMaxSeconds(
      runningRoutine,
      activeRun.stepIndex,
      activeRun.remainingSeconds,
    )
    const estLabel = formatEstimatedFinishMst(estSeconds, nowMs)
    const progressLabel = current
      ? `Step ${activeRun.stepIndex + 1} of ${steps.length}`
      : 'Routine complete'

    return (
      <section className="day-pane routines-pane" aria-label="Routine in progress">
        <div className="day-header">
          <div className="day-label-row projects-title-row">
            <button
              type="button"
              className="day-nav-btn"
              aria-label="Exit routine"
              onClick={onExitRun}
            >
              ‹
            </button>
            <p className="day-label">{runningRoutine.name}</p>
            <span className="day-nav-spacer" aria-hidden="true" />
          </div>
          <div className="day-divider" aria-hidden="true" />
        </div>

        <div className="panel routine-run-panel">
          <p className="routine-run-progress">{progressLabel}</p>
          {current ? (
            <>
              <h2 className="routine-run-title">{title}</h2>
              <p
                className={`routine-run-countdown${
                  activeRun.remainingSeconds === 0 ? ' routine-run-countdown-done' : ''
                }`}
                aria-live="polite"
              >
                {formatCountdown(activeRun.remainingSeconds)}
              </p>
              <p className="routine-run-estimate">
                Est. done · {estLabel}
              </p>
              {current.kind === 'custom' ? (
                <p className="muted routine-run-hint">
                  Custom step — no task money.
                </p>
              ) : (
                <p className="muted routine-run-hint">
                  Completing marks this off in Tasks when it applies today.
                </p>
              )}
              <div className="routine-run-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onCompleteStep}
                >
                  Completed
                </button>
                <button type="button" className="btn" onClick={onSkipStep}>
                  Skip
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="routine-run-title">All done</h2>
              <p className="muted routine-run-hint">
                {activeRun.skippedStepIds.length === 0
                  ? runningRoutine.completionReward > 0
                    ? `You finished every step — +$${runningRoutine.completionReward}.`
                    : 'You finished every step.'
                  : 'Some steps were skipped — no full-routine reward.'}
              </p>
              <div className="routine-run-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onExitRun}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="day-pane routines-pane" aria-label="Routines">
      <div className="day-header">
        <div className="day-label-row projects-title-row">
          {activeRoutine ? (
            <button
              type="button"
              className="day-nav-btn"
              aria-label="Back to all routines"
              onClick={() => onSelectRoutine(null)}
            >
              ‹
            </button>
          ) : (
            <span className="day-nav-spacer" aria-hidden="true" />
          )}
          <p className="day-label">
            {activeRoutine ? activeRoutine.name : 'Routines'}
          </p>
          <span className="day-nav-spacer" aria-hidden="true" />
        </div>
        <div className="day-divider" aria-hidden="true" />
      </div>

      {!activeRoutine ? (
        sortedRoutines.length === 0 ? (
          <div className="panel empty">
            <h2>No routines yet</h2>
            <p>
              Tap the plus to build a daily checklist with timed steps.
            </p>
          </div>
        ) : (
          <div className="task-groups">
            <section className="task-group" aria-label="Your routines">
              <h2 className="category-heading">Your routines</h2>
              <p className="muted reorder-hint view-hint">
                Drag the bars to reorder. Tap a routine to edit steps or start
                it.
              </p>
              <ul className="task-list">
                {sortedRoutines.map((routine) => {
                  const total = routine.steps.length
                  const seconds = routineTotalSeconds(routine)
                  return (
                    <li
                      key={routine.id}
                      className={`task-item project-item${
                        draggingRoutineId === routine.id ? ' dragging' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="drag-handle"
                        aria-label="Reorder routine"
                        onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                          event.preventDefault()
                          event.stopPropagation()
                          event.currentTarget.setPointerCapture?.(
                            event.pointerId,
                          )
                          onBeginRoutineDrag(routine.id, event.clientY)
                        }}
                      >
                        <BarsIcon />
                      </button>
                      <button
                        type="button"
                        className="project-main-btn"
                        onClick={() => onSelectRoutine(routine.id)}
                      >
                        <p className="task-title">{routine.name}</p>
                        <div className="badges">
                          <span className="badge rep">
                            {total === 0
                              ? 'No steps yet'
                              : `${total} step${total === 1 ? '' : 's'} · ${formatCountdown(seconds)}`}
                          </span>
                          {routine.completionReward > 0 ? (
                            <span className="badge">
                              +${routine.completionReward} if all done
                            </span>
                          ) : null}
                        </div>
                      </button>
                      <div className="task-actions">
                        {total > 0 ? (
                          <button
                            type="button"
                            className="edit-btn"
                            aria-label="Start routine"
                            onClick={() => onStartRoutine(routine.id)}
                          >
                            <PlayIcon />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="edit-btn"
                          aria-label="Edit routine"
                          onClick={() => onEditRoutine(routine)}
                        >
                          <PencilIcon />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </div>
        )
      ) : activeRoutine.steps.length === 0 ? (
        <div className="panel empty">
          <h2>No steps yet</h2>
          <p>
            Tap the plus to add a linked task or a custom step with a countdown.
          </p>
          <div className="routine-detail-meta">
            <p className="muted view-hint">
              Full-routine reward:{' '}
              {activeRoutine.completionReward > 0
                ? `$${activeRoutine.completionReward}`
                : 'none'}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onEditRoutine(activeRoutine)}
            >
              Edit routine
            </button>
          </div>
        </div>
      ) : (
        <div className="task-groups">
          <section className="task-group" aria-label="Routine steps">
            <div className="routine-detail-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onStartRoutine(activeRoutine.id)}
              >
                Start routine
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => onEditRoutine(activeRoutine)}
              >
                Edit routine
              </button>
            </div>
            <p className="muted reorder-hint view-hint">
              Drag to set the order. Linked tasks mark off in Tasks when you
              complete them here. Custom steps never earn task money. Finish
              every step (no skips) for the +$
              {activeRoutine.completionReward} routine reward.
            </p>
            <h2 className="category-heading">Steps</h2>
            <ul className="task-list">
              {sortedRoutineSteps(activeRoutine).map((step) => (
                <li
                  key={step.id}
                  className={`task-item${
                    draggingStepId === step.id ? ' dragging' : ''
                  }`}
                >
                  <div className="task-body">
                    <p className="task-title">{stepTitle(step, tasks)}</p>
                    <div className="badges">
                      <span className="badge">
                        {formatCountdown(step.durationSeconds)}
                      </span>
                      <span className="badge rep">
                        {step.kind === 'task' ? 'Task' : 'Custom · no $'}
                      </span>
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      type="button"
                      className="edit-btn"
                      aria-label="Edit step"
                      onClick={() => onEditStep(step)}
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      className="drag-handle"
                      aria-label="Reorder step"
                      onPointerDown={(event: ReactPointerEvent<HTMLButtonElement>) => {
                        event.preventDefault()
                        event.stopPropagation()
                        event.currentTarget.setPointerCapture?.(
                          event.pointerId,
                        )
                        onBeginStepDrag(
                          activeRoutine.id,
                          step.id,
                          event.clientY,
                        )
                      }}
                    >
                      <BarsIcon />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </section>
  )
}
