import { describe, expect, it } from 'vitest'
import {
  activeReminders,
  buildReminders,
  deriveDocStatus,
  isReminderMuted,
  severityForInterval,
  sortReminders,
  summarise,
  type Reminder,
} from './reminders'
import {
  makeCarData,
  makeDocument,
  makeFuelEntry,
  makeMaintenanceEntry,
  makeSettings,
  makeVehicle,
} from '@/test/fixtures'

const TODAY = new Date('2026-09-11')

describe('deriveDocStatus', () => {
  it('treats a missing expiry as valid', () => {
    expect(deriveDocStatus(undefined, TODAY)).toBe('valid')
  })

  it('flags a past date as expired', () => {
    expect(deriveDocStatus('2026-09-10', TODAY)).toBe('expired')
  })

  it('flags anything within 30 days as expiring, including today', () => {
    expect(deriveDocStatus('2026-09-11', TODAY)).toBe('expiring')
    expect(deriveDocStatus('2026-10-11', TODAY)).toBe('expiring') // exactly 30 days
  })

  it('treats 31 days out as valid', () => {
    expect(deriveDocStatus('2026-10-12', TODAY)).toBe('valid')
  })
})

describe('severityForInterval', () => {
  it('grades a distance against the km threshold', () => {
    expect(severityForInterval(-1, undefined)).toBe('overdue')
    expect(severityForInterval(0, undefined)).toBe('due-soon')
    expect(severityForInterval(1000, undefined)).toBe('due-soon')
    expect(severityForInterval(1001, undefined)).toBe('upcoming')
  })

  it('grades a date against the day threshold', () => {
    expect(severityForInterval(undefined, -1)).toBe('overdue')
    expect(severityForInterval(undefined, 30)).toBe('due-soon')
    expect(severityForInterval(undefined, 31)).toBe('upcoming')
  })

  it('takes the more pressing of the two', () => {
    // Distance comfortable, date already passed.
    expect(severityForInterval(2338, -6)).toBe('overdue')
    // Distance nearly due, date far off.
    expect(severityForInterval(400, 200)).toBe('due-soon')
  })

  it('reports upcoming when nothing is set', () => {
    expect(severityForInterval(undefined, undefined)).toBe('upcoming')
  })
})

describe('buildReminders', () => {
  it('reports a distance interval', () => {
    const data = makeCarData({
      maintenance: [
        makeMaintenanceEntry({ id: 'm1', mileage: 10000, type: 'Air filter', nextIntervalKm: 21000 }),
      ],
    })
    const [reminder] = buildReminders(data, TODAY)
    expect(reminder.kind).toBe('maintenance')
    expect(reminder.title).toBe('Air filter')
    expect(reminder.dueInKm).toBe(21000 - data.vehicle.currentMileage)
    expect(reminder.severity).toBe('upcoming')
    expect(reminder.detail).toContain('Due in')
  })

  it('lets a passed date lead while still showing the far-off distance', () => {
    // The case the old km-only view could not express at all.
    const data = makeCarData({
      maintenance: [
        makeMaintenanceEntry({
          id: 'm1',
          mileage: 18450,
          type: 'Oil change',
          nextIntervalKm: 20790,
          nextIntervalDate: '2026-09-05',
        }),
      ],
    })
    const [reminder] = buildReminders(data, TODAY)
    expect(reminder.severity).toBe('overdue')
    expect(reminder.detail).toBe('Overdue by 6 days')
    expect(reminder.secondary).toContain('20.790')
  })

  it('skips services with no interval at all', () => {
    const data = makeCarData({ maintenance: [makeMaintenanceEntry({ id: 'm1', mileage: 5000 })] })
    expect(buildReminders(data, TODAY)).toEqual([])
  })

  it('treats an expiring Maintenance document as an inspection', () => {
    const data = makeCarData({
      documents: [
        makeDocument({
          id: 'd1',
          name: 'Inspection report',
          category: 'Maintenance',
          expirationDate: '2026-11-12',
        }),
      ],
    })
    const [reminder] = buildReminders(data, TODAY)
    expect(reminder.kind).toBe('inspection')
    expect(reminder.dueInDays).toBe(62)
    expect(reminder.severity).toBe('upcoming')
  })

  it('does not mistake an unrelated expiring document for an inspection', () => {
    const data = makeCarData({
      documents: [
        makeDocument({ id: 'd1', name: 'Warranty card', category: 'Other', expirationDate: '2029-02-28' }),
      ],
    })
    expect(buildReminders(data, TODAY)).toEqual([])
  })

  it('reports insurance from the document expiry', () => {
    const data = makeCarData({
      documents: [
        makeDocument({
          id: 'd1',
          name: 'Insurance policy',
          category: 'Insurance',
          expirationDate: '2026-09-20',
        }),
      ],
    })
    const [reminder] = buildReminders(data, TODAY)
    expect(reminder.kind).toBe('insurance')
    expect(reminder.severity).toBe('due-soon')
    expect(reminder.dueInDays).toBe(9)
  })

  it('lists the soonest-expiring document in a category first', () => {
    const data = makeCarData({
      documents: [
        makeDocument({ id: 'late', name: 'Policy B', category: 'Insurance', expirationDate: '2027-06-01' }),
        makeDocument({ id: 'soon', name: 'Policy A', category: 'Insurance', expirationDate: '2026-10-01' }),
      ],
    })
    const reminders = buildReminders(data, TODAY)
    expect(reminders.map((r) => r.title)).toEqual(['Policy A', 'Policy B'])
  })

  it('ignores fuel entries, which carry no interval', () => {
    const data = makeCarData({
      vehicle: makeVehicle({ currentMileage: 18452 }),
      fuelEntries: [makeFuelEntry({ id: 'f1', mileage: 18000 })],
    })
    expect(buildReminders(data, TODAY)).toEqual([])
  })
})

