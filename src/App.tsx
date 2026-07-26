import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { addDays, formatDayHeading, toDateKey } from './dates'
import { loadState, saveState } from './storage'
import { isCompletedOn, sortTasksForDay, taskAppliesOnDate } from './taskLogic'
import {
  REPETITION_LABELS,
  type AppState,
  type Category,
  type Repetition,
  type Reward,
  type Task,
} from './types'

function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function BarsIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
      <rect x="0" y="0" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="5.75" width="18" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="0" y="11.5" width="18" height="2.5" rx="1.25" fill="currentColor" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <path
        d="M14 6v16M6 14h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GiftIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 10h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M3 10h18V8a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v2Z" stroke="currentColor" strokeWidth="2" />
      <path d="M12 7v15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M12 7c-1.8-2.8-4.8-2.8-5.5-1.2C5.7 7.2 7.4 9 12 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 7c1.8-2.8 4.8-2.8 5.5-1.2C18.3 7.2 16.6 9 12 7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlaneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10.5 12.5 3 10l1-2 7.5 1.5L17 3l2 1-3.5 8.5L22 15l-1 2-7.5-2.5L10 21l-2-1 2.5-7.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path
        d="M2.5 7.2 5.6 10.2 11.5 3.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState())
  const [viewDate, setViewDate] = useState(() => startToday())
  const [title, setTitle] = useState('')
  const [repetition, setRepetition] = useState<Repetition | ''>('')
  const [customEveryDays, setCustomEveryDays] = useState('2')
  const [categoryId, setCategoryId] = useState('')
  const [addError, setAddError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [rewardsOpen, setRewardsOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newRewardName, setNewRewardName] = useState('')
  const [newRewardCost, setNewRewardCost] = useState('5')
  const [toast, setToast] = useState('')
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [dayAnim, setDayAnim] = useState<'none' | 'from-left' | 'from-right'>(
    'none',
  )

  const formId = useId()
  const titleInputRef = useRef<HTMLInputElement>(null)
  const swipeRef = useRef<{
    x: number
    y: number
    active: boolean
    locked: 'x' | 'y' | null
    pointerId: number | null
  } | null>(null)
  const dayPaneRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<{
    id: string
    startY: number
    orderSnapshot: string[]
  } | null>(null)

  const todayKey = toDateKey(startToday())
  const viewKey = toDateKey(viewDate)
  const vacationOn = Boolean(state.vacationDays[viewKey])

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const dayTasks = useMemo(() => {
    const applicable = state.tasks.filter((task) => taskAppliesOnDate(task, viewKey))
    return sortTasksForDay(applicable)
  }, [state.tasks, viewKey])

  const completedCount = dayTasks.filter((t) => isCompletedOn(t, viewKey)).length
  const remainingCount = dayTasks.length - completedCount
  const percent =
    dayTasks.length === 0 ? 0 : Math.round((completedCount / dayTasks.length) * 100)

  const categoryName = (id: string) =>
    state.categories.find((c) => c.id === id)?.name ?? 'General'

  function updateState(updater: (prev: AppState) => AppState) {
    setState((prev) => updater(prev))
  }

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    event.stopPropagation()

    const trimmed = title.trim()
    if (!trimmed) {
      setAddError('Enter a task name.')
      titleInputRef.current?.focus()
      return
    }
    if (!repetition) {
      setAddError('Choose how often this repeats.')
      return
    }
    if (!categoryId) {
      setAddError('Choose a category.')
      return
    }
    if (!state.categories.some((c) => c.id === categoryId)) {
      setAddError('That category no longer exists. Pick another.')
      return
    }

    let customRepeat: Task['customRepeat']
    if (repetition === 'custom') {
      const every = Number.parseInt(customEveryDays, 10)
      if (!Number.isFinite(every) || every < 1) {
        setAddError('Custom repeat needs a number of days (1 or more).')
        return
      }
      customRepeat = { everyDays: every }
    }

    const maxOrder = dayTasks.reduce((max, t) => Math.max(max, t.order), -1)
    const task: Task = {
      id: uid('task'),
      title: trimmed,
      categoryId,
      repetition,
      customRepeat,
      startDate: viewKey,
      completions: {},
      order: maxOrder + 1,
      createdAt: Date.now(),
    }

    updateState((prev) => ({ ...prev, tasks: [...prev.tasks, task] }))
    setTitle('')
    setRepetition('')
    setCategoryId('')
    setCustomEveryDays('2')
    setAddError('')
    setAddOpen(false)
    setToast('Task added')
  }

  function openAddComposer() {
    setRewardsOpen(false)
    setAddOpen(true)
    setAddError('')
    window.setTimeout(() => titleInputRef.current?.focus(), 80)
  }

  function closeAddComposer() {
    setAddOpen(false)
    setAddError('')
  }

  function toggleComplete(taskId: string) {
    updateState((prev) => {
      let dollars = prev.dollars
      const tasks = prev.tasks.map((task) => {
        if (task.id !== taskId) return task
        const currently = Boolean(task.completions[viewKey])
        const nextCompletions = { ...task.completions }
        if (currently) {
          delete nextCompletions[viewKey]
        } else {
          nextCompletions[viewKey] = true
          dollars += 1
        }
        return { ...task, completions: nextCompletions }
      })
      return { ...prev, tasks, dollars }
    })
  }

  function toggleVacationMode() {
    updateState((prev) => {
      const next = { ...prev.vacationDays }
      if (next[viewKey]) delete next[viewKey]
      else next[viewKey] = true
      return { ...prev, vacationDays: next }
    })
  }

  function spendReward(reward: Reward) {
    if (state.dollars < reward.cost) {
      setToast(`Need $${reward.cost}`)
      return
    }
    updateState((prev) => ({
      ...prev,
      dollars: prev.dollars - reward.cost,
    }))
    setToast(`Spent $${reward.cost} on ${reward.name}`)
  }

  function addReward() {
    const name = newRewardName.trim()
    const cost = Number.parseInt(newRewardCost, 10)
    if (!name) {
      setToast('Name your reward')
      return
    }
    if (!Number.isFinite(cost) || cost < 1) {
      setToast('Cost must be at least $1')
      return
    }
    const reward: Reward = { id: uid('reward'), name, cost }
    updateState((prev) => ({ ...prev, rewards: [...prev.rewards, reward] }))
    setNewRewardName('')
    setNewRewardCost('5')
    setToast('Reward added')
  }

  function deleteReward(id: string) {
    updateState((prev) => ({
      ...prev,
      rewards: prev.rewards.filter((r) => r.id !== id),
    }))
  }

  function addCategory() {
    const name = newCategory.trim()
    if (!name) return
    if (state.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      setToast('Category already exists')
      return
    }
    const cat: Category = { id: uid('cat'), name, builtin: false }
    updateState((prev) => ({ ...prev, categories: [...prev.categories, cat] }))
    setNewCategory('')
    setToast('Category added')
  }

  function deleteCategory(id: string) {
    const cat = state.categories.find((c) => c.id === id)
    if (!cat || cat.builtin) return
    updateState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      tasks: prev.tasks.map((t) =>
        t.categoryId === id ? { ...t, categoryId: 'general' } : t,
      ),
    }))
    if (categoryId === id) setCategoryId('general')
    setToast('Category removed')
  }

  function goToDay(delta: number) {
    if (delta === 0) return
    setDayAnim(delta > 0 ? 'from-right' : 'from-left')
    setViewDate((d) => addDays(d, delta))
    setSwipeOffset(0)
  }

  function isInteractiveTarget(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    return Boolean(
      target.closest(
        'button, a, input, select, textarea, label, .drag-handle, .add-panel, .composer',
      ),
    )
  }

  function onDayPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (categoriesOpen || rewardsOpen || addOpen || dragRef.current) return
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (isInteractiveTarget(event.target)) return
    swipeRef.current = {
      x: event.clientX,
      y: event.clientY,
      active: true,
      locked: null,
      pointerId: event.pointerId,
    }
    setDayAnim('none')
  }

  function onDayPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeRef.current
    if (!start?.active || start.pointerId !== event.pointerId || dragRef.current) {
      return
    }

    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (!start.locked) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
      start.locked = Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y'
      if (start.locked === 'x') {
        dayPaneRef.current?.setPointerCapture?.(event.pointerId)
      }
    }

    if (start.locked !== 'x') return
    event.preventDefault()
    const dampened = Math.max(-140, Math.min(140, dx * 0.85))
    setSwipeOffset(dampened)
  }

  function finishDaySwipe(clientX: number, pointerId: number) {
    const start = swipeRef.current
    swipeRef.current = null
    if (!start?.active || start.pointerId !== pointerId || dragRef.current) {
      setSwipeOffset(0)
      return
    }
    if (start.locked !== 'x') {
      setSwipeOffset(0)
      return
    }

    const dx = clientX - start.x
    const threshold = 56
    if (dx <= -threshold) goToDay(1)
    else if (dx >= threshold) goToDay(-1)
    else setSwipeOffset(0)
  }

  function beginDrag(taskId: string, clientY: number) {
    dragRef.current = {
      id: taskId,
      startY: clientY,
      orderSnapshot: dayTasks.map((t) => t.id),
    }
    setDraggingId(taskId)
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      event.preventDefault()

      const delta = event.clientY - drag.startY
      const rowHeight = 72
      const from = drag.orderSnapshot.indexOf(drag.id)
      if (from < 0) return
      let to = from + Math.round(delta / rowHeight)
      to = Math.max(0, Math.min(drag.orderSnapshot.length - 1, to))
      if (to === from) return

      const nextOrder = [...drag.orderSnapshot]
      const [moved] = nextOrder.splice(from, 1)
      nextOrder.splice(to, 0, moved)
      drag.orderSnapshot = nextOrder
      drag.startY = event.clientY

      setState((prev) => {
        const orderMap = new Map(nextOrder.map((id, index) => [id, index]))
        return {
          ...prev,
          tasks: prev.tasks.map((task) =>
            orderMap.has(task.id)
              ? { ...task, order: orderMap.get(task.id)! }
              : task,
          ),
        }
      })
    }
    function onUp() {
      if (!dragRef.current) return
      dragRef.current = null
      setDraggingId(null)
    }
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [])

  return (
    <div className={`app${vacationOn ? ' vacation-day' : ''}`}>
      <header className="top-bar">
        <button
          type="button"
          className="stat-chip"
          onClick={() =>
            updateState((prev) => ({ ...prev, showPercent: !prev.showPercent }))
          }
          aria-label={
            state.showPercent
              ? 'Show completed and remaining counts'
              : 'Show percent complete'
          }
        >
          {state.showPercent
            ? `${percent}% complete`
            : `${completedCount} done · ${remainingCount} left`}
        </button>
        <button
          type="button"
          className="dollar-chip"
          aria-label={`${state.dollars} dollars — open rewards`}
          onClick={() => {
            setAddOpen(false)
            setRewardsOpen(true)
          }}
        >
          ${state.dollars}
        </button>
      </header>

      <div className="brand-block">
        <h1 className="brand">Kraft Life</h1>
      </div>

      <section
        key={viewKey}
        ref={dayPaneRef}
        className={`day-pane${dayAnim !== 'none' ? ` day-pane-${dayAnim}` : ''}${
          swipeOffset !== 0 ? ' day-pane-dragging' : ''
        }`}
        aria-label="Tasks for selected day"
        onPointerDown={onDayPointerDown}
        onPointerMove={onDayPointerMove}
        onPointerUp={(e) => finishDaySwipe(e.clientX, e.pointerId)}
        onPointerCancel={(e) => {
          if (swipeRef.current?.pointerId === e.pointerId) {
            swipeRef.current = null
            setSwipeOffset(0)
          }
        }}
        style={
          swipeOffset !== 0
            ? { transform: `translateX(${swipeOffset}px)` }
            : undefined
        }
      >
        <div className="day-header">
          <div className="day-nav">
            <button
              type="button"
              className="day-nav-btn"
              aria-label="Previous day"
              onClick={() => goToDay(-1)}
            >
              ‹
            </button>
            <div className="day-label-row">
              <p className="day-label">{formatDayHeading(viewDate, todayKey)}</p>
              <button
                type="button"
                className={`plane-btn${vacationOn ? ' active' : ''}`}
                aria-label={
                  vacationOn ? 'Turn off vacation mode' : 'Turn on vacation mode'
                }
                aria-pressed={vacationOn}
                onClick={toggleVacationMode}
              >
                <PlaneIcon />
              </button>
            </div>
            <button
              type="button"
              className="day-nav-btn"
              aria-label="Next day"
              onClick={() => goToDay(1)}
            >
              ›
            </button>
          </div>
        </div>

        {vacationOn ? <p className="vacation-banner">Vacation mode</p> : null}

        {dayTasks.length === 0 ? (
          <div className="panel empty">
            <h2>Nothing listed yet</h2>
            <p>
              Tap the green plus at the bottom to add what you want to finish{' '}
              {viewKey === todayKey ? 'today' : 'this day'}.
            </p>
          </div>
        ) : (
          <ul className="task-list">
            {dayTasks.map((task) => {
              const done = isCompletedOn(task, viewKey)
              return (
                <li
                  key={task.id}
                  className={`task-item${done ? ' completed' : ''}${
                    draggingId === task.id ? ' dragging' : ''
                  }${vacationOn ? ' vacation' : ''}`}
                >
                  <button
                    type="button"
                    className="check"
                    aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                    onClick={() => toggleComplete(task.id)}
                  >
                    <CheckIcon />
                  </button>
                  <div className="task-body">
                    <p className="task-title">{task.title}</p>
                    <div className="badges">
                      <span className="badge rep">
                        {REPETITION_LABELS[task.repetition]}
                        {task.repetition === 'custom' && task.customRepeat
                          ? ` · every ${task.customRepeat.everyDays}d`
                          : ''}
                      </span>
                      <span className="badge">{categoryName(task.categoryId)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="drag-handle"
                    aria-label="Reorder task"
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      swipeRef.current = null
                      setSwipeOffset(0)
                      event.currentTarget.setPointerCapture?.(event.pointerId)
                      beginDrag(task.id, event.clientY)
                    }}
                  >
                    <BarsIcon />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className={`composer${addOpen ? ' composer-open' : ''}`}>
        {!addOpen ? (
          <div className="composer-collapsed">
            <button
              type="button"
              className="circle-btn plus-btn"
              aria-label="New task"
              onClick={openAddComposer}
            >
              <PlusIcon />
            </button>
            <button
              type="button"
              className="circle-btn gift-btn"
              aria-label="Open rewards"
              onClick={() => {
                setAddOpen(false)
                setRewardsOpen(true)
              }}
            >
              <GiftIcon />
            </button>
          </div>
        ) : (
          <form
            className="panel add-panel"
            onSubmit={handleAddTask}
            id={formId}
            noValidate
          >
            <div className="composer-header">
              <h2>New task</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close new task"
                onClick={closeAddComposer}
              >
                ✕
              </button>
            </div>

            <label htmlFor={`${formId}-title`}>
              What do you want to complete?
              <input
                ref={titleInputRef}
                id={`${formId}-title`}
                name="title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (addError) setAddError('')
                }}
                placeholder="Add a task for this day"
                autoComplete="off"
                enterKeyHint="done"
              />
            </label>

            <div className="field-row">
              <label htmlFor={`${formId}-rep`}>
                Repetition
                <select
                  id={`${formId}-rep`}
                  name="repetition"
                  value={repetition}
                  onChange={(e) => {
                    setRepetition(e.target.value as Repetition | '')
                    if (addError) setAddError('')
                  }}
                  required
                >
                  <option value="" disabled>
                    Choose repetition
                  </option>
                  {(Object.keys(REPETITION_LABELS) as Repetition[]).map((key) => (
                    <option key={key} value={key}>
                      {REPETITION_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>

              <label htmlFor={`${formId}-cat`}>
                Category
                <select
                  id={`${formId}-cat`}
                  name="category"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value)
                    if (addError) setAddError('')
                  }}
                  required
                >
                  <option value="" disabled>
                    Choose category
                  </option>
                  {state.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {repetition === 'custom' && (
              <label htmlFor={`${formId}-custom`}>
                Repeat every N days
                <input
                  id={`${formId}-custom`}
                  name="customEveryDays"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={customEveryDays}
                  onChange={(e) => setCustomEveryDays(e.target.value)}
                />
              </label>
            )}

            {addError ? <p className="error-text">{addError}</p> : null}

            <div className="add-actions">
              <button type="submit" className="btn btn-primary">
                Add task
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCategoriesOpen(true)}
              >
                Categories
              </button>
            </div>
          </form>
        )}
      </div>

      {rewardsOpen ? (
        <div
          className="overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRewardsOpen(false)
          }}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Rewards"
          >
            <div className="sheet-header">
              <h2>Rewards</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close rewards"
                onClick={() => setRewardsOpen(false)}
              >
                ✕
              </button>
            </div>

            <p className="rewards-balance">
              Balance: <strong>${state.dollars}</strong>
            </p>

            <div className="settings-section">
              <h3>Spend</h3>
              {state.rewards.length === 0 ? (
                <p className="muted">No rewards yet — add one below.</p>
              ) : (
                state.rewards.map((reward) => (
                  <div className="reward-row" key={reward.id}>
                    <div>
                      <strong>{reward.name}</strong>
                      <span className="reward-cost">${reward.cost}</span>
                    </div>
                    <div className="reward-actions">
                      <button
                        type="button"
                        className="btn btn-primary spend-btn"
                        disabled={state.dollars < reward.cost}
                        onClick={() => spendReward(reward)}
                      >
                        Spend
                      </button>
                      <button
                        type="button"
                        className="danger-btn"
                        onClick={() => deleteReward(reward.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="settings-section">
              <h3>Add reward</h3>
              <div className="inline-add reward-add">
                <input
                  value={newRewardName}
                  onChange={(e) => setNewRewardName(e.target.value)}
                  placeholder="Reward name"
                />
                <input
                  className="cost-input"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={newRewardCost}
                  onChange={(e) => setNewRewardCost(e.target.value)}
                  aria-label="Cost in dollars"
                />
                <button type="button" className="btn btn-primary" onClick={addReward}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {categoriesOpen ? (
        <div
          className="overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCategoriesOpen(false)
          }}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Categories"
          >
            <div className="sheet-header">
              <h2>Categories</h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close categories"
                onClick={() => setCategoriesOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="settings-section">
              {state.categories.map((cat) => (
                <div className="category-row" key={cat.id}>
                  <span>
                    {cat.name}
                    {cat.builtin ? ' (default)' : ''}
                  </span>
                  {!cat.builtin ? (
                    <button
                      type="button"
                      className="danger-btn"
                      onClick={() => deleteCategory(cat.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ))}
              <div className="inline-add">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Custom category"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addCategory()
                    }
                  }}
                />
                <button type="button" className="btn btn-primary" onClick={addCategory}>
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  )
}

function startToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
