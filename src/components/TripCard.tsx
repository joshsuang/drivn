import { Route, Clock, Fuel, Wallet } from 'lucide-react'
import type { Trip } from '@/types'
import { Card } from './ui/Card'
import { RouteMap } from './RouteMap'
import { formatDate, formatDuration, formatCurrency, formatNumber } from '@/lib/format'

interface TripCardProps {
  trip: Trip
  onClick?: () => void
}

export function TripCard({ trip, onClick }: TripCardProps) {
  return (
    <Card padded={false} className="overflow-hidden cursor-pointer group" onClick={onClick}>
      <RouteMap start={trip.start} destination={trip.destination} route={trip.route} className="h-32 w-full" />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-sm font-semibold text-gray-100 group-hover:text-accent-light transition-colors">
            {trip.name}
          </h4>
          <span className="text-[11px] text-gray-500">{formatDate(trip.date)}</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <Route size={13} className="text-gray-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-gray-200">{trip.distanceKm} km</p>
          </div>
          <div>
            <Clock size={13} className="text-gray-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-gray-200">{formatDuration(trip.durationMinutes)}</p>
          </div>
          <div>
            <Fuel size={13} className="text-gray-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-gray-200">{formatNumber(trip.consumption, 1)} L</p>
          </div>
          <div>
            <Wallet size={13} className="text-gray-500 mx-auto mb-1" />
            <p className="text-xs font-medium text-gray-200">{formatCurrency(trip.fuelCost)}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
