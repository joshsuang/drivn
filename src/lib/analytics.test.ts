import { describe, expect, it } from 'vitest'
import {
  buildConsumptionByMonth,
  buildMileageByMonth,
  deriveOdometer,
  fuelTotals,
  monthKey,
  withRecomputedConsumption,
} from './analytics'
import { makeFuelEntry, makeMaintenanceEntry } from '@/test/fixtures'

describe('monthKey', () => {
  it('reads the month off the string rather than through Date', () => {
    // Parsing "2026-09-01" as a Date yields UTC midnight, which a negative-offset
    // timezone renders as Aug 31 — and the fill-up lands in the wrong chart.
    expect(monthKey('2026-09-01')).toBe('Sep')
    expect(monthKey('2026-01-01')).toBe('Jan')
    expect(monthKey('2026-12-31')).toBe('Dec')
  })

  it('handles full ISO timestamps', () => {
    expect(monthKey('2026-03-15T10:30:00Z')).toBe('Mar')
  })
})

describe('buildMileageByMonth', () => {
  it('sums odometer deltas per month', () => {
    const entries = [
      makeFuelEntry({ id: 'a', date: '2026-04-05', mileage: 4000 }),
      makeFuelEntry({ id: 'b', date: '2026-05-05', mileage: 5000 }),
      makeFuelEntry({ id: 'c', date: '2026-05-20', mileage: 5500 }),
    ]
    const series = buildMileageByMonth(entries, 3000)
    const byMonth = Object.fromEntries(series.map((p) => [p.month, p.value]))
    expect(byMonth.Apr).toBe(1000) // 4000 - 3000 starting
    expect(byMonth.May).toBe(1500) // 1000 + 500
    expect(byMonth.Jun).toBe(0)
  })

  it('never records a negative delta when a reading goes backwards', () => {
    const entries = [
      makeFuelEntry({ id: 'a', date: '2026-04-05', mileage: 5000 }),
      makeFuelEntry({ id: 'b', date: '2026-05-05', mileage: 4500 }), // bad data
    ]
    const series = buildMileageByMonth(entries, 4000)
    const byMonth = Object.fromEntries(series.map((p) => [p.month, p.value]))
    expect(byMonth.Apr).toBe(1000)
    expect(byMonth.May).toBe(0)
    // The later reading still anchors the running mileage for future months.
    expect(byMonth.Jun).toBe(0)
  })

  it('always returns twelve months in order', () => {
    const series = buildMileageByMonth([], 0)
    expect(series).toHaveLength(12)
    expect(series[0].month).toBe('Jan')
    expect(series[11].month).toBe('Dec')
  })
})

describe('buildConsumptionByMonth', () => {
  it('averages the consumption figures logged in each month', () => {
    const entries = [
      makeFuelEntry({ id: 'a', date: '2026-05-02', mileage: 1000, consumption: 6.0 }),
      makeFuelEntry({ id: 'b', date: '2026-05-20', mileage: 2000, consumption: 5.0 }),
      makeFuelEntry({ id: 'c', date: '2026-06-01', mileage: 3000, consumption: 5.5 }),
    ]
    const series = buildConsumptionByMonth(entries)
    expect(series.map((p) => p.month)).toEqual(['May', 'Jun'])
    expect(series[0].value).toBeCloseTo(5.5, 5)
    expect(series[1].value).toBeCloseTo(5.5, 5)
  })

  it('skips entries without a figure and returns nothing when none have one', () => {
    expect(buildConsumptionByMonth([    makeFuelEntry({ id: 'a', mileage: 1000 })])).toEqual([])
  })
})

