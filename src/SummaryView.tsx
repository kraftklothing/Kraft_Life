import { useMemo } from 'react'
import { addDays, parseDateKey, toDateKey } from './dates'
import type { DollarLedgerEntry, SpendingEntry, Task } from './types'

const SUMMARY_DAYS = 14

export interface DailyPoint {
  dateKey: string
  value: number
}

export interface SummaryChartSeries {
  id: string
  title: string
  unit: 'count' | 'dollars'
  points: DailyPoint[]
  average: number
}

function recentDayKeys(end: Date, count: number): string[] {
  const keys: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    keys.push(toDateKey(addDays(end, -i)))
  }
  return keys
}

function averageOf(points: DailyPoint[]): number {
  if (points.length === 0) return 0
  const total = points.reduce((sum, point) => sum + point.value, 0)
  return total / points.length
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

function buildTaskCompletionPoints(
  tasks: Task[],
  dayKeys: string[],
): DailyPoint[] {
  const byDay: Record<string, number> = Object.fromEntries(
    dayKeys.map((key) => [key, 0]),
  )
  for (const task of tasks) {
    for (const [dateKey, done] of Object.entries(task.completions)) {
      if (!done || !(dateKey in byDay)) continue
      byDay[dateKey] += 1
    }
  }
  return dayKeys.map((dateKey) => ({ dateKey, value: byDay[dateKey] ?? 0 }))
}

function buildSpendPoints(
  entries: SpendingEntry[],
  dayKeys: string[],
): DailyPoint[] {
  const byDay: Record<string, number> = Object.fromEntries(
    dayKeys.map((key) => [key, 0]),
  )
  for (const entry of entries) {
    if (!(entry.dateKey in byDay)) continue
    byDay[entry.dateKey] += entry.amount
  }
  return dayKeys.map((dateKey) => ({
    dateKey,
    value: Math.round((byDay[dateKey] ?? 0) * 100) / 100,
  }))
}

function buildLedgerPoints(
  ledger: DollarLedgerEntry[],
  dayKeys: string[],
  kind: 'earned' | 'spent',
): DailyPoint[] {
  const byDay: Record<string, number> = Object.fromEntries(
    dayKeys.map((key) => [key, 0]),
  )
  for (const entry of ledger) {
    if (entry.kind !== kind || !(entry.dateKey in byDay)) continue
    byDay[entry.dateKey] += Math.abs(entry.amount)
  }
  return dayKeys.map((dateKey) => ({
    dateKey,
    value: Math.round((byDay[dateKey] ?? 0) * 100) / 100,
  }))
}

function SummaryBarChart({ series }: { series: SummaryChartSeries }) {
  const maxValue = Math.max(...series.points.map((point) => point.value), 0)
  const chartMax = Math.max(maxValue, series.average, 0.0001)

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
        aria-label={`${series.title}: ${formatAverage(series.average, series.unit)} per day over ${series.points.length} days`}
      >
        {series.points.map((point) => {
          const heightPct =
            point.value <= 0 ? 0 : Math.max(6, (point.value / chartMax) * 100)
          const tip =
            series.unit === 'dollars'
              ? `$${point.value.toFixed(2)}`
              : String(point.value)
          return (
            <div key={point.dateKey} className="summary-bar-col">
              <div className="summary-bar-track" aria-hidden="true">
                <div
                  className={`summary-bar${point.value > 0 ? '' : ' empty'}`}
                  style={{ height: `${heightPct}%` }}
                  title={`${point.dateKey}: ${tip}`}
                />
              </div>
              <span className="summary-bar-label">{shortDayLabel(point.dateKey)}</span>
            </div>
          )
        })}
      </div>
      <p className="muted summary-chart-window">
        Last {series.points.length} days
      </p>
    </section>
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
  const charts = useMemo(() => {
    const dayKeys = recentDayKeys(parseDateKey(todayKey), SUMMARY_DAYS)
    const tasksCompleted = buildTaskCompletionPoints(tasks, dayKeys)
    const spend = buildSpendPoints(realSpending, dayKeys)
    const earned = buildLedgerPoints(dollarLedger, dayKeys, 'earned')
    const spent = buildLedgerPoints(dollarLedger, dayKeys, 'spent')

    const series: SummaryChartSeries[] = [
      {
        id: 'tasks',
        title: 'Avg tasks completed',
        unit: 'count',
        points: tasksCompleted,
        average: averageOf(tasksCompleted),
      },
      {
        id: 'spend',
        title: 'Avg spend',
        unit: 'dollars',
        points: spend,
        average: averageOf(spend),
      },
      {
        id: 'rewards-earned',
        title: 'Avg rewards earned',
        unit: 'dollars',
        points: earned,
        average: averageOf(earned),
      },
      {
        id: 'rewards-spent',
        title: 'Avg rewards spent',
        unit: 'dollars',
        points: spent,
        average: averageOf(spent),
      },
    ]
    return series
  }, [tasks, realSpending, dollarLedger, todayKey])

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

      <div className="task-groups summary-groups">
        {charts.map((series) => (
          <SummaryBarChart key={series.id} series={series} />
        ))}
      </div>
    </section>
  )
}
