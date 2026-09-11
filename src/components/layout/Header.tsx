import { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CloudSun } from 'lucide-react'
import { useCarData } from '@/context/DataContext'
import { ReminderRow } from '@/components/ReminderRow'
import { activeReminders, buildReminders, summarise } from '@/lib/reminders'

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

  // Derived from the logged intervals and expiry dates, then filtered by the
  // toggles in Settings — so switching one off genuinely stops it appearing.
  const allReminders = useMemo(() => buildReminders(data), [data])
  const reminders = useMemo(
    () => activeReminders(allReminders, data.settings),
    [allReminders, data.settings],
  )
  const summary = summarise(reminders)
  const top = reminders.slice(0, 5)
  const allMuted = reminders.length === 0 && allReminders.length > 0

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
            aria-label={
              summary.total > 0 ? `Reminders (${summary.total})` : 'Reminders'
            }
          >
            <Bell size={19} />
            {summary.total > 0 && (
              <span
                className={`absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center ${
                  summary.overdue > 0 ? 'bg-bad text-white' : 'bg-accent text-white'
                }`}
              >
                {summary.total > 9 ? '9+' : summary.total}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2.5 w-80 bg-base-800 border border-white/10 rounded-xl shadow-2xl py-2 z-30 animate-scale-in">
              <div className="flex items-baseline justify-between px-3.5 py-2">
                <p className="text-xs font-semibold text-gray-300">Reminders</p>
                {summary.total > 0 && (
                  <p className="text-[11px] text-gray-500">
                    {summary.overdue > 0 && (
                      <span className="text-bad font-medium">{summary.overdue} overdue</span>
                    )}
                    {summary.overdue > 0 && summary.dueSoon > 0 && ' · '}
                    {summary.dueSoon > 0 && `${summary.dueSoon} due soon`}
                  </p>
                )}
              </div>

              {allMuted ? (
                <p className="text-xs text-gray-500 px-3.5 py-3">
                  Reminders are switched off in Settings.
                </p>
              ) : reminders.length === 0 ? (
                <p className="text-xs text-gray-500 px-3.5 py-3">
                  Nothing due. Add a next-service interval or a document expiry to be reminded.
                </p>
              ) : (
                top.map((reminder) => <ReminderRow key={reminder.id} reminder={reminder} onNavigate={() => setOpen(false)} />)
              )}

              <div className="flex items-center justify-between px-3.5 pt-2 mt-1 border-t border-white/5">
                <Link
                  to="/reminders"
                  onClick={() => setOpen(false)}
                  className="text-[11px] text-accent-light hover:text-accent-light/80"
                >
                  View all reminders
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="text-[11px] text-gray-500 hover:text-gray-300"
                >
                  Manage
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}