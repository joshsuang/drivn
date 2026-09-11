import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  daysUntil,
  formatCurrency,
  formatDate,
  formatDateShort,
  formatDuration,
  formatKm,
  formatNumber,
} from './format'

/** Intl inserts non-breaking spaces; normalise so assertions read plainly. */
const norm = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ')

describe('number and currency formatting', () => {
  it('formats distances with locale grouping and rounds to whole km', () => {
    expect(norm(formatKm(18452))).toBe('18.452 km')
    expect(norm(formatKm(6105.4))).toBe('6.105 km')
    expect(norm(formatKm(0))).toBe('0 km')
  })

  it('honours the requested decimal places', () => {
    expect(norm(formatNumber(5.75, 1))).toBe('5,8')
    expect(norm(formatNumber(1.713, 3))).toBe('1,713')
    expect(norm(formatNumber(20790, 0))).toBe('20.790')
  })

  it('drops the decimals on whole-euro amounts but keeps them on the rest', () => {
    expect(norm(formatCurrency(65))).toBe('€ 65')
    expect(norm(formatCurrency(70.86))).toContain('70,86')
  })
})

describe('date formatting', () => {
  it('renders a date-only string as the same calendar day everywhere', () => {
    // "2026-09-11" is UTC midnight; in a negative-offset timezone that is the
    // 10th locally, and this used to display as such.
    expect(formatDate('2026-09-11')).toBe('11 Sep 2026')
    expect(formatDateShort('2026-09-11')).toBe('11 Sep')
  })

  it('handles the first of the month, where an off-by-one is most visible', () => {
    expect(formatDate('2026-01-01')).toBe('01 Jan 2026')
  })
})

describe('day counting', () => {
  const today = new Date('2026-09-11')

  it('counts whole calendar days', () => {
    expect(daysBetween('2026-09-01', today)).toBe(10)
    expect(daysBetween('2026-09-11', today)).toBe(0)
    expect(daysBetween('2026-09-12', today)).toBe(-1)
  })

  it('reports days until a date, negative once it has passed', () => {
    expect(daysUntil('2026-09-05', today)).toBe(-6)
    expect(daysUntil('2026-09-11', today)).toBe(0)
    expect(daysUntil('2026-11-12', today)).toBe(62)
  })

  it('survives a DST transition instead of drifting by an hour', () => {
    // Europe/Brussels leaves DST on 2026-10-25, making that day 25 hours long.
    expect(daysBetween('2026-10-24', new Date('2026-10-26'))).toBe(2)
    // And enters it on 2026-03-29, making that day 23 hours long.
    expect(daysBetween('2026-03-28', new Date('2026-03-30'))).toBe(2)
  })

  it('ignores the time of day when counting days', () => {
    expect(daysUntil('2026-09-12', new Date('2026-09-11T23:59:00'))).toBe(1)
  })
})

describe('duration formatting', () => {
  it('formats hours and minutes', () => {
    expect(formatDuration(45)).toBe('45m')
    expect(formatDuration(90)).toBe('1h 30m')
    expect(formatDuration(60)).toBe('1h 0m')
    expect(formatDuration(0)).toBe('0m')
  })
})