describe('withRecomputedConsumption', () => {
  it('derives each figure from the gap to the previous fill-up', () => {
    const entries = [
      makeFuelEntry({ id: 'a', mileage: 1000, liters: 40 }),
      makeFuelEntry({ id: 'b', mileage: 1500, liters: 30 }),
      makeFuelEntry({ id: 'c', mileage: 2000, liters: 25 }),
    ]
    const [a, b, c] = withRecomputedConsumption(entries)
    expect(a.consumption).toBeUndefined() // no previous fill-up to measure against
    expect(b.consumption).toBeCloseTo(6, 5) // 30 L over 500 km
    expect(c.consumption).toBeCloseTo(5, 5) // 25 L over 500 km
  })

  it('recomputes the *next* entry when a middle one is edited', () => {
    // The regression this exists for: editing one fill-up invalidates the figure
    // on the following one, which used to be left stale in the database.
    const entries = [
      makeFuelEntry({ id: 'a', mileage: 1000, liters: 40 }),
      makeFuelEntry({ id: 'b', mileage: 1500, liters: 30 }),
      makeFuelEntry({ id: 'c', mileage: 2000, liters: 25 }),
    ]
    const edited = entries.map((e) => (e.id === 'b' ? { ...e, mileage: 1800 } : e))
    const result = withRecomputedConsumption(edited)
    const b = result.find((e) => e.id === 'b')!
    const c = result.find((e) => e.id === 'c')!
    expect(b.consumption).toBeCloseTo((30 / 800) * 100, 5)
    expect(c.consumption).toBeCloseTo((25 / 200) * 100, 5)
  })

  it('leaves a figure undefined when two fill-ups share a mileage', () => {
    const entries = [
      makeFuelEntry({ id: 'a', mileage: 1000, liters: 40 }),
      makeFuelEntry({ id: 'b', mileage: 1000, liters: 30 }),
    ]
    expect(withRecomputedConsumption(entries)[1].consumption).toBeUndefined()
  })

  it('returns entries in their original order', () => {
    const entries = [
      makeFuelEntry({ id: 'b', date: '2026-06-01', mileage: 1500, liters: 30 }),
      makeFuelEntry({ id: 'a', date: '2026-05-01', mileage: 1000, liters: 40 }),
    ]
    expect(withRecomputedConsumption(entries).map((e) => e.id)).toEqual(['b', 'a'])
  })
})

describe('deriveOdometer', () => {
  const maintenance = [makeMaintenanceEntry({ id: 'm1', mileage: 12345 })]

  it('takes the highest reading across fuel and services', () => {
    const entries = [    makeFuelEntry({ id: 'a', mileage: 3120 }),     makeFuelEntry({ id: 'b', mileage: 18452 })]
    expect(deriveOdometer(entries, maintenance, 0)).toBe(18452)
  })

  it('lets a service reading lead when it is the highest', () => {
    const entries = [    makeFuelEntry({ id: 'a', mileage: 5000 })]
    expect(deriveOdometer(entries, [makeMaintenanceEntry({ id: 'm1', mileage: 20000 })], 0)).toBe(20000)
  })

  it('recovers downwards when a typo is corrected', () => {
    // A fat-fingered 999999 must not pin the mileage forever.
    const entries = [    makeFuelEntry({ id: 'a', mileage: 999999 }),     makeFuelEntry({ id: 'b', mileage: 18000 })]
    expect(deriveOdometer(entries, [], 0)).toBe(999999)
    const corrected = [    makeFuelEntry({ id: 'a', mileage: 18500 }),     makeFuelEntry({ id: 'b', mileage: 18000 })]
    expect(deriveOdometer(corrected, [], 0)).toBe(18500)
  })

  it('never drops below the starting mileage', () => {
    expect(deriveOdometer([    makeFuelEntry({ id: 'a', mileage: 100 })], [], 18452)).toBe(18452)
    expect(deriveOdometer([], [], 0)).toBe(0)
  })
})

describe('fuelTotals', () => {
  it('totals cost, litres and averages', () => {
    const entries = [
      makeFuelEntry({ id: 'a', mileage: 1000, liters: 40, pricePerLiter: 1.7, totalCost: 68, consumption: 6 }),
      makeFuelEntry({ id: 'b', mileage: 1500, liters: 30, pricePerLiter: 1.8, totalCost: 54, consumption: 4 }),
    ]
    const totals = fuelTotals(entries, 1000)
    expect(totals.totalCost).toBeCloseTo(122, 5)
    expect(totals.totalLiters).toBeCloseTo(70, 5)
    expect(totals.avgPrice).toBeCloseTo(122 / 70, 5)
    expect(totals.avgConsumption).toBeCloseTo(5, 5)
    expect(totals.costPerKm).toBeCloseTo(0.122, 5)
  })

  it('returns zeros instead of dividing by zero', () => {
    const totals = fuelTotals([], 0)
    expect(totals.avgPrice).toBe(0)
    expect(totals.costPerKm).toBe(0)
    expect(totals.avgConsumption).toBe(0)
  })
})
