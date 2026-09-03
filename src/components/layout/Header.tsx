import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CloudSun, Wrench, ShieldCheck, FileCheck2 } from 'lucide-react'
import { useCarData } from '@/context/DataContext'
import { formatKm } from '@/lib/format'

interface HeaderProps {
  title: string
  subtitle?: string
  showWeather?: boolean
}

export function Header({ title, subtitle, showWeather }: HeaderProps) {
  const { data } = useCarData()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const nextService = data.maintenance[0]
  const kmLeft = nextService?.nextIntervalKm
    ? nextService.nextIntervalKm - data.vehicle.currentMileage
    : null
  const expiringDoc = data.documents.find((d) => d.status === 'expiring')

  const notifications = [
    data.settings.maintenanceReminders && kmLeft !== null && kmLeft < 3000
      ? { icon: Wrench, tone: 'text-warn', text: `Oil change due in ${formatKm(kmLeft!)}`, to: '/maintenance' }
      : null,
    data.settings.inspectionReminders && expiringDoc
      ? { icon: FileCheck2, tone: 'text-accent-light', text: `${expiringDoc.name} expires soon`, to: '/documents' }
      : null,
    data.settings.insuranceReminders
      ? { icon: ShieldCheck, tone: 'text-good', text: 'Insurance renews 28 Feb 2027', to: '/documents' }
      : null,
  ].filter(Boolean) as { icon: typeof Wrench; tone: string; text: string; to: string }[]

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
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative text-gray-400 hover:text-gray-100 transition-colors"
          >
            <Bell size={19} />
            {notifications.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
          {open && (
            <div className="absolute right-0 mt-2.5 w-72 bg-base-800 border border-white/10 rounded-xl shadow-2xl py-2 z-30 animate-scale-in">
              <p className="text-xs font-semibold text-gray-300 px-3.5 py-2">Notifications</p>
              {notifications.length === 0 ? (
                <p className="text-xs text-gray-500 px-3.5 py-3">You're all caught up.</p>
              ) : (
                notifications.map((n, i) => (
                  <Link
                    key={i}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-white/5 transition-colors"
                  >
                    <n.icon size={15} className={n.tone} />
                    <span className="text-xs text-gray-200">{n.text}</span>
                  </Link>
                ))
              )}
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="block text-[11px] text-accent-light hover:text-accent-light/80 px-3.5 pt-2 mt-1 border-t border-white/5"
              >
                Manage reminders
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
