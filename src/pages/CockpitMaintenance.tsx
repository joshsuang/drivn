import { useMemo } from 'react'
import { useCarData } from '@/context/DataContext'
import { RadialGauge } from '@/components/cockpit/RadialGauge'
import { formatDate, formatCurrency } from '@/lib/format'

const SYSTEM_LABELS = ['Engine Oil', 'Brakes', 'Tires', 'Air Filter', 'Coolant', 'Brake Fluid']

export default function CockpitMaintenance() {
  const { data } = useCarData()
  const { maintenance, vehicle } = data

  const nextService = maintenance[0]
  const kmLeft = nextService?.nextIntervalKm ? Math.max(0, nextService.nextIntervalKm - vehicle.currentMileage) : null

  // Derive a rough "percent life remaining" per system from how recently it was serviced,
  // matched by keyword against the maintenance log. No fabricated telemetry — just your data.
  const systems = useMemo(() => {
    return SYSTEM_LABELS.map((label) => {
      const keyword = label.split(' ')[0].toLowerCase()
      const match = maintenance.find((m) => m.type.toLowerCase().includes(keyword))
      if (!match) return { label, pct: 100, status: 'good' as const }
      const kmSince = vehicle.currentMileage - match.mileage
      const interval = match.nextIntervalKm ? match.nextIntervalKm - match.mileage : 15000
      const pct = Math.max(0, Math.min(100, Math.round(100 - (kmSince / interval) * 100)))
      return { label, pct, status: pct > 40 ? ('good' as const) : pct > 15 ? ('warn' as const) : ('bad' as const) }
    })
  }, [maintenance, vehicle.currentMileage])

  const statusColor = { good: '#34d399', warn: '#f5a524', bad: '#ff5a3c' }

  return (
    <div className="fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-10 items-start mb-10">
        <div className="mx-auto">
          <RadialGauge
            value={kmLeft ?? 0}
            displayValue={kmLeft !== null ? kmLeft.toLocaleString('en-US') : '—'}
            unit="KM until service"
            label="Next Service"
            max={20000}
            color="#ff5a3c"
            size={220}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
          {systems.map((s) => (
            <div key={s.label} className="border border-white/8 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">{s.label}</span>
                <span className="text-[10px] font-medium uppercase" style={{ color: statusColor[s.status] }}>
                  {s.status === 'good' ? 'Good' : s.status === 'warn' ? 'Soon' : 'Check'}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${s.pct}%`, backgroundColor: statusColor[s.status] }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5 tabular-nums">{s.pct}%</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.25em] text-gray-500 uppercase mb-4">Service History</p>
        <div className="flex flex-col">
          {maintenance.map((m, i) => (
            <div key={m.id}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-100">{m.type}</p>
                  <p className="text-[11px] text-gray-500">{m.garage} \u00b7 {vehicle.currentMileage >= m.mileage ? `${m.mileage.toLocaleString('en-US')} km` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-300 tabular-nums">{formatCurrency(m.cost)}</p>
                  <p className="text-[10px] text-gray-600">{formatDate(m.date)}</p>
                </div>
              </div>
              {i < maintenance.length - 1 && <div className="h-px bg-white/5" />}
            </div>
          ))}
          {maintenance.length === 0 && <p className="text-sm text-gray-500">No service history yet.</p>}
        </div>
      </div>
    </div>
  )
}
