import type { Modification } from '@/types'
import { Card } from './ui/Card'
import { Badge } from './ui/Badge'
import { formatDate, formatCurrency } from '@/lib/format'

interface ModificationCardProps {
  mod: Modification
  onClick?: () => void
}

export function ModificationCard({ mod, onClick }: ModificationCardProps) {
  return (
    <Card padded={false} className="overflow-hidden cursor-pointer group" onClick={onClick}>
      <div className="aspect-[4/3] overflow-hidden bg-base-800">
        <img
          src={mod.imageUrl}
          alt={mod.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="text-sm font-medium text-gray-100 leading-snug">{mod.name}</h4>
          <Badge tone="accent">{mod.category}</Badge>
        </div>
        <p className="text-xs text-gray-500">{formatDate(mod.dateInstalled)}</p>
        {mod.price > 0 && <p className="text-xs text-gray-400 mt-1">{formatCurrency(mod.price)}</p>}
      </div>
    </Card>
  )
}
