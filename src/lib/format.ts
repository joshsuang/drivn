export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

export function formatKm(value: number): string {
  return `${new Intl.NumberFormat('nl-BE').format(Math.round(value))} km`
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('nl-BE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

// Both parse through startOfDay so a date-only string can't render as the
// previous day in a negative-offset timezone — the same trap daysBetween avoids.
export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(startOfDay(dateStr))
}

export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  }).format(startOfDay(dateStr))
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

/**
 * Normalise to local midnight.
 *
 * "2026-11-12" parses as UTC midnight, which a negative-offset timezone renders
 * as the previous day — and an expiry that lands one day early is exactly the
 * kind of off-by-one a reminder must not have.
 */
function startOfDay(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
  }
  const parsed = new Date(value)
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

/**
 * Whole calendar days from `dateStr` to `to` — negative for dates in the past.
 * Counted in days rather than milliseconds so DST changes don't shift the result.
 */
export function daysBetween(dateStr: string, to: Date = new Date()): number {
  const from = startOfDay(dateStr)
  const target = startOfDay(to)
  return Math.round((target.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

/** Days until `dateStr`; negative once it has passed, 0 on the day itself. */
export function daysUntil(dateStr: string, today: Date = new Date()): number {
  return -daysBetween(dateStr, today)
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}
