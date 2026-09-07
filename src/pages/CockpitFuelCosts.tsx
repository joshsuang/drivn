import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useCarData } from '@/context/DataContext'
import { Donut } from '@/components/cockpit/Donut'
import { formatCurrency, formatNumber, formatDate } from '@/lib/format'

export default function CockpitFuelCosts() {
  const { data } = useCarData()
  const { fuelEntries, maintenance, expenses } = data

  const thisMonth = new Date().getMonth()
  const thisYear = new Date().getFullYear()
  const inMonth = (d: string) => {
    const dt = new Date(d)
    return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear
  }

  const fuelCost = fuelEntries.filter((f) => inMonth(f.date)).reduce((s, f) => s + f.totalCost, 0)
  const maintCost = maintenance.filter((m) => inMonth(m.date)).reduce((s, m) => s + m.cost, 0)
  const tollCost = expenses.filter((e) => inMonth(e.date) && e.category === 'Parking').reduce((s, e) => s + e.cost, 0)
  const otherCost = expenses
    .filter((e) => inMonth(e.date) && e.category !== 'Insurance' && e.category !== 'Parking')
    .reduce((s, e) => s + e.cost, 0)
  const total = fuelCost + maintCost + tollCost + otherCost || 1

  const slices = [
    { label: 'Fuel', value: fuelCost, color: '#ff5a3c' },
    { label: 'Maintenance', value: maintCost, color: '#f5a524' },
    { label: 'Tolls/Parking', value: tollCost, color: '#4fb8ff' },
    { label: 'Other', value: otherCost, color: '#6b7280' },
  ]

  const chartData = useMemo(
    () =>
      [...fuelEntries]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((f) => ({ date: formatDate(f.date), price: f.pricePerLiter, cost: f.totalCost })),
    [fuelEntries]
  )

  return (
    <div className="fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-10 items-center mb-10">
        <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
          <Donut slices={slices} size={200} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white tabular-nums">{formatCurrency(total === 1 && fuelCost + maintCost + tollCost + otherCost === 0 ? 0 : total)}</span>
            <span className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mt-1">This month</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          {slices.map((s) => (
            <div key={s.label} className="border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-white tabular-nums">{formatCurrency(s.value)}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{Math.round((s.value / total) * 100)}%</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[11px] tracking-[0.25em] text-gray-500 uppercase mb-4">Price per liter, over time</p>
        <div className="h-40 border-y border-white/8 py-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: '#0a0708', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`\u20ac${formatNumber(v, 2)}`, 'Price/L']}
              />
              <Line type="monotone" dataKey="price" stroke="#4fb8ff" strokeWidth={2} dot={{ r: 2, fill: '#4fb8ff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[11px] tracking-[0.25em] text-gray-500 uppercase mb-4">Fuel Log</p>
        <div className="flex flex-col">
          {fuelEntries.map((f, i) => (
            <div key={f.id}>
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-100">{f.station ?? 'Fill-up'}</p>
                  <p className="text-[11px] text-gray-500">{formatNumber(f.liters, 1)} L \u00b7 {formatDate(f.date)}</p>
                </div>
                <p className="text-sm text-gray-200 tabular-nums">{formatCurrency(f.totalCost)}</p>
              </div>
              {i < fuelEntries.length - 1 && <div className="h-px bg-white/5" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
