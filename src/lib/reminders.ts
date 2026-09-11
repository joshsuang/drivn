import type { AppSettings, CarData, DocStatus, DocumentItem } from '@/types'
import { daysUntil, formatDate, formatKm, formatNumber } from './format'

/**
 * Turns the maintenance intervals and document expiry dates already in the data
 * into things the user can act on.
 *
 * Everything here is derived, never stored. The app used to read a `status`
 * column that was written once as 'valid' and never recomputed, so an expired
 * policy still read as fine. Deriving it means a reminder is only ever as stale
 * as the data itself.
 */

export type ReminderKind = 'maintenance' | 'inspection' | 'insurance'
export type ReminderSeverity = 'overdue' | 'due-soon' | 'upcoming'

export interface Reminder {
  id: string
  kind: ReminderKind
  severity: ReminderSeverity
  title: string
  /** The binding constraint, e.g. "Overdue by 1,240 km". */
  detail: string
  /** The other constraint when both a distance and a date are set. */
  secondary?: string
  /** Negative once past due. */
  dueInKm?: number
  dueInDays?: number
  /** Where to go to deal with it. */
  to: string
}

/** A service is worth flagging once it's within this many km. */
export const DUE_SOON_KM = 1000
/** And this many days, for both services and document expiries. */
export const DUE_SOON_DAYS = 30

const SEVERITY_RANK: Record<ReminderSeverity, number> = {
  overdue: 0,
  'due-soon': 1,
  upcoming: 2,
}

function severityFromKm(km: number): ReminderSeverity {
  if (km < 0) return 'overdue'
  if (km <= DUE_SOON_KM) return 'due-soon'
  return 'upcoming'
}

function severityFromDays(days: number): ReminderSeverity {
  if (days < 0) return 'overdue'
  if (days <= DUE_SOON_DAYS) return 'due-soon'
  return 'upcoming'
}

function worse(a: ReminderSeverity, b: ReminderSeverity): ReminderSeverity {
  return SEVERITY_RANK[a] <= SEVERITY_RANK[b] ? a : b
}

/**
 * Severity for a service interval given as a distance, a date, or both.
 * Shared with the entry drill-down so an interval reads the same everywhere.
 */
export function severityForInterval(
  dueInKm?: number,
  dueInDays?: number,
): ReminderSeverity {
  const severities: ReminderSeverity[] = []
  if (dueInKm !== undefined) severities.push(severityFromKm(dueInKm))
  if (dueInDays !== undefined) severities.push(severityFromDays(dueInDays))
  if (severities.length === 0) return 'upcoming'
  return severities.reduce(worse)
}

/** Document status, recomputed from the expiry date instead of trusted. */
export function deriveDocStatus(expirationDate?: string, today: Date = new Date()): DocStatus {
  if (!expirationDate) return 'valid'
  const days = daysUntil(expirationDate, today)
  if (days < 0) return 'expired'
  if (days <= DUE_SOON_DAYS) return 'expiring'
  return 'valid'
}

function describeKm(km: number): string {
  const rounded = formatNumber(Math.abs(km), 0)
  return km < 0 ? `Overdue by ${rounded} km` : `Due in ${rounded} km`
}

function describeDays(days: number): string {
  if (days === 0) return 'Due today'
  const rounded = Math.abs(days)
  return days < 0
    ? `Overdue by ${rounded} day${rounded === 1 ? '' : 's'}`
    : `Due in ${rounded} day${rounded === 1 ? '' : 's'}`
}

/**
 * Documents that represent an inspection.
 *
 * The schema has no Inspection category, so inspections have always been
 * "a Maintenance document with an expiry date". Paying attention to the name
 * keeps a service invoice with an expiry from being mistaken for one.
 */
export function isInspectionDoc(doc: DocumentItem): boolean {
  if (!doc.expirationDate) return false
  const name = doc.name.toLowerCase()
  const looksLikeInspection = /inspection|keuring|controle technique|tüv|mot\b/.test(name)
  return looksLikeInspection || doc.category === 'Maintenance'
}

/** The soonest-expiring document in a category, which is the one that matters. */
function expiringDocs(documents: DocumentItem[], predicate: (d: DocumentItem) => boolean) {
  return documents
    .filter((d) => d.expirationDate && predicate(d))
    .sort((a, b) => daysUntil(a.expirationDate!) - daysUntil(b.expirationDate!))
}

/**
 * Rank by how much of the runway is gone, so overdue sorts before due-soon and
 * the most overdue comes first. Distances are only a tiebreaker and are roughly
 * translated into days for ordering — the displayed figures stay exact.
 */
