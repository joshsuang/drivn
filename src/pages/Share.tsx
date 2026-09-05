import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { Download, Gauge, Fuel, Wallet, Wrench, Sparkles, Map as MapIcon } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useCarData } from '@/context/DataContext'
import { formatKm, formatCurrency, formatNumber, formatDate } from '@/lib/format'
import { useToast } from '@/context/ToastContext'

type SectionKey = 'stats' | 'maintenance' | 'fuel' | 'modifications' | 'trips'

const sections: { key: SectionKey; label: string; icon: typeof Gauge }[] = [
  { key: 'stats', label: 'Vehicle & mileage summary', icon: Gauge },
  { key: 'maintenance', label: 'Upcoming maintenance', icon: Wrench },
  { key: 'fuel', label: 'Fuel & cost totals', icon: Fuel },
  { key: 'modifications', label: 'Modifications', icon: Sparkles },
  { key: 'trips', label: 'Recent trips', icon: MapIcon },
]

export default function Share() {
  const { data } = useCarData()
  const { showToast } = useToast()
  const [selected, setSelected] = useState<SectionKey[]>(['stats', 'maintenance', 'fuel'])
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  function toggle(key: SectionKey) {
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]))
  }

  const totalFuelCost = data.fuelEntries.reduce((s, f) => s + f.totalCost, 0)
  const avgConsumption =
    data.fuelEntries.filter((f) => f.consumption).reduce((s, f) => s + (f.consumption ?? 0), 0) /
    (data.fuelEntries.filter((f) => f.consumption).length || 1)

  async function exportPng() {
    if (selected.length === 0) {
      showToast('Pick at least one section', 'error')
      return
    }
    setExporting(true)
    try {
      const node = exportRef.current
      if (!node) return
      const canvas = await html2canvas(node, {
        backgroundColor: '#0a0b0e',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `drivn-${data.vehicle.model.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
      showToast('Image exported')
    } catch {
      showToast('Export failed \u2014 try fewer sections', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fade-in">
      <Header title="Share" subtitle="Export a snapshot of your car as an image" />

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">What to include</h3>
        <div className="flex flex-col gap-2">
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => toggle(s.key)}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors ${
                selected.includes(s.key)
                  ? 'bg-accent/15 border-accent/30'
                  : 'bg-white/[0.02] border-white/8 hover:border-white/15'
              }`}
            >
              <s.icon size={16} className={selected.includes(s.key) ? 'text-accent-light' : 'text-gray-500'} />
              <span className={`text-sm flex-1 ${selected.includes(s.key) ? 'text-gray-100' : 'text-gray-400'}`}>{s.label}</span>
              <div
                className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center ${
                  selected.includes(s.key) ? 'bg-accent border-accent' : 'border-white/20'
                }`}
              >
                {selected.includes(s.key) && <div className="w-2 h-2 rounded-sm bg-white" />}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Button onClick={exportPng} disabled={exporting}>
        <Download size={14} /> {exporting ? 'Exporting…' : 'Export as PNG'}
      </Button>

      {/* Offscreen render target for the export image */}
      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <div
          ref={exportRef}
          className="w-[720px] p-8 bg-base-950"
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] text-gray-500 tracking-wide uppercase mb-1">Drivn \u2014 My Car Dashboard</p>
              <h1 className="text-2xl font-bold text-white">
                {data.vehicle.make} {data.vehicle.model}
              </h1>
              <p className="text-sm text-gray-400">{data.vehicle.trim} · {data.vehicle.year}</p>
            </div>
            <img src={data.vehicle.imageUrl} alt="" className="w-28 h-20 object-cover rounded-xl" crossOrigin="anonymous" />
          </div>

          {selected.includes('stats') && (
            <ExportSection title="Vehicle & mileage">
              <div className="grid grid-cols-3 gap-3">
                <ExportStat label="Total mileage" value={formatKm(data.vehicle.currentMileage)} />
                <ExportStat label="Days owned" value={String(Math.floor((Date.now() - new Date(data.vehicle.purchaseDate).getTime()) / 86400000))} />
                <ExportStat label="Trips logged" value={String(data.trips.length)} />
              </div>
            </ExportSection>
          )}

          {selected.includes('fuel') && (
            <ExportSection title="Fuel & costs">
              <div className="grid grid-cols-3 gap-3">
                <ExportStat label="Total fuel cost" value={formatCurrency(totalFuelCost)} />
                <ExportStat label="Avg. consumption" value={`${formatNumber(avgConsumption, 1)} L/100km`} />
                <ExportStat label="Fill-ups logged" value={String(data.fuelEntries.length)} />
              </div>
            </ExportSection>
          )}

          {selected.includes('maintenance') && (
            <ExportSection title="Upcoming maintenance">
              {data.maintenance.filter((m) => m.nextIntervalKm).slice(0, 4).map((m) => (
                <ExportRow
                  key={m.id}
                  label={m.type}
                  value={`in ${formatKm(Math.max(0, (m.nextIntervalKm ?? 0) - data.vehicle.currentMileage))}`}
                />
              ))}
              {data.maintenance.filter((m) => m.nextIntervalKm).length === 0 && (
                <p className="text-sm text-gray-500">No intervals logged yet.</p>
              )}
            </ExportSection>
          )}

          {selected.includes('modifications') && (
            <ExportSection title="Modifications">
              {data.modifications.slice(0, 5).map((m) => (
                <ExportRow key={m.id} label={m.name} value={m.brand} />
              ))}
            </ExportSection>
          )}

          {selected.includes('trips') && (
            <ExportSection title="Recent trips">
              {data.trips.slice(0, 4).map((t) => (
                <ExportRow key={t.id} label={`${t.start} \u2192 ${t.destination}`} value={`${t.distanceKm} km \u00b7 ${formatDate(t.date)}`} />
              ))}
            </ExportSection>
          )}

          <p className="text-[10px] text-gray-600 mt-6 text-right">Exported from Drivn</p>
        </div>
      </div>
    </div>
  )
}

function ExportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">{title}</h3>
      <div className="rounded-2xl border border-white/8 p-4" style={{ backgroundColor: '#111318' }}>
        {children}
      </div>
    </div>
  )
}

function ExportStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-lg font-semibold text-white">{value}</p>
      <p className="text-[11px] text-gray-500">{label}</p>
    </div>
  )
}

function ExportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-200">{label}</span>
      <span className="text-xs text-gray-500">{value}</span>
    </div>
  )
}
