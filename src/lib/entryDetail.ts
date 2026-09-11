import type {
  CarData,
  EventType,
  FuelEntry,
  MaintenanceEntry,
  TimelineEvent,
} from '@/types'
import { daysBetween, daysUntil } from './format'
import { severityForInterval, type ReminderSeverity } from './reminders'

/**
 * The maths behind the per-entry drill-down.
 *
 * Two questions drive it: what did this entry change, and what was going on
 * around it. Both are derivable from the log itself, so nothing extra is stored.
 *
 * "Before" always means the running figure excluding this entry; "after" means
 * including it. The difference is the entry's actual effect — a single fill-up
 * barely moves a 30-entry average, and showing that honestly is the point.
 */

/**
 * Which way is "better" — or neither. Consumption and cost fall into the first
 * two; the gap between services doesn't have a good direction, so colouring it
 * green or red would be asserting something the data can't support.
 */
export type MetricPolarity = 'lower-better' | 'higher-better' | 'neutral'

export interface MetricDelta {
  label: string
  /** Appended after the number, e.g. "L/100km" or "€/km". */
  unit: string
  before: number | null
  after: number | null
  /** after - before, or null when either side can't be computed. */
  delta: number | null
  decimals: number
  polarity: MetricPolarity
}

export interface NeighbourGap<E> {
  entry: E
  distanceKm: number
  days: number
}

export interface TimelineContext {
  events: TimelineEvent[]
  /** The event this entry generated, when it can be identified. */
  ownEventId?: string
}

interface EntryDetailBase<E> {
  entry: E
  /** 1-based position among this vehicle's logged entries. */
  position: number
  total: number
  previous?: NeighbourGap<E>
  next?: NeighbourGap<E>
  metrics: MetricDelta[]
  /** This entry's share of the lifetime spend for its category, 0..1. */
  costShare: number
  /** Spent up to and including this entry. */
  cumulativeCost: number
  /** Spent across every entry in this category. */
  lifetimeCost: number
  context: TimelineContext
}

export interface FuelEntryDetail extends EntryDetailBase<FuelEntry> {}

export interface MaintenanceEntryDetail extends EntryDetailBase<MaintenanceEntry> {
  interval?: {
    dueInKm?: number
    dueInDays?: number
    severity: ReminderSeverity
  }
}

// ------------------------------------------------------------------ helpers

function timeOf(date: string): number {
  return new Date(date).getTime()
}

