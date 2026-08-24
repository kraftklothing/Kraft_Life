import { useMemo, useState } from 'react'
import { addDays, parseDateKey, toDateKey } from './dates'
import type { DollarLedgerEntry, SpendingEntry, Task } from './types'

export type SummaryRangeUnit = 'days' | 'months' | 'years'

const RANGE_PRESETS: Record<SummaryRangeUnit, number[]> = {
  days: [7, 14, 30, 90],
  months: [1, 3, 6, 12],
  years: [1, 2, 3, 5],
}

const RANGE_DEFAULTS: Record<SummaryRangeUnit, number> = {
  days: 14,
  months: 3,
  years: 1,
}

const RANGE_MAX: Record<SummaryRangeUnit, number> = {
  days: 365,
  months: 36,
  years: 10,
}

const UNIT_LABELS: Record<SummaryRangeUnit, { singular: string; plural: string }> =
  {
    days: { singular: 'day', plural: 'days' },
    months: { singular: 'month', plural: 'months' },
    years: { singular: 'year', plural: 'years' },
  }

export interface DailyPoint {
  dateKey: string
  label: string
  value: number
}

export interface SummaryChartSeries {
  id: string
  title: string
  unit: 'count' | 'dollars'
  points: DailyPoint[]
  average: number
  windowLabel: string
}

function clampAmount(unit: SummaryRangeUnit, amount: number): number {
  const safe = Number.isFinite(amount) ? Math.floor(amount) : 1
  return Math.min(RANGE_MAX[unit], Math.max(1, safe))
}

function rangeWindowLabel(unit: SummaryRangeUnit, amount: number): string {
  const labels = UNIT_LABELS[unit]
  const word = amount === 1 ? labels.singular : labels.plural
  return `Last ${amount} ${word}`
}

/** Inclusive day keys from start through end (local dates). */
function dayKeysInclusive(start: Date, end: Date): string[] {
  const keys: string[] = []
  let cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cursor <= last) {
    keys.push(toDateKey(cursor))
    cursor = addDays(cursor, 1)
  }
  return keys
}

function recentDayKeys(end: Date, count: number): string[] {
  return dayKeysInclusive(addDays(end, -(count - 1)), end)
}

function monthKeyFromDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseMonthKey(monthKey: string): Date {
  const [yearRaw, monthRaw] = monthKey.split('-').map(Number)
  return new Date(yearRaw || 1970, (monthRaw || 1) - 1, 1)
}

function shiftMonthDate(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

function recentMonthKeys(end: Date, count: number): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(monthKeyFromDate(shiftMonthDate(end, -i)))
  }
  return keys
}

function recentYearKeys(end: Date, count: number): number[] {
  const years: number[] = []
  const endYear = end.getFullYear()
  for (let i = count - 1; i >= 0; i -= 1) {
    years.push(endYear - i)
  }
  return years
}

function daysInMonthPeriod(monthKey: string, today: Date): number {
  const start = parseMonthKey(monthKey)
  const next = shiftMonthDate(start, 1)
  const endExclusive = next <= today ? next : addDays(today, 1)
  const last = addDays(endExclusive, -1)
  if (last < start) return 1
  return dayKeysInclusive(start, last).length
}

function daysInYearPeriod(year: number, today: Date): number {
  const start = new Date(year, 0, 1)
  const next = new Date(year + 1, 0, 1)
  const endExclusive = next <= today ? next : addDays(today, 1)
  const last = addDays(endExclusive, -1)
  if (last < start) return 1
  return dayKeysInclusive(start, last).length
}

/** Whole-window daily average from raw day totals. */
function averageDailyFromTotals(
  totalsByDay: Record<string, number>,
  dayKeys: string[],
): number {
  if (dayKeys.length === 0) return 0
  let total = 0
  for (const key of dayKeys) total += totalsByDay[key] ?? 0
  return total / dayKeys.length
}

function formatAverage(value: number, unit: 'count' | 'dollars'): string {
  if (unit === 'dollars') return `$${value.toFixed(2)}`
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function shortDayLabel(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'narrow',
  })
}

function shortMonthLabel(monthKey: string): string {
  return parseMonthKey(monthKey).toLocaleDateString(undefined, {
    month: 'short',
  })
}

