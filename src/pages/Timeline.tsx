import { useMemo, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { TimelineItem } from '@/components/TimelineItem'
import { eventMeta } from '@/lib/eventMeta'
import { useCarData } from '@/context/DataContext'
import type { EventType, TimelineEvent } from '@/types'
import { formatDate, formatKm, formatCurrency } from '@/lib/format'

const filters: { label: string; value: EventType | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Trips', value: 'trip' },
  { label: 'Mods', value: 'modification' },
  { label: 'Fuel', value: 'fuel' },
  { label: 'Documents', value: 'document' },
]

export default function Timeline() {
  const { data } = useCarData()
  const [filter, setFilter] = useState<EventType | 'all'>('all')
  const [selected, setSelected] = useState<TimelineEvent | null>(null)

  const events = useMemo(() => {
    const sorted = [...data.timeline].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return filter === 'all' ? sorted : sorted.filter((e) => e.type === filter)
  }, [data.timeline, filter])

  return (
    <div className="fade-in">
      <Header title="Timeline" subtitle="Full history of your car" />

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-1">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 text-xs font-medium px-3.5 py-2 rounded-full border transition-colors ${
              filter === f.value
                ? 'bg-accent/20 border-accent/30 text-accent-light'
                : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <Card>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">No events for this filter yet.</p>
        ) : (
          <div className="max-w-2xl">
            {events.map((event, i) => (
              <TimelineItem
                key={event.id}
                event={event}
                isLast={i === events.length - 1}
                onClick={() => setSelected(event)}
              />
            ))}
          </div>
        )}
      </Card>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title ?? ''}>
        {selected && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              {(() => {
                const meta = eventMeta[selected.type]
                const Icon = meta.icon
                return (
                  <div className={`rounded-lg p-2 ${meta.bg}`}>
                    <Icon size={16} className={meta.color} />
                  </div>
                )
              })()}
              <span className="text-xs text-gray-500">{formatDate(selected.date)}</span>
            </div>
            {selected.imageUrl && (
              <img src={selected.imageUrl} alt={selected.title} className="w-full h-40 object-cover rounded-xl mb-4" />
            )}
            <p className="text-sm text-gray-300 mb-4">{selected.description}</p>
            <div className="flex gap-4">
              {selected.mileage !== undefined && (
                <div>
                  <p className="text-[11px] text-gray-500">Mileage</p>
                  <p className="text-sm font-medium text-gray-100">{formatKm(selected.mileage)}</p>
                </div>
              )}
              {selected.cost !== undefined && (
                <div>
                  <p className="text-[11px] text-gray-500">Cost</p>
                  <p className="text-sm font-medium text-gray-100">{formatCurrency(selected.cost)}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
