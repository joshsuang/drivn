import { describe, expect, it } from 'vitest'
import {
  buildFuelEntryDetail,
  buildMaintenanceEntryDetail,
  buildTimelineContext,
} from './entryDetail'
import {
  makeCarData,
  makeDocument,
  makeFuelEntry,
  makeMaintenanceEntry,
  makeTimelineEvent,
  makeVehicle,
} from '@/test/fixtures'

/** Three fill-ups spaced 500 km and a month apart, with clean numbers. */
function threeFillUps() {
  return makeCarData({
    vehicle: makeVehicle({ currentMileage: 2000, startingMileage: 0 }),
    fuelEntries: [
      makeFuelEntry({ id: 'a', date: '2026-05-01', mileage: 1000, liters: 40, pricePerLiter: 1.6, totalCost: 64 }),
      makeFuelEntry({
        id: 'b',
        date: '2026-06-01',
        mileage: 1500,
        liters: 30,
        pricePerLiter: 1.8,
        totalCost: 54,
        consumption: 6,
      }),
      makeFuelEntry({
        id: 'c',
        date: '2026-07-01',
        mileage: 2000,
        liters: 20,
        pricePerLiter: 1.7,
        totalCost: 34,
        consumption: 4,
      }),
    ],
  })
}

describe('buildFuelEntryDetail', () => {
  it('returns null for an unknown entry', () => {
    expect(buildFuelEntryDetail(threeFillUps(), 'nope')).toBeNull()
  })

  it('reports its position in the log', () => {
    const detail = buildFuelEntryDetail(threeFillUps(), 'b')!
    expect(detail.position).toBe(2)
    expect(detail.total).toBe(3)
  })

  it('measures the gaps to the neighbouring fill-ups', () => {
    const detail = buildFuelEntryDetail(threeFillUps(), 'b')!
    expect(detail.previous?.entry.id).toBe('a')
    expect(detail.previous?.distanceKm).toBe(500)
    expect(detail.previous?.days).toBe(31)
    expect(detail.next?.entry.id).toBe('c')
    expect(detail.next?.distanceKm).toBe(500)
    expect(detail.next?.days).toBe(30)
  })

  it('leaves the neighbours undefined at either end', () => {
    const data = threeFillUps()
    expect(buildFuelEntryDetail(data, 'a')!.previous).toBeUndefined()
    expect(buildFuelEntryDetail(data, 'a')!.next?.entry.id).toBe('b')
    expect(buildFuelEntryDetail(data, 'c')!.next).toBeUndefined()
  })

  it('compares the running average with and without the entry', () => {
    const detail = buildFuelEntryDetail(threeFillUps(), 'c')!
    const consumption = detail.metrics.find((m) => m.label === 'Avg. consumption')!
    expect(consumption.before).toBeCloseTo(6, 5) // only b had a figure
    expect(consumption.after).toBeCloseTo(5, 5) // (6 + 4) / 2
    expect(consumption.delta).toBeCloseTo(-1, 5)
    expect(consumption.polarity).toBe('lower-better')
  })

  it('treats the first entry as having nothing to compare against', () => {
    const detail = buildFuelEntryDetail(threeFillUps(), 'a')!
    for (const metric of detail.metrics) {
      expect(metric.before).toBeNull()
      expect(metric.delta).toBeNull()
    }
  })

  it('totals spend so far and lifetime, and this entry’s share', () => {
    const detail = buildFuelEntryDetail(threeFillUps(), 'b')!
    expect(detail.cumulativeCost).toBeCloseTo(118, 5)
    expect(detail.lifetimeCost).toBeCloseTo(152, 5)
    expect(detail.costShare).toBeCloseTo(54 / 152, 5)
  })

  it('anchors the context on the entry’s own event when it is linked', () => {
    const data = makeCarData({
      timeline: [
        makeTimelineEvent({ id: 'e1', date: '2026-05-01', title: 'Older' }),
        makeTimelineEvent({
          id: 'e2',
          date: '2026-06-01',
          title: 'This fill-up',
          type: 'fuel',
          sourceTable: 'fuel_entries',
          sourceId: 'b',
        }),
        makeTimelineEvent({ id: 'e3', date: '2026-07-01', title: 'Newer' }),
      ],
      fuelEntries: threeFillUps().fuelEntries,
    })
    const detail = buildFuelEntryDetail(data, 'b')!
    expect(detail.context.ownEventId).toBe('e2')
    expect(detail.context.events.map((e) => e.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('falls back to the date when the entry has no linked event', () => {
    const data = makeCarData({
      timeline: [
        makeTimelineEvent({ id: 'e1', date: '2026-04-01', title: 'Older' }),
        makeTimelineEvent({ id: 'e3', date: '2026-07-01', title: 'Newer' }),
      ],
      fuelEntries: threeFillUps().fuelEntries,
    })
    const detail = buildFuelEntryDetail(data, 'b')!
    expect(detail.context.ownEventId).toBeUndefined()
    // Nothing on 2026-06-01, so it shows what was happening around then.
    expect(detail.context.events.map((e) => e.id)).toEqual(['e1', 'e3'])
  })
})

describe('buildTimelineContext', () => {
  const events = [
    makeTimelineEvent({ id: 'e1', date: '2026-01-01' }),
    makeTimelineEvent({ id: 'e2', date: '2026-02-01' }),
    makeTimelineEvent({ id: 'e3', date: '2026-03-01' }),
    makeTimelineEvent({ id: 'e4', date: '2026-04-01' }),
    makeTimelineEvent({ id: 'e5', date: '2026-05-01' }),
  ]

  it('windows around the linked event', () => {
    const linked = events.map((e) => (e.id === 'e3' ? { ...e, sourceId: 'x' } : e))
    const context = buildTimelineContext(linked, { id: 'x', date: '2026-03-01', type: 'maintenance' })
    expect(context.ownEventId).toBe('e3')
    expect(context.events.map((e) => e.id)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5'])
  })

  it('does not run off the end of the list', () => {
    const linked = events.map((e) => (e.id === 'e1' ? { ...e, sourceId: 'x' } : e))
    const context = buildTimelineContext(linked, { id: 'x', date: '2026-01-01', type: 'maintenance' })
    // e1 sorted by date descending is last, so the window is clipped.
    expect(context.events.map((e) => e.id)).toEqual(['e2', 'e1'])
  })

  it('handles an empty timeline', () => {
    const context = buildTimelineContext([], { id: 'x', date: '2026-01-01', type: 'fuel' })
    expect(context.events).toEqual([])
    expect(context.ownEventId).toBeUndefined()
  })
})

describe('buildMaintenanceEntryDetail', () => {
  function twoServices() {
    return makeCarData({
      vehicle: makeVehicle({ currentMileage: 18452, startingMileage: 0 }),
      maintenance: [
        makeMaintenanceEntry({ id: 'm1', date: '2026-03-15', mileage: 5000, cost: 200 }),
        makeMaintenanceEntry({
          id: 'm2',
          date: '2026-08-30',
          mileage: 18450,
          cost: 120,
          nextIntervalKm: 20790,
          nextIntervalDate: '2026-09-05',
        }),
      ],
    })
  }

  it('returns null for an unknown entry', () => {
    expect(buildMaintenanceEntryDetail(twoServices(), 'nope')).toBeNull()
  })

  it('reuses the reminder thresholds for the next interval', () => {
    const detail = buildMaintenanceEntryDetail(twoServices(), 'm2')!
    expect(detail.interval?.dueInKm).toBe(2338)
    expect(detail.interval?.dueInDays).toBe(-6)
    expect(detail.interval?.severity).toBe('overdue')
  })

  it('leaves the interval undefined when none is set', () => {
    expect(buildMaintenanceEntryDetail(twoServices(), 'm1')!.interval).toBeUndefined()
  })

  it('measures the gap since the previous service', () => {
    const detail = buildMaintenanceEntryDetail(twoServices(), 'm2')!
    expect(detail.previous?.entry.id).toBe('m1')
    expect(detail.previous?.distanceKm).toBe(13450)
    expect(detail.previous?.days).toBe(168)
  })

  it('reports average cost per service across the running set', () => {
    const detail = buildMaintenanceEntryDetail(twoServices(), 'm2')!
    const metric = detail.metrics.find((m) => m.label === 'Avg. cost per service')!
    expect(metric.before).toBeCloseTo(200, 5)
    expect(metric.after).toBeCloseTo(160, 5)
    expect(metric.delta).toBeCloseTo(-40, 5)
  })

  it('marks the gap between services as neither good nor bad', () => {
    const detail = buildMaintenanceEntryDetail(twoServices(), 'm2')!
    const distance = detail.metrics.find((m) => m.label === 'Distance between services')!
    expect(distance.polarity).toBe('neutral')
  })

  it('orders services by odometer, not by date', () => {
    const data = makeCarData({
      vehicle: makeVehicle({ currentMileage: 20000 }),
      maintenance: [
        makeMaintenanceEntry({ id: 'late-date', date: '2026-09-01', mileage: 10000 }),
        makeMaintenanceEntry({ id: 'early-date', date: '2026-01-01', mileage: 20000 }),
      ],
    })
    expect(buildMaintenanceEntryDetail(data, 'early-date')!.position).toBe(2)
    expect(buildMaintenanceEntryDetail(data, 'late-date')!.position).toBe(1)
  })
})
