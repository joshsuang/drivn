import { useState } from 'react'
import { Plus, Check, Gauge } from 'lucide-react'
import { useCarData } from '@/context/DataContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput } from '@/components/ui/FormField'
import { formatKm } from '@/lib/format'

const fallbackCarImage =
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop'

export function VehiclePicker({ onDone }: { onDone?: () => void }) {
  const { data, vehicles, switchVehicle, addVehicle } = useCarData()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    make: '',
    model: '',
    trim: '',
    year: new Date().getFullYear(),
    currentMileage: '0',
  })

  async function pick(id: string) {
    if (id !== data.vehicle.id) await switchVehicle(id)
    sessionStorage.setItem('drivn.vehicleChosen', '1')
    onDone?.()
  }

  async function submitNewCar() {
    if (!form.make || !form.model) return
    await addVehicle({
      make: form.make,
      model: form.model,
      trim: form.trim || '-',
      engine: '-',
      power: '-',
      transmission: '-',
      drive: '-',
      year: Number(form.year),
      fuelType: '-',
      owner: data.vehicle.owner,
      purchaseDate: new Date().toISOString().slice(0, 10),
      currentMileage: Number(form.currentMileage) || 0,
      startingMileage: Number(form.currentMileage) || 0,
      imageUrl: fallbackCarImage,
    })
    setOpen(false)
    sessionStorage.setItem('drivn.vehicleChosen', '1')
    onDone?.()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4 py-10">
      <div className="w-full max-w-lg">
        <h1 className="text-xl font-bold text-gray-50 tracking-tight mb-1">
          Welcome back, {data.vehicle.owner} 👋
        </h1>
        <p className="text-sm text-gray-500 mb-6">Which car are we looking at?</p>

        <div className="flex flex-col gap-3">
          {vehicles.map((v) => (
            <button key={v.id} onClick={() => pick(v.id)} className="text-left">
              <Card className="flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
                <img src={v.imageUrl} alt={v.model} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-100 truncate">
                    {v.make} {v.model}
                  </p>
                  <p className="text-xs text-gray-500">{v.trim} · {v.year}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <Gauge size={12} /> {formatKm(v.currentMileage)}
                  </div>
                </div>
                {v.id === data.vehicle.id && (
                  <div className="rounded-full bg-accent/20 p-1.5 shrink-0">
                    <Check size={14} className="text-accent-light" />
                  </div>
                )}
              </Card>
            </button>
          ))}
        </div>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-300 mt-5 mx-auto transition-colors"
        >
          <Plus size={13} /> Add another car
        </button>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add a car"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submitNewCar}>Add car</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Make">
            <TextInput placeholder="e.g. Ford" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Model">
            <TextInput placeholder="e.g. Focus" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Trim" hint="Optional">
            <TextInput value={form.trim} onChange={(e) => setForm({ ...form, trim: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Year">
            <TextInput type="number" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} />
          </FieldWrap>
        </div>
        <FieldWrap label="Current mileage (km)">
          <TextInput type="number" value={form.currentMileage} onChange={(e) => setForm({ ...form, currentMileage: e.target.value })} />
        </FieldWrap>
      </Modal>
    </div>
  )
}
