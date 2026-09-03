import type { TimelineEvent } from '@/types'
import { eventMeta } from '@/lib/eventMeta'
import { formatDate, formatKm, formatCurrency } from '@/lib/format'

interface TimelineItemProps {
  event: TimelineEvent
  onClick?: () => void
  isLast?: boolean
}

export function TimelineItem({ event, onClick, isLast }: TimelineItemProps) {
  const meta = eventMeta[event.type]
  const Icon = meta.icon

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex gap-4 group"
    >
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`rounded-full p-2.5 ${meta.bg} border border-white/5 group-hover:scale-105 transition-transform`}
        >
          <Icon size={16} className={meta.color} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-white/10 my-1" />}
      </div>
      <div className="pb-6 min-w-0 flex-1">
        <p className="text-[11px] text-gray-500 mb-0.5">{formatDate(event.date)}</p>
        <p className="text-sm font-medium text-gray-100 group-hover:text-accent-light transition-colors truncate">
          {event.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{event.description}</p>
        <div className="flex items-center gap-2 mt-1.5">
          {event.mileage !== undefined && (
            <span className="text-[11px] text-gray-600">{formatKm(event.mileage)}</span>
          )}
          {event.cost !== undefined && (
            <span className="text-[11px] text-gray-600">{formatCurrency(event.cost)}</span>
          )}
        </div>
      </div>
    </button>
  )
}
