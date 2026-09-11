import { Route as RouteIcon, CalendarDays, TrendingDown, TrendingUp, Minus, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { TimelineItem } from '@/components/TimelineItem'
import { SEVERITY_TEXT } from '@/components/ReminderRow'
import type { FuelEntryDetail, MaintenanceEntryDetail, MetricDelta, TimelineContext } from '@/lib/entryDetail'
import { formatCurrency, formatDate, formatKm, formatNumber } from '@/lib/format'

/**
 * The per-entry drill-down: what this fill-up or service changed, and what was
 * happening around it.
 *
 * Deliberately reports the *actual* movement of the lifetime average rather than
 * a flattering number — one fill-up among thirty barely shifts the average, and
 * saying so is more honest than implying otherwise.
 */
export function FuelEntryDetailView({
  detail,
  onEdit,
}: {
  detail: FuelEntryDetail
  onEdit?: () => void
}) {
  const { entry } = detail
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-300">{formatDate(entry.date)}</span>
        {entry.station && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} /> {entry.station}
          </span>
        )}
        <Badge tone={entry.fullTank ? 'good' : 'neutral'}>
          {entry.fullTank ? 'Full tank' : 'Partial'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Liters" value={`${formatNumber(entry.liters, 1)} L`} />
        <Stat label="Price per litre" value={formatCurrency(entry.pricePerLiter)} />
        <Stat label="Total cost" value={formatCurrency(entry.totalCost)} />
        <Stat
          label="Consumption"
          value={entry.consumption ? `${formatNumber(entry.consumption, 1)} L/100km` : '—'}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <NeighbourBlock
          title="Since the previous fill-up"
          neighbour={detail.previous}
          fallback="This is the first fill-up on record."
        />
        <NeighbourBlock
          title="Until the next fill-up"
          neighbour={detail.next}
          fallback="Nothing logged after this one."
        />
      </div>

      <MetricList metrics={detail.metrics} />

      <ShareLine
        text={`Fill-up ${detail.position} of ${detail.total} · ${formatCurrency(
          detail.cumulativeCost,
        )} of ${formatCurrency(detail.lifetimeCost)} lifetime fuel spend — this one is ${formatNumber(
          detail.costShare * 100,
          0,
        )}%`}
        share={detail.costShare}
      />

      <ContextList context={detail.context} label="Around this fill-up" />

      {onEdit && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit this entry
          </Button>
        </div>
      )}
    </div>
  )
}

