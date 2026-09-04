import { NavLink } from 'react-router-dom'
import { ChevronRight, Car } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { moreNav } from '@/lib/nav'
import { useCarData } from '@/context/DataContext'

export default function More() {
  const { data, vehicles } = useCarData()

  return (
    <div className="fade-in">
      <Header title="More" subtitle={`Signed in as ${data.vehicle.owner}`} />
      <div className="rounded-2xl overflow-hidden card-surface shadow-card divide-y divide-white/5 mb-4">
        <NavLink to="/vehicles" className="flex items-center gap-3.5 px-4 py-4 hover:bg-white/[0.03] transition-colors">
          <div className="rounded-xl bg-accent/15 p-2.5">
            <Car size={17} className="text-accent-light" />
          </div>
          <div className="flex-1">
            <span className="block text-sm font-medium text-gray-100">Switch vehicle</span>
            <span className="block text-xs text-gray-500">{data.vehicle.make} {data.vehicle.model}{vehicles.length > 1 ? ` · ${vehicles.length} cars` : ''}</span>
          </div>
          <ChevronRight size={16} className="text-gray-600" />
        </NavLink>
      </div>
      <div className="rounded-2xl overflow-hidden card-surface shadow-card divide-y divide-white/5">
        {moreNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="flex items-center gap-3.5 px-4 py-4 hover:bg-white/[0.03] transition-colors"
          >
            <div className="rounded-xl bg-white/5 p-2.5">
              <item.icon size={17} className="text-gray-300" />
            </div>
            <span className="flex-1 text-sm font-medium text-gray-100">{item.label}</span>
            <ChevronRight size={16} className="text-gray-600" />
          </NavLink>
        ))}
      </div>
    </div>
  )
}
