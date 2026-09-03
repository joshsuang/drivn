import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Fuel, Coins, Gauge, Droplet, TrendingDown } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { formatDate, formatKm, formatCurrency, formatNumber } from '@/lib/format'
import { fuelStations } from '@/lib/suggestions'

export default function FuelCosts() {
  const { data, addFuelEntry } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (params.get('add')) {
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    liters: '',
    pricePerLiter: '1.72',
    mileage: String(data.vehicle.currentMileage),
    station: '',
  })

  const totals = useMemo(() => {
    const entries = data.fuelEntries
    const totalCost = entries.reduce((s, f) => s + f.totalCost, 0)
    const totalLiters = entries.reduce((s, f) => s + f.liters, 0)
    const avgPrice = totalLiters > 0 ? totalCost / totalLiters : 0
    const withConsumption = entries.filter((f) => f.consumption)
    const avgConsumption =
      withConsumption.reduce((s, f) => s + (f.consumption ?? 0), 0) / (withConsumption.length || 1)
    const distance = data.vehicle.currentMileage - data.vehicle.startingMileage
    const costPerKm = distance > 0 ? totalCost / distance : 0
    return { totalCost, totalLiters, avgPrice, avgConsumption, costPerKm }
  }, [data])

  function submit() {
    const liters = Number(form.liters)
    const price = Number(form.pricePerLiter)
    const mileage = Number(form.mileage)
    if (!liters || !price || !mileage) return

    const previous = data.fuelEntries[0]
    const consumption =
      previous && mileage > previous.mileage
        ? (liters / (mileage - previous.mileage)) * 100
        : undefined

    addFuelEntry({
      date: form.date,
      liters,
      pricePerLiter: price,
      totalCost: liters * price,
      mileage,
      consumption,
      station: form.station || undefined,
      fullTank: true,
    })
    setOpen(false)
    setForm({ ...form, liters: '', station: '' })
  }

  return (
    <div className="fade-in">
      <Header title="Fuel & Costs" subtitle="Fill-ups, prices and consumption" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Coins} iconColor="text-bad" iconBg="bg-bad/10" label="Total fuel cost" value={formatCurrency(totals.totalCost)} />
        <StatCard icon={Fuel} label="Avg. fuel price" value={`${formatNumber(totals.avgPrice, 2)}/L`} />
        <StatCard icon={TrendingDown} iconColor="text-good" iconBg="bg-good/10" label="Avg. consumption" value={`${formatNumber(totals.avgConsumption, 1)} L/100km`} />
        <StatCard icon={Droplet} label="Total liters" value={`${formatNumber(totals.totalLiters, 0)} L`} />
        <StatCard icon={Gauge} iconColor="text-purple" iconBg="bg-purple/10" label="Cost per km" value={formatCurrency(totals.costPerKm)} />
      </div>

      <Card padded={false}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-gray-200">Fuel history</h3>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> Add fuel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Liters</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Price/L</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Mileage</th>
                <th className="px-5 py-3 font-medium hidden md:table-cell">Consumption</th>
              </tr>
            </thead>
            <tbody>
              {data.fuelEntries.map((f) => (
                <tr key={f.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatDate(f.date)}</td>
                  <td className="px-5 py-3.5 text-gray-100">{formatNumber(f.liters, 1)} L</td>
                  <td className="px-5 py-3.5 text-gray-400 hidden sm:table-cell">{formatNumber(f.pricePerLiter, 2)}</td>
                  <td className="px-5 py-3.5 text-gray-100 font-medium">{formatCurrency(f.totalCost)}</td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatKm(f.mileage)}</td>
                  <td className="px-5 py-3.5 text-gray-400 hidden md:table-cell">
                    {f.consumption ? `${formatNumber(f.consumption, 1)} L/100km` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add fuel"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Date">
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Mileage (km)">
            <TextInput type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          </FieldWrap>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Liters">
            <TextInput type="number" step="0.1" placeholder="0.0" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Price per liter (\u20ac)">
            <TextInput type="number" step="0.01" value={form.pricePerLiter} onChange={(e) => setForm({ ...form, pricePerLiter: e.target.value })} />
          </FieldWrap>
        </div>
        <FieldWrap label="Station" hint="Optional">
          <TextInput list="fuel-stations" placeholder="e.g. Q8 Herentals" value={form.station} onChange={(e) => setForm({ ...form, station: e.target.value })} />
          <datalist id="fuel-stations">
            {fuelStations.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </FieldWrap>
        {form.liters && form.pricePerLiter && (
          <p className="text-xs text-gray-500">
            Total cost: <span className="text-gray-200 font-medium">{formatCurrency(Number(form.liters) * Number(form.pricePerLiter))}</span>
          </p>
        )}
      </Modal>
    </div>
  )
}