function buildTaskTotalsByDay(
  tasks: Task[],
  dayKeys: string[],
): Record<string, number> {
  const byDay: Record<string, number> = Object.fromEntries(
    dayKeys.map((key) => [key, 0]),
  )
  for (const task of tasks) {
    for (const [dateKey, done] of Object.entries(task.completions)) {
      if (!done || !(dateKey in byDay)) continue
      byDay[dateKey] += 1
    }
  }
  return byDay
}

function buildSpendTotalsByDay(
  entries: SpendingEntry[],
  dayKeys: string[],
): Record<string, number> {
  const byDay: Record<string, number> = Object.fromEntries(
    dayKeys.map((key) => [key, 0]),
  )
  for (const entry of entries) {
    if (!(entry.dateKey in byDay)) continue
    byDay[entry.dateKey] += entry.amount
  }
  for (const key of dayKeys) {
    byDay[key] = Math.round((byDay[key] ?? 0) * 100) / 100
  }
  return byDay
}

function buildLedgerTotalsByDay(
  ledger: DollarLedgerEntry[],
  dayKeys: string[],
  kind: 'earned' | 'spent',
): Record<string, number> {
  const byDay: Record<string, number> = Object.fromEntries(
    dayKeys.map((key) => [key, 0]),
  )
  for (const entry of ledger) {
    if (entry.kind !== kind || !(entry.dateKey in byDay)) continue
    byDay[entry.dateKey] += Math.abs(entry.amount)
  }
  for (const key of dayKeys) {
    byDay[key] = Math.round((byDay[key] ?? 0) * 100) / 100
  }
  return byDay
}

function pointsFromDayTotals(
  totalsByDay: Record<string, number>,
  dayKeys: string[],
): DailyPoint[] {
  return dayKeys.map((dateKey) => ({
    dateKey,
    label: shortDayLabel(dateKey),
    value: totalsByDay[dateKey] ?? 0,
  }))
}

function aggregateByMonth(
  totalsByDay: Record<string, number>,
  monthKeys: string[],
  today: Date,
): DailyPoint[] {
  return monthKeys.map((monthKey) => {
    let total = 0
    for (const [dateKey, value] of Object.entries(totalsByDay)) {
      if (!dateKey.startsWith(`${monthKey}-`)) continue
      total += value
    }
    const days = daysInMonthPeriod(monthKey, today)
    return {
      dateKey: `${monthKey}-01`,
      label: shortMonthLabel(monthKey),
      value: Math.round((total / days) * 100) / 100,
    }
  })
}

function aggregateByYear(
  totalsByDay: Record<string, number>,
  years: number[],
  today: Date,
): DailyPoint[] {
  return years.map((year) => {
    const prefix = `${year}-`
    let total = 0
    for (const [dateKey, value] of Object.entries(totalsByDay)) {
      if (!dateKey.startsWith(prefix)) continue
      total += value
    }
    const days = daysInYearPeriod(year, today)
    return {
      dateKey: `${year}-01-01`,
      label: String(year),
      value: Math.round((total / days) * 100) / 100,
    }
  })
}

function buildSeriesPoints(
  totalsByDay: Record<string, number>,
  dayKeys: string[],
  rangeUnit: SummaryRangeUnit,
  today: Date,
  amount: number,
): { points: DailyPoint[]; average: number } {
  const average = averageDailyFromTotals(totalsByDay, dayKeys)
  if (rangeUnit === 'days') {
    return { points: pointsFromDayTotals(totalsByDay, dayKeys), average }
  }
  if (rangeUnit === 'months') {
    return {
      points: aggregateByMonth(totalsByDay, recentMonthKeys(today, amount), today),
      average,
    }
  }
  return {
    points: aggregateByYear(totalsByDay, recentYearKeys(today, amount), today),
    average,
  }
}

function resolveDayKeys(
  today: Date,
  rangeUnit: SummaryRangeUnit,
  amount: number,
): string[] {
  if (rangeUnit === 'days') return recentDayKeys(today, amount)
  if (rangeUnit === 'months') {
    const startMonth = shiftMonthDate(today, -(amount - 1))
    return dayKeysInclusive(startMonth, today)
  }
  const startYear = new Date(today.getFullYear() - (amount - 1), 0, 1)
  return dayKeysInclusive(startYear, today)
}

const LINE_CHART_WIDTH = 280
const LINE_CHART_HEIGHT = 88
const LINE_CHART_PAD_X = 8
const LINE_CHART_PAD_Y = 10
const MAX_DOTS = 40
const MAX_LABELS = 14