function urgencyOf(reminder: Reminder): number {
  if (reminder.dueInDays !== undefined) return reminder.dueInDays
  // ~1000 km a month, i.e. about 33 km a day.
  return (reminder.dueInKm ?? 0) / 33
}

export function sortReminders(reminders: Reminder[]): Reminder[] {
  return [...reminders].sort((a, b) => {
    const bySeverity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (bySeverity !== 0) return bySeverity
    return urgencyOf(a) - urgencyOf(b)
  })
}

/** Every reminder the data implies, regardless of the user's toggles. */
export function buildReminders(data: CarData, today: Date = new Date()): Reminder[] {
  const reminders: Reminder[] = []
  const { currentMileage } = data.vehicle

  // --- service intervals, by distance and/or date -------------------------
  for (const entry of data.maintenance) {
    const dueInKm =
      entry.nextIntervalKm !== undefined ? entry.nextIntervalKm - currentMileage : undefined
    const dueInDays = entry.nextIntervalDate ? daysUntil(entry.nextIntervalDate, today) : undefined
    if (dueInKm === undefined && dueInDays === undefined) continue

    // Which of the two constraints leads? Whichever reads as more pressing —
    // severity first, then how close it is. Distances are converted to a rough
    // day-equivalent purely for this comparison.
    const byKm = { km: true, severity: severityFromKm(dueInKm ?? 0), score: (dueInKm ?? 0) / 33 }
    const byDate = { km: false, severity: severityFromDays(dueInDays ?? 0), score: dueInDays ?? 0 }
    const candidates = [
      ...(dueInKm !== undefined ? [byKm] : []),
      ...(dueInDays !== undefined ? [byDate] : []),
    ].sort(
      (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.score - b.score,
    )
    const lead = candidates[0]
    if (!lead) continue // unreachable: skipped above when neither is set
    const severity = severityForInterval(dueInKm, dueInDays)

    reminders.push({
      id: `maintenance:${entry.id}`,
      kind: 'maintenance',
      severity,
      title: entry.type,
      detail: lead.km ? describeKm(dueInKm!) : describeDays(dueInDays!),
      secondary: lead.km
        ? entry.nextIntervalDate
          ? `or ${formatDate(entry.nextIntervalDate)}`
          : undefined
        : entry.nextIntervalKm !== undefined
          ? `also at ${formatKm(entry.nextIntervalKm)}`
          : undefined,
      dueInKm,
      dueInDays,
      to: '/maintenance',
    })
  }

  // --- inspections and insurance expire on a date -------------------------
  for (const doc of expiringDocs(data.documents, isInspectionDoc)) {
    const dueInDays = daysUntil(doc.expirationDate!, today)
    reminders.push({
      id: `inspection:${doc.id}`,
      kind: 'inspection',
      severity: severityFromDays(dueInDays),
      title: doc.name,
      detail: describeDays(dueInDays),
      secondary: formatDate(doc.expirationDate!),
      dueInDays,
      to: '/documents',
    })
  }

  for (const doc of expiringDocs(data.documents, (d) => d.category === 'Insurance')) {
    const dueInDays = daysUntil(doc.expirationDate!, today)
    reminders.push({
      id: `insurance:${doc.id}`,
      kind: 'insurance',
      severity: severityFromDays(dueInDays),
      title: doc.name,
      detail: describeDays(dueInDays),
      secondary: formatDate(doc.expirationDate!),
      dueInDays,
      to: '/documents',
    })
  }

  return sortReminders(reminders)
}

/** Is this category switched off in Settings? */
export function isReminderMuted(kind: ReminderKind, settings: AppSettings): boolean {
  switch (kind) {
    case 'maintenance':
      return !settings.maintenanceReminders
    case 'inspection':
      return !settings.inspectionReminders
    case 'insurance':
      return !settings.insuranceReminders
  }
}

/**
 * Only what the user asked to be told about. Muted categories are filtered here
 * rather than dropped from `buildReminders`, so the Reminders page can still
 * show that something is waiting behind a disabled toggle.
 */
export function activeReminders(reminders: Reminder[], settings: AppSettings): Reminder[] {
  return reminders.filter((reminder) => !isReminderMuted(reminder.kind, settings))
}

export interface ReminderSummary {
  total: number
  overdue: number
  dueSoon: number
  upcoming: number
}

export function summarise(reminders: Reminder[]): ReminderSummary {
  return {
    total: reminders.length,
    overdue: reminders.filter((r) => r.severity === 'overdue').length,
    dueSoon: reminders.filter((r) => r.severity === 'due-soon').length,
    upcoming: reminders.filter((r) => r.severity === 'upcoming').length,
  }
}

export const KIND_LABEL: Record<ReminderKind, string> = {
  maintenance: 'Maintenance',
  inspection: 'Inspection',
  insurance: 'Insurance',
}
