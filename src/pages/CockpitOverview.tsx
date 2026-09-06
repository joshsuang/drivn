import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCarData } from '@/context/DataContext'
import { RadialGauge } from '@/components/cockpit/RadialGauge'
import { HealthRing } from '@/components/cockpit/HealthRing'
import { TelemetryStrip } from '@/components/cockpit/TelemetryStrip'
import { eventMeta } from '@/lib/eventMeta'
import { formatDate, formatCurrency } from '@/lib/format'

export default function CockpitOverview() {
  const { data } = useCarData()
  const { vehicle, maintenance, fuelEntries, documents, timeline } = data

  const nextService = maintenance[0]
  const kmLeft = nextService?.nextIntervalKm ? nextService.nextIntervalKm - vehicle.currentMileage : null

  const avgConsumption = useMemo(() => {
    const withC = fuelEntries.filter((f) => f.consumption)
    if (!withC.length) return 6.5
    return withC.reduce((s, f) => s + (f.consumption ?? 0), 0) / withC.length
  }, [fuelEntries])

  const TANK_LITERS = 42
  const range = Math.round((TANK_LITERS / avgConsumption) * 100)

  const health = useMemo(() => {
    let score = 100
    const subsystems: { label: string; status: 'good' | 'warn' | 'bad' }[] = [
      { label: 'Engine', status: 'good' },
      { label: 'Battery', status: 'good' },
      { label: 'Brakes', status: 'good' },
      { label: 'Tires', status: 'good' },
      { label: 'Fluids', status: 'good' },
    ]
    if (kmLeft !== null) {
      if (kmLeft < 0) {
        score -= 25
        subsystems[0].status = 'bad'
        subsystems[4].status = 'bad'
      } else if (kmLeft < 1000) {
        score -= 10
        subsystems[0].status = 'warn'
        subsystems[4].status = 'warn'
      }
    }
    const expiringDoc = documents.find((d) => d.status === 'expiring')
    if (expiringDoc) score -= 8
    const expiredDoc = documents.find((d) => d.status === 'expired')
    if (expiredDoc) score -= 15
    return { score: Math.max(0, Math.min(100, score)), subsystems }
  }, [kmLeft, documents])

  const totalFuelCost = fuelEntries.reduce((s, f) => s + f.totalCost, 0)

  return (
    <div className="fade-in -mx-4 md:-mx-8 -mt-6 md:-mt-8 px-4 md:px-8 pt-6 md:pt-8 min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #14090a 0%, #08090b 60%)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[11px] tracking-[0.25em] text-gray-500 uppercase">Drivn Cockpit</p>
          <h1 className="text-lg font-bold text-white tracking-tight">{vehicle.make.toUpperCase()} {vehicle.model.toUpperCase()}</h1>
        </div>
        <Link to="/settings" className="text-[10px] tracking-widest uppercase text-gray-500 hover:text-gray-300 border border-white/10 rounded-full px-3 py-1.5">
          Classic UI
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-8 items-center justify-items-center mb-10">
        <RadialGauge value={vehicle.currentMileage} displayValue={vehicle.currentMileage.toLocaleString('en-US')} unit="KM" label="Mileage" max={Math.max(vehicle.currentMileage * 1.15, 20000)} color="#ff5a3c" />

        <div className="text-center">
          <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full max-w-md mx-auto object-contain drop-shadow-[0_20px_40px_rgba(255,90,60,0.15)]" />
          <p className="text-2xl font-bold text-white tracking-tight mt-2">{vehicle.make} {vehicle.model}</p>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
            {vehicle.engine} · {vehicle.power} · {vehicle.transmission} · {vehicle.drive}
          </p>
        </div>

        <HealthRing score={health.score} subsystems={health.subsystems} />
      </div>

      <div className="mb-10">
        <TelemetryStrip
          items={[
            { label: 'Range', value: `${range} km`, color: '#4fb8ff' },
            { label: 'Consumption', value: `${avgConsumption.toFixed(1)} L/100km` },
            { label: 'Next service', value: kmLeft !== null ? `${Math.max(0, kmLeft).toLocaleString('en-US')} km` : '—', color: kmLeft !== null && kmLeft < 1000 ? '#f5a524' : undefined },
            { label: 'Fuel spent', value: formatCurrency(totalFuelCost) },
          ]}
        />
      </div>

      <div>
        <p className="text-[11px] tracking-[0.25em] text-gray-500 uppercase mb-4">Event Log</p>
        <div className="flex flex-col">
          {timeline.slice(0, 6).map((e, i) => {
            const meta = eventMeta[e.type]
            const Icon = meta.icon
            return (
              <div key={e.id}>
                <div className="flex items-center gap-4 py-3">
                  <Icon size={14} className="text-gray-500 shrink-0" />
                  <span className="text-[10px] text-gray-600 tabular-nums w-20 shrink-0">{formatDate(e.date)}</span>
                  <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide flex-1 truncate">{e.title}</span>
                  {e.cost !== undefined && <span className="text-xs text-gray-500 tabular-nums">{formatCurrency(e.cost)}</span>}
                </div>
                {i < 5 && <div className="h-px bg-white/5" />}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
