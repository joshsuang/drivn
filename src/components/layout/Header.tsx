import { Bell, CloudSun } from 'lucide-react'

interface HeaderProps {
  title: string
  subtitle?: string
  showWeather?: boolean
}

export function Header({ title, subtitle, showWeather }: HeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 md:mb-8">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-50 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4 shrink-0 pt-1">
        {showWeather && (
          <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400">
            <span className="text-gray-200 font-medium">20°C</span>
            <CloudSun size={16} className="text-accent-light" />
            <span>Herentals</span>
          </div>
        )}
        <button className="relative text-gray-400 hover:text-gray-100 transition-colors">
          <Bell size={19} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
        </button>
      </div>
    </div>
  )
}
