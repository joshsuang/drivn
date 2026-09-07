import { CloudSun, Search } from 'lucide-react'
import { useCarData } from '@/context/DataContext'

export function CockpitTopBar() {
  const { data } = useCarData()
  const { vehicle } = data

  return (
    <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-white/5">
      <div>
        <p className="text-sm font-bold text-white tracking-tight leading-none">
          {vehicle.make} {vehicle.model}
        </p>
        <p className="text-[11px] text-gray-500 mt-1">
          {vehicle.engine} · {vehicle.power} · {vehicle.transmission} · {vehicle.drive}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="text-gray-200 font-medium">14°C</span>
          <CloudSun size={15} className="text-[#ff5a3c]" />
          <span>Herentals</span>
        </div>
        <button className="text-gray-500 hover:text-gray-300 transition-colors">
          <Search size={16} />
        </button>
      </div>
    </div>
  )
}