function SummaryLineChart({ series }: { series: SummaryChartSeries }) {
  const maxValue = Math.max(...series.points.map((point) => point.value), 0)
  const chartMax = Math.max(maxValue, series.average, 0.0001)
  const count = series.points.length
  const plotWidth = LINE_CHART_WIDTH - LINE_CHART_PAD_X * 2
  const plotHeight = LINE_CHART_HEIGHT - LINE_CHART_PAD_Y * 2
  const showDots = count <= MAX_DOTS
  const labelStep = Math.max(1, Math.ceil(count / MAX_LABELS))

  const coords = series.points.map((point, index) => {
    const x =
      count <= 1
        ? LINE_CHART_WIDTH / 2
        : LINE_CHART_PAD_X + (index / (count - 1)) * plotWidth
    const y =
      LINE_CHART_PAD_Y + plotHeight - (point.value / chartMax) * plotHeight
    return { x, y, point, index }
  })

  const linePath = coords
    .map(
      (coord, index) =>
        `${index === 0 ? 'M' : 'L'}${coord.x.toFixed(2)} ${coord.y.toFixed(2)}`,
    )
    .join(' ')

  const averageY =
    LINE_CHART_PAD_Y + plotHeight - (series.average / chartMax) * plotHeight

  return (
    <section className="task-group summary-chart-card" aria-label={series.title}>
      <div className="summary-chart-header">
        <h2 className="category-heading">{series.title}</h2>
        <p className="summary-chart-average">
          <strong>{formatAverage(series.average, series.unit)}</strong>
          <span className="muted"> / day avg</span>
        </p>
      </div>
      <div
        className="summary-chart"
        role="img"
        aria-label={`${series.title}: ${formatAverage(series.average, series.unit)} per day · ${series.windowLabel}`}
      >
        <svg
          className="summary-line-svg"
          viewBox={`0 0 ${LINE_CHART_WIDTH} ${LINE_CHART_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            className="summary-line-baseline"
            x1={LINE_CHART_PAD_X}
            y1={LINE_CHART_HEIGHT - LINE_CHART_PAD_Y}
            x2={LINE_CHART_WIDTH - LINE_CHART_PAD_X}
            y2={LINE_CHART_HEIGHT - LINE_CHART_PAD_Y}
          />
          {series.average > 0 ? (
            <line
              className="summary-line-average"
              x1={LINE_CHART_PAD_X}
              y1={averageY}
              x2={LINE_CHART_WIDTH - LINE_CHART_PAD_X}
              y2={averageY}
            />
          ) : null}
          <path className="summary-line-path" d={linePath} />
          {showDots
            ? coords.map(({ x, y, point }) => {
                const tip =
                  series.unit === 'dollars'
                    ? `$${point.value.toFixed(2)}`
                    : String(point.value)
                return (
                  <circle
                    key={point.dateKey}
                    className={`summary-line-dot${point.value > 0 ? '' : ' empty'}`}
                    cx={x}
                    cy={y}
                    r={point.value > 0 ? 3.2 : 2.2}
                  >
                    <title>{`${point.dateKey}: ${tip}`}</title>
                  </circle>
                )
              })
            : null}
        </svg>
        <div className="summary-line-labels" aria-hidden="true">
          {series.points.map((point, index) => {
            const show =
              index === 0 ||
              index === count - 1 ||
              index % labelStep === 0
            return (
              <span
                key={point.dateKey}
                className={`summary-line-label${show ? '' : ' hidden'}`}
              >
                {show ? point.label : ''}
              </span>
            )
          })}
        </div>
      </div>
      <p className="muted summary-chart-window">{series.windowLabel}</p>
    </section>
  )
}

function SummaryRangePicker({
  rangeUnit,
  rangeAmount,
  onUnitChange,
  onAmountChange,
}: {
  rangeUnit: SummaryRangeUnit
  rangeAmount: number
  onUnitChange: (unit: SummaryRangeUnit) => void
  onAmountChange: (amount: number) => void
}) {
  const presets = RANGE_PRESETS[rangeUnit]
  const amountId = 'summary-range-amount'

  return (
    <div className="panel summary-range-panel" aria-label="Summary range">
      <div
        className="summary-range-units"
        role="group"
        aria-label="Range unit"
      >
        {(['days', 'months', 'years'] as SummaryRangeUnit[]).map((unit) => (
          <button
            key={unit}
            type="button"
            className={`summary-range-unit${rangeUnit === unit ? ' selected' : ''}`}
            aria-pressed={rangeUnit === unit}
            onClick={() => onUnitChange(unit)}
          >
            {UNIT_LABELS[unit].plural}
          </button>
        ))}
      </div>
      <div className="summary-range-amount-row">
        <label className="summary-range-amount-label" htmlFor={amountId}>
          Last
        </label>
        <input
          id={amountId}
          className="summary-range-amount-input"
          type="number"
          inputMode="numeric"
          min={1}
          max={RANGE_MAX[rangeUnit]}
          step={1}
          value={rangeAmount}
          onChange={(event) =>
            onAmountChange(clampAmount(rangeUnit, Number(event.target.value)))
          }
        />
        <span className="muted summary-range-amount-unit">
          {rangeAmount === 1
            ? UNIT_LABELS[rangeUnit].singular
            : UNIT_LABELS[rangeUnit].plural}
        </span>
      </div>
      <div
        className="summary-range-presets"
        role="group"
        aria-label="Quick ranges"
      >
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={`summary-range-preset${
              rangeAmount === preset ? ' selected' : ''
            }`}
            aria-pressed={rangeAmount === preset}
            onClick={() => onAmountChange(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}

interface SummaryViewProps {
  tasks: Task[]
  realSpending: SpendingEntry[]
  dollarLedger: DollarLedgerEntry[]
  todayKey: string
}

export default function SummaryView({
  tasks,
  realSpending,
  dollarLedger,
  todayKey,
}: SummaryViewProps) {
  const [rangeUnit, setRangeUnit] = useState<SummaryRangeUnit>('days')
  const [rangeAmount, setRangeAmount] = useState(RANGE_DEFAULTS.days)

  function handleUnitChange(unit: SummaryRangeUnit) {
    setRangeUnit(unit)
    setRangeAmount(RANGE_DEFAULTS[unit])
  }

  function handleAmountChange(amount: number) {
    setRangeAmount(clampAmount(rangeUnit, amount))
  }

  const charts = useMemo(() => {
    const today = parseDateKey(todayKey)
    const amount = clampAmount(rangeUnit, rangeAmount)
    const dayKeys = resolveDayKeys(today, rangeUnit, amount)
    const windowLabel = rangeWindowLabel(rangeUnit, amount)

    const taskTotals = buildTaskTotalsByDay(tasks, dayKeys)
    const spendTotals = buildSpendTotalsByDay(realSpending, dayKeys)
    const earnedTotals = buildLedgerTotalsByDay(dollarLedger, dayKeys, 'earned')
    const spentTotals = buildLedgerTotalsByDay(dollarLedger, dayKeys, 'spent')

    const make = (
      id: string,
      title: string,
      unit: 'count' | 'dollars',
      totals: Record<string, number>,
    ): SummaryChartSeries => {
      const { points, average } = buildSeriesPoints(
        totals,
        dayKeys,
        rangeUnit,
        today,
        amount,
      )
      return { id, title, unit, points, average, windowLabel }
    }

    return [
      make('tasks', 'Avg tasks completed', 'count', taskTotals),
      make('spend', 'Avg spend', 'dollars', spendTotals),
      make('rewards-earned', 'Avg rewards earned', 'dollars', earnedTotals),
      make('rewards-spent', 'Avg rewards spent', 'dollars', spentTotals),
    ]
  }, [tasks, realSpending, dollarLedger, todayKey, rangeUnit, rangeAmount])

  return (
    <section className="day-pane" aria-label="Summary">
      <div className="day-header">
        <div className="day-label-row projects-title-row">
          <span className="day-nav-spacer" aria-hidden="true" />
          <p className="day-label">Summary</p>
          <span className="day-nav-spacer" aria-hidden="true" />
        </div>
        <div className="day-divider" aria-hidden="true" />
      </div>

      <SummaryRangePicker
        rangeUnit={rangeUnit}
        rangeAmount={rangeAmount}
        onUnitChange={handleUnitChange}
        onAmountChange={handleAmountChange}
      />

      <div className="task-groups summary-groups">
        {charts.map((series) => (
          <SummaryLineChart key={series.id} series={series} />
        ))}
      </div>
    </section>
  )
}
