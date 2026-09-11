import type { FuelEntry, MaintenanceEntry, MonthlyPoint } from '@/types'

/**
 * Pure derivations over logged data. Kept free of Supabase and React so the
 * charts can be recomputed from local state after an edit instead of refetching
 * ten tables, and so the consumption chain is testable in isolation.
 */

export const MONTH_ORDER = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Read the month straight off the string instead of via `new Date()`.
 * "2026-09-01" is UTC midnight, which a negative-offset local timezone renders
 * as Aug 31 — shifting fill-ups into the wrong month's chart.
 */
export function monthKey(dateStr: string): string {
  const month = Number(dateStr.slice(5, 7))
  if (month >= 1 && month <= 12) return MONTH_ORDER[month - 1]
  return new Date(dateStr).toLocaleString('en-US', { month: 'short' })
}

function byDateAsc(a: { date: string }, b: { date: string }) {
  return new Date(a.date).getTime() - new Date(b.date).getTime()
}

/** Distance covered per calendar month, inferred from odometer deltas. */
export function buildMileageByMonth(fuel: FuelEntry[], startingMileage: number): MonthlyPoint[] {
  const sorted = [...fuel].sort(byDateAsc)
  const byMonth: Record<string, number> = {}
  let prevMileage = startingMileage
  for (const f of sorted) {
    // A lower reading than the previous one means the entry was re-ordered or
    // corrected; skip the negative delta rather than corrupting the month.
    const delta = Math.max(0, f.mileage - prevMileage)
    const key = monthKey(f.date)
    byMonth[key] = (byMonth[key] ?? 0) + delta
    prevMileage = Math.max(prevMileage, f.mileage)
  }
  return MONTH_ORDER.map((month) => ({ month, value: byMonth[month] ?? 0, lastYear: 0 }))
}

/** Average litres/100km per calendar month, across fill-ups that carry a figure. */
export function buildConsumptionByMonth(fuel: FuelEntry[]): MonthlyPoint[] {
  const withConsumption = [...fuel].filter((f) => f.consumption).sort(byDateAsc)
  const byMonth: Record<string, number[]> = {}
  for (const f of withConsumption) {
    const key = monthKey(f.date)
    ;(byMonth[key] ??= []).push(f.consumption!)
  }
  return Object.keys(byMonth)
    .sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b))
    .map((month) => ({
      month,
      value: byMonth[month].reduce((s, v) => s + v, 0) / byMonth[month].length,
    }))
}

/**
 * Consumption is derived from the gap to the previous fill-up, so editing or
 * deleting one entry invalidates the figure on the *next* one. Recompute the
 * whole chain and return entries in their original order.
 */
export function withRecomputedConsumption(entries: FuelEntry[]): FuelEntry[] {
  const ascending = [...entries].sort(
    (a, b) => a.mileage - b.mileage || byDateAsc(a, b),
  )
  const consumptionById = new Map<string, number | undefined>()
  let previous: FuelEntry | null = null
  for (const entry of ascending) {
    const usable = previous && entry.mileage > previous.mileage
    consumptionById.set(
      entry.id,
      usable ? (entry.liters / (entry.mileage - previous!.mileage)) * 100 : undefined,
    )
    previous = entry
  }
  return entries.map((entry) => ({ ...entry, consumption: consumptionById.get(entry.id) }))
}

/**
 * The odometer only moves forward, so the highest reading wins.
 *
 * Measured across fuel *and* maintenance logs rather than just the latest entry:
 * a fat-fingered 999999 in one service record would otherwise pin the mileage
 * forever, even after the typo is corrected. Deriving it means fixing the entry
 * fixes the figure, in both directions.
 */
export function deriveOdometer(
  fuelEntries: FuelEntry[],
  maintenance: MaintenanceEntry[],
  startingMileage: number,
): number {
  const readings = [
    startingMileage,
    ...fuelEntries.map((f) => f.mileage),
    ...maintenance.map((m) => m.mileage),
  ]
  return readings.reduce((max, value) => (Number.isFinite(value) && value > max ? value : max), 0)
}

export interface FuelTotals {
  totalCost: number
  totalLiters: number
  avgPrice: number
  avgConsumption: number
  costPerKm: number
}

export function fuelTotals(entries: FuelEntry[], distanceKm: number): FuelTotals {
  const totalCost = entries.reduce((s, f) => s + f.totalCost, 0)
  const totalLiters = entries.reduce((s, f) => s + f.liters, 0)
  const withConsumption = entries.filter((f) => f.consumption)
  return {
    totalCost,
    totalLiters,
    avgPrice: totalLiters > 0 ? totalCost / totalLiters : 0,
    avgConsumption:
      withConsumption.reduce((s, f) => s + (f.consumption ?? 0), 0) /
      (withConsumption.length || 1),
    costPerKm: distanceKm > 0 ? totalCost / distanceKm : 0,
  }
}

/** Rebuild the two chart series from whatever entries are currently in state. */
export function deriveMonthlySeries(
  entries: FuelEntry[],
  startingMileage: number,
): { mileageByMonth: MonthlyPoint[]; consumptionByMonth: MonthlyPoint[] } {
  return {
    mileageByMonth: buildMileageByMonth(entries, startingMileage),
    consumptionByMonth: buildConsumptionByMonth(entries),
  }
}