/** Oldest first. Odometer order is what a running average means for a car. */
function oldestFirst<T extends { date: string; mileage: number }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => timeOf(a.date) - timeOf(b.date) || a.mileage - b.mileage)
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function numbers(values: (number | undefined)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

function buildDelta(
  label: string,
  unit: string,
  before: number | null,
  after: number | null,
  decimals: number,
  polarity: MetricPolarity,
): MetricDelta {
  return {
    label,
    unit,
    before,
    after,
    decimals,
    polarity,
    delta: before !== null && after !== null ? after - before : null,
  }
}

/**
 * Events around this entry.
 *
 * Prefers the event the entry generated (linked by `sourceId`), which matters
 * because a fill-up and a service can land on the same day. Falls back to
 * showing whatever was happening around that date, which is the more useful
 * answer when an entry has no linked event at all.
 */
export function buildTimelineContext(
  events: TimelineEvent[],
  target: { id: string; date: string; type: EventType },
  radius = 2,
): TimelineContext {
  const sorted = [...events].sort((a, b) => timeOf(b.date) - timeOf(a.date))

  const ownIndex = sorted.findIndex((event) => event.sourceId === target.id)
  if (ownIndex !== -1) {
    return {
      events: sorted.slice(Math.max(0, ownIndex - radius), ownIndex + radius + 1),
      ownEventId: sorted[ownIndex].id,
    }
  }

  // No link (a legacy row, or its event was removed) — anchor on the date.
  const insertion = sorted.findIndex((event) => timeOf(event.date) <= timeOf(target.date))
  const anchor = insertion === -1 ? sorted.length : insertion
  return { events: sorted.slice(Math.max(0, anchor - radius), anchor + radius + 1) }
}

// ------------------------------------------------------------ fuel entries

export function buildFuelEntryDetail(data: CarData, entryId: string): FuelEntryDetail | null {
  const entry = data.fuelEntries.find((f) => f.id === entryId)
  if (!entry) return null

  const ordered = oldestFirst(data.fuelEntries)
  const index = ordered.findIndex((f) => f.id === entryId)
  const upTo = ordered.slice(0, index + 1)
  const before = ordered.slice(0, index)
  const startingMileage = data.vehicle.startingMileage

  const consumptionOf = (entries: FuelEntry[]) => mean(numbers(entries.map((e) => e.consumption)))
  const priceOf = (entries: FuelEntry[]) => mean(entries.map((e) => e.pricePerLiter))
  const spendOf = (entries: FuelEntry[]) => mean(entries.map((e) => e.totalCost))
  const costPerKmOf = (entries: FuelEntry[]) => {
    const last = entries[entries.length - 1]
    if (!last) return null
    const distance = last.mileage - startingMileage
    if (distance <= 0) return null
    return entries.reduce((sum, e) => sum + e.totalCost, 0) / distance
  }

  const metrics: MetricDelta[] = [
    buildDelta(
      'Avg. consumption',
      'L/100km',
      consumptionOf(before),
      consumptionOf(upTo),
      2,
      'lower-better',
    ),
    buildDelta('Avg. price per litre', '€/L', priceOf(before), priceOf(upTo), 3, 'lower-better'),
    buildDelta('Avg. cost per fill-up', '€', spendOf(before), spendOf(upTo), 2, 'lower-better'),
    buildDelta('Cost per km', '€/km', costPerKmOf(before), costPerKmOf(upTo), 3, 'lower-better'),
  ]

  const gapTo = (other?: FuelEntry): NeighbourGap<FuelEntry> | undefined =>
    other
      ? {
          entry: other,
          distanceKm: Math.abs(entry.mileage - other.mileage),
          days: Math.abs(daysBetween(entry.date, new Date(other.date))),
        }
      : undefined

  const lifetimeCost = data.fuelEntries.reduce((sum, e) => sum + e.totalCost, 0)

  return {
    entry,
    position: index + 1,
    total: ordered.length,
    previous: gapTo(ordered[index - 1]),
    next: gapTo(ordered[index + 1]),
    metrics,
    cumulativeCost: upTo.reduce((sum, e) => sum + e.totalCost, 0),
    lifetimeCost,
    costShare: lifetimeCost > 0 ? entry.totalCost / lifetimeCost : 0,
    context: buildTimelineContext(data.timeline, {
      id: entry.id,
      date: entry.date,
      type: 'fuel',
    }),
  }
}

// ------------------------------------------------------- maintenance entries

export function buildMaintenanceEntryDetail(
  data: CarData,
  entryId: string,
): MaintenanceEntryDetail | null {
  const entry = data.maintenance.find((m) => m.id === entryId)
  if (!entry) return null

  // Services are scheduled by odometer, so that's the ordering that matters.
  const ordered = [...data.maintenance].sort(
    (a, b) => a.mileage - b.mileage || timeOf(a.date) - timeOf(b.date),
  )
  const index = ordered.findIndex((m) => m.id === entryId)
  const upTo = ordered.slice(0, index + 1)
  const before = ordered.slice(0, index)
  const startingMileage = data.vehicle.startingMileage

  const costOf = (entries: MaintenanceEntry[]) => mean(entries.map((m) => m.cost))
  const costPerKmOf = (entries: MaintenanceEntry[]) => {
    const last = entries[entries.length - 1]
    if (!last) return null
    const distance = last.mileage - startingMileage
    if (distance <= 0) return null
    return entries.reduce((sum, m) => sum + m.cost, 0) / distance
  }

  /** Gaps between consecutive services, up to and including position `at`. */
  const gapsUpTo = (at: number, measure: (from: MaintenanceEntry, to: MaintenanceEntry) => number) => {
    const gaps: number[] = []
    for (let i = 1; i <= at; i += 1) gaps.push(measure(ordered[i - 1], ordered[i]))
    return gaps
  }

  const metrics: MetricDelta[] = [
    buildDelta('Avg. cost per service', '€', costOf(before), costOf(upTo), 2, 'lower-better'),
    buildDelta('Cost per km', '€/km', costPerKmOf(before), costPerKmOf(upTo), 3, 'lower-better'),
    buildDelta(
      'Distance between services',
      'km',
      mean(gapsUpTo(index - 1, (from, to) => to.mileage - from.mileage)),
      mean(gapsUpTo(index, (from, to) => to.mileage - from.mileage)),
      0,
      'neutral',
    ),
    buildDelta(
      'Days between services',
      'days',
      mean(gapsUpTo(index - 1, (from, to) => daysBetween(from.date, new Date(to.date)))),
      mean(gapsUpTo(index, (from, to) => daysBetween(from.date, new Date(to.date)))),
      0,
      'neutral',
    ),
  ]

  const gapTo = (other?: MaintenanceEntry): NeighbourGap<MaintenanceEntry> | undefined =>
    other
      ? {
          entry: other,
          distanceKm: Math.abs(entry.mileage - other.mileage),
          days: Math.abs(daysBetween(entry.date, new Date(other.date))),
        }
      : undefined

  // Reuse the reminder thresholds so an interval reads the same here as it does
  // in the bell.
  const dueInKm =
    entry.nextIntervalKm !== undefined
      ? entry.nextIntervalKm - data.vehicle.currentMileage
      : undefined
  const dueInDays = entry.nextIntervalDate ? daysUntil(entry.nextIntervalDate) : undefined
  const hasInterval = dueInKm !== undefined || dueInDays !== undefined

  const lifetimeCost = data.maintenance.reduce((sum, m) => sum + m.cost, 0)

  return {
    entry,
    position: index + 1,
    total: ordered.length,
    previous: gapTo(ordered[index - 1]),
    next: gapTo(ordered[index + 1]),
    metrics,
    cumulativeCost: upTo.reduce((sum, m) => sum + m.cost, 0),
    lifetimeCost,
    costShare: lifetimeCost > 0 ? entry.cost / lifetimeCost : 0,
    interval: hasInterval
      ? { dueInKm, dueInDays, severity: severityForInterval(dueInKm, dueInDays) }
      : undefined,
    context: buildTimelineContext(data.timeline, {
      id: entry.id,
      date: entry.date,
      type: 'maintenance',
    }),
  }
}