describe('reminder toggles', () => {
  const reminders: Reminder[] = [
    { id: 'a', kind: 'maintenance', severity: 'overdue', title: 'Service', detail: '', to: '/maintenance' },
    { id: 'b', kind: 'inspection', severity: 'due-soon', title: 'Inspection', detail: '', to: '/documents' },
    { id: 'c', kind: 'insurance', severity: 'upcoming', title: 'Insurance', detail: '', to: '/documents' },
  ]

  it('names the setting that controls each kind', () => {
    expect(isReminderMuted('maintenance', makeSettings({ maintenanceReminders: false }))).toBe(true)
    expect(isReminderMuted('inspection', makeSettings({ inspectionReminders: false }))).toBe(true)
    expect(isReminderMuted('insurance', makeSettings({ insuranceReminders: false }))).toBe(true)
    expect(isReminderMuted('maintenance', makeSettings())).toBe(false)
  })

  it('filters muted categories out of the active list', () => {
    const active = activeReminders(reminders, makeSettings({ maintenanceReminders: false }))
    expect(active.map((r) => r.id)).toEqual(['b', 'c'])
  })

  it('hides everything when all three are off', () => {
    const active = activeReminders(
      reminders,
      makeSettings({
        maintenanceReminders: false,
        inspectionReminders: false,
        insuranceReminders: false,
      }),
    )
    expect(active).toEqual([])
  })
})

describe('summarise and ordering', () => {
  it('counts by severity', () => {
    const summary = summarise([
      { id: 'a', kind: 'maintenance', severity: 'overdue', title: '', detail: '', to: '' },
      { id: 'b', kind: 'maintenance', severity: 'overdue', title: '', detail: '', to: '' },
      { id: 'c', kind: 'inspection', severity: 'due-soon', title: '', detail: '', to: '' },
      { id: 'd', kind: 'insurance', severity: 'upcoming', title: '', detail: '', to: '' },
    ])
    expect(summary).toEqual({ total: 4, overdue: 2, dueSoon: 1, upcoming: 1 })
  })

  it('orders overdue first, then due soon, then upcoming', () => {
    const ordered = sortReminders([
      { id: 'up', kind: 'insurance', severity: 'upcoming', title: '', detail: '', to: '', dueInDays: 5 },
      { id: 'over', kind: 'maintenance', severity: 'overdue', title: '', detail: '', to: '', dueInDays: -2 },
      { id: 'soon', kind: 'inspection', severity: 'due-soon', title: '', detail: '', to: '', dueInDays: 10 },
    ])
    expect(ordered.map((r) => r.id)).toEqual(['over', 'soon', 'up'])
  })

  it('puts the most overdue first', () => {
    const ordered = sortReminders([
      { id: 'a', kind: 'maintenance', severity: 'overdue', title: '', detail: '', to: '', dueInDays: -1 },
      { id: 'b', kind: 'maintenance', severity: 'overdue', title: '', detail: '', to: '', dueInDays: -40 },
    ])
    expect(ordered.map((r) => r.id)).toEqual(['b', 'a'])
  })
})