export function MaintenanceEntryDetailView({
  detail,
  onEdit,
}: {
  detail: MaintenanceEntryDetail
  onEdit?: () => void
}) {
  const { entry, interval } = detail
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-300">{formatDate(entry.date)}</span>
        {entry.garage && (
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} /> {entry.garage}
          </span>
        )}
        <Badge tone="neutral">{entry.type}</Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Stat label="Cost" value={formatCurrency(entry.cost)} />
        <Stat label="Mileage" value={formatKm(entry.mileage)} />
        <Stat
          label="Share of spend"
          value={`${formatNumber(detail.costShare * 100, 0)}%`}
        />
      </div>

      {interval ? (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-gray-300">Next interval</h4>
            <Badge
              tone={
                interval.severity === 'overdue'
                  ? 'bad'
                  : interval.severity === 'due-soon'
                    ? 'warn'
                    : 'neutral'
              }
            >
              {interval.severity === 'overdue'
                ? 'Overdue'
                : interval.severity === 'due-soon'
                  ? 'Due soon'
                  : 'Scheduled'}
            </Badge>
          </div>
          <div className="flex flex-col gap-1">
            {interval.dueInKm !== undefined && (
              <p className={`text-xs ${SEVERITY_TEXT[interval.severity]}`}>
                Distance: {describeKm(interval.dueInKm)}
              </p>
            )}
            {interval.dueInDays !== undefined && (
              <p className={`text-xs ${SEVERITY_TEXT[interval.severity]}`}>
                Date: {describeDays(interval.dueInDays)}
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-5">
          No next interval set — add one when editing to get reminded about this service.
        </p>
      )}

      {entry.notes && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 mb-5">
          <h4 className="text-xs font-semibold text-gray-300 mb-1.5">Notes</h4>
          <p className="text-xs text-gray-400 whitespace-pre-wrap">{entry.notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <NeighbourBlock
          title="Since the previous service"
          neighbour={detail.previous}
          fallback="This is the first service on record."
        />
        <NeighbourBlock
          title="Until the next service"
          neighbour={detail.next}
          fallback="No later service logged."
        />
      </div>

      <MetricList metrics={detail.metrics} />

      <ShareLine
        text={`Service ${detail.position} of ${detail.total} · ${formatCurrency(
          detail.cumulativeCost,
        )} of ${formatCurrency(detail.lifetimeCost)} lifetime maintenance spend — this one is ${formatNumber(
          detail.costShare * 100,
          0,
        )}%`}
        share={detail.costShare}
      />

      <ContextList context={detail.context} label="Around this service" />

      {onEdit && (
        <div className="mt-5 pt-4 border-t border-white/5">
          <Button variant="secondary" size="sm" onClick={onEdit}>
            Edit this entry
          </Button>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ pieces

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/5 px-3.5 py-3">
      <p className="text-sm font-semibold text-gray-100">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}

function NeighbourBlock<E>({
  title,
  neighbour,
  fallback,
}: {
  title: string
  neighbour?: { entry: E; distanceKm: number; days: number }
  fallback: string
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
      <h4 className="text-[11px] font-medium text-gray-400 mb-2">{title}</h4>
      {neighbour ? (
        neighbour.distanceKm === 0 && neighbour.days === 0 ? (
          // Two services logged at the same reading on the same day are one visit
          // to the garage; "0 km · 0 days" reads like a bug otherwise.
          <p className="text-xs text-gray-300">Same visit — logged at the same mileage.</p>
        ) : (
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-200">
              <RouteIcon size={13} className="text-gray-500" />
              {formatKm(neighbour.distanceKm)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-200">
              <CalendarDays size={13} className="text-gray-500" />
              {neighbour.days === 1 ? '1 day' : `${neighbour.days} days`}
            </span>
          </div>
        )
      ) : (
        <p className="text-[11px] text-gray-600">{fallback}</p>
      )}
    </div>
  )
}

function MetricList({ metrics }: { metrics: MetricDelta[] }) {
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold text-gray-300 mb-1">Effect on your averages</h4>
      <p className="text-[11px] text-gray-500 mb-3">
        The running figure before this entry, and after it.
      </p>
      <div className="rounded-xl border border-white/8 divide-y divide-white/5">
        {metrics.map((metric) => (
          <MetricRow key={metric.label} metric={metric} />
        ))}
      </div>
    </div>
  )
}

function MetricRow({ metric }: { metric: MetricDelta }) {
  const { label, unit, before, after, delta, decimals, polarity } = metric
  // Compare at the precision actually shown, so 0.001 doesn't read as a change.
  const rounded = delta === null ? null : Number(delta.toFixed(decimals))
  const moved = rounded === null || rounded === 0 ? null : rounded
  // A neutral metric still shows its direction, just without a verdict.
  const improved =
    moved === null || polarity === 'neutral'
      ? null
      : polarity === 'lower-better'
        ? moved < 0
        : moved > 0
  const tone =
    moved === null
      ? 'text-gray-500'
      : polarity === 'neutral'
        ? 'text-gray-300'
        : improved
          ? 'text-good'
          : 'text-bad'
  const Icon = moved === null ? Minus : moved < 0 ? TrendingDown : TrendingUp

  const value = (v: number | null) => (v === null ? '—' : formatNumber(v, decimals))

  // Two lines so the before/after survives on a phone — it used to be hidden
  // below `sm`, which dropped the most useful part of the row.
  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-gray-300 truncate">{label}</span>
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-medium shrink-0 ${tone}`}
        >
          <Icon size={12} />
          {moved === null ? 'no change' : formatNumber(Math.abs(moved), decimals)}
        </span>
      </div>
      <p className="text-[11px] text-gray-500 mt-1">
        {value(before)} <span className="text-gray-700">→</span>{' '}
        <span className="text-gray-400">{value(after)}</span>
        {unit && <span className="ml-1 text-gray-600">{unit}</span>}
      </p>
    </div>
  )
}

function ShareLine({ text, share }: { text: string; share: number }) {
  return (
    <div className="mb-5">
      <p className="text-[11px] text-gray-500 mb-1.5">{text}</p>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${Math.min(100, Math.max(2, share * 100))}%` }}
        />
      </div>
    </div>
  )
}

function ContextList({ context, label }: { context: TimelineContext; label: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-300 mb-3">{label}</h4>
      {context.events.length === 0 ? (
        <p className="text-[11px] text-gray-600">Nothing else logged around this date.</p>
      ) : (
        <div className="max-w-2xl">
          {context.events.map((event, i) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={i === context.events.length - 1}
              highlight={event.id === context.ownEventId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function describeKm(dueInKm: number): string {
  const value = formatKm(Math.abs(dueInKm))
  return dueInKm < 0 ? `overdue by ${value}` : `due in ${value}`
}

function describeDays(dueInDays: number): string {
  if (dueInDays === 0) return 'due today'
  const days = Math.abs(dueInDays)
  const plural = `${days} ${days === 1 ? 'day' : 'days'}`
  return dueInDays < 0 ? `overdue by ${plural}` : `due in ${plural}`
}
