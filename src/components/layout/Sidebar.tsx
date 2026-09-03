import { NavLink } from 'react-router-dom'
import { Gauge, ChevronDown } from 'lucide-react'
import { primaryNav } from '@/lib/nav'
import { useCarData } from '@/context/DataContext'

export function Sidebar() {
  const { data } = useCarData()

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-white/5 bg-base-900/60 px-4 py-6">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="rounded-xl bg-accent/15 p-2">
          <Gauge size={20} className="text-accent-light" />
        </div>
        <div>
          <p className="text-[13px] font-bold tracking-tight text-gray-50 leading-none">MY CAR</p>
          <p className="text-[10px] text-gray-500 tracking-wide leading-none mt-1">DASHBOARD</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {primaryNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent/15 text-accent-light'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
              }`
            }
          >
            <item.icon size={17} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <NavLink
        to="/settings"
        className="flex items-center gap-3 px-2 py-2.5 mt-4 rounded-xl hover:bg-white/5 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent-light shrink-0">
          {data.vehicle.owner.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-100 truncate">{data.vehicle.owner}</p>
          <p className="text-[11px] text-gray-500">View profile</p>
        </div>
        <ChevronDown size={14} className="text-gray-600" />
      </NavLink>
    </aside>
  )
}
