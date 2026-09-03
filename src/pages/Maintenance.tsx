import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Wrench, Droplets, FileCheck2, Gauge } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput, TextArea } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { formatDate, formatKm, formatCurrency } from '@/lib/format'
import { maintenanceTypes, garages } from '@/lib/suggestions'

const upcomingIcons = [Droplets, Wrench, FileCheck2, Gauge]

export default function Maintenance() {
  const { data, addMaintenance } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (params.get('add')) {
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState({
    type: '',
    date: new Date().toISOString().slice(0, 10),
    mileage: String(data.vehicle.currentMileage),
    cost: '',
    garage: '',
    notes: '',
    nextIntervalKm: '',
  })

  function submit() {
    if (!form.type || !form.date) return
    addMaintenance({
      type: form.type,
      date: form.date,
      mileage: Number(form.mileage) || 0,
      cost: Number(form.cost) || 0,
      garage: form.garage || 'Unknown garage',
      notes: form.notes || undefined,
      nextIntervalKm: form.nextIntervalKm ? Number(form.nextIntervalKm) : undefined,
    })
    setOpen(false)
    setForm({ ...form, type: '', cost: '', garage: '', notes: '', nextIntervalKm: '' })
  }

  const upcoming = [
    { title: 'Oil change', sub: `Next in ${formatKm(2340)}` },
    { title: 'Air filter', sub: `Next in ${formatKm(7500)}` },
    { title: 'Inspection', sub: '12 Nov 2026' },
    { title: 'Brake fluid', sub: `Next in ${formatKm(15000)}` },
  ]

  return (
    <div className="fade-in">
      <Header title="Maintenance" subtitle="Services, intervals and upcoming work" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Upcoming</h3>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add maintenance
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {upcoming.map((u, i) => {
          const Icon = upcomingIcons[i]
          return (
            <Card key={u.title}>
              <div className="rounded-xl bg-warn/10 p-2.5 w-fit mb-3">
                <Icon size={17} className="text-warn" />
              </div>
              <p className="text-sm font-semibold text-gray-100">{u.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{u.sub}</p>
            </Card>
          )
        })}
      </div>

      <Card padded={false}>
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-gray-200">Maintenance history</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Service</th>
                <th className="px-5 py-3 font-medium">Mileage</th>
                <th className="px-5 py-3 font-medium">Cost</th>
                <th className="px-5 py-3 font-medium hidden sm:table-cell">Garage</th>
              </tr>
            </thead>
            <tbody>
              {data.maintenance.map((m) => (
                <tr key={m.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-5 py-3.5 text-gray-100 font-medium">{m.type}</td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatKm(m.mileage)}</td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatCurrency(m.cost)}</td>
                  <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{m.garage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add maintenance"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </>
        }
      >
        <FieldWrap label="Type">
          <TextInput list="maintenance-types" placeholder="e.g. Olie verversen" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <datalist id="maintenance-types">
            {maintenanceTypes.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </FieldWrap>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Date">
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Mileage (km)">
            <TextInput type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: e.target.value })} />
          </FieldWrap>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Cost (\u20ac)">
            <TextInput type="number" placeholder="0.00" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Garage">
            <TextInput list="garages" placeholder="Garage name" value={form.garage} onChange={(e) => setForm({ ...form, garage: e.target.value })} />
            <datalist id="garages">
              {garages.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </FieldWrap>
        </div>
        <FieldWrap label="Next interval (km)" hint="Optional">
          <TextInput type="number" value={form.nextIntervalKm} onChange={(e) => setForm({ ...form, nextIntervalKm: e.target.value })} />
        </FieldWrap>
        <FieldWrap label="Notes" hint="Optional">
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FieldWrap>
      </Modal>
    </div>
  )
}
