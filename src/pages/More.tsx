import { NavLink } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { moreNav } from '@/lib/nav'
import { useCarData } from '@/context/DataContext'

export default function More() {
  const { data } = useCarData()

  return (
    <div className="fade-in">
      <Header title="More" subtitle={`Signed in as ${data.vehicle.owner}`} />
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
