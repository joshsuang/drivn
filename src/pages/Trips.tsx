import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Route, Clock, Fuel, Wallet, Map as MapIcon, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput, TextArea } from '@/components/ui/FormField'
import { TripCard } from '@/components/TripCard'
import { RouteMap } from '@/components/RouteMap'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCarData } from '@/context/DataContext'
import type { Trip } from '@/types'
import { Pencil } from 'lucide-react'
import { formatDate, formatDuration, formatCurrency, formatNumber, formatKm } from '@/lib/format'
import { belgianCities } from '@/lib/suggestions'
import { useMemo } from 'react'

function randomRoute() {
  const points = []
  let x = 10 + Math.random() * 15
  let y = 10 + Math.random() * 15
  const steps = 5
  for (let i = 0; i < steps; i++) {
    x += Math.random() * 20
    y += Math.random() * 20
    points.push({ x: Math.min(90, x), y: Math.min(90, y) })
  }
  return points
}

function emptyForm() {
  return {
    name: '',
    start: 'Herentals',
    destination: '',
    date: new Date().toISOString().slice(0, 10),
    distanceKm: '',
    durationMinutes: '',
    consumption: '',
    fuelCost: '',
    notes: '',
  }
}

export default function Trips() {
  const { data, addTrip, updateTrip, deleteTrip } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Trip | null>(null)
  const [editing, setEditing] = useState<Trip | null>(null)

  useEffect(() => {
    if (params.get('add')) {
      setEditing(null)
      setForm(emptyForm())
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState(emptyForm)

  function openAdd() {
    setEditing(null)
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(trip: Trip) {
    setEditing(trip)
    setForm({
      name: trip.name,
      start: trip.start,
      destination: trip.destination,
      date: trip.date,
      distanceKm: String(trip.distanceKm),
      durationMinutes: String(trip.durationMinutes),
      consumption: String(trip.consumption),
      fuelCost: String(trip.fuelCost),
      notes: trip.notes ?? '',
    })
    setDetail(null)
    setOpen(true)
  }

  function submit() {
    if (!form.name || !form.destination) return
    const fields = {
      name: form.name,
      start: form.start,
      destination: form.destination,
      date: form.date,
      distanceKm: Number(form.distanceKm) || 0,
      durationMinutes: Number(form.durationMinutes) || 0,
      consumption: Number(form.consumption) || 0,
      fuelCost: Number(form.fuelCost) || 0,
      notes: form.notes || undefined,
    }
    if (editing) {
      // Keep the existing stylised route — regenerating it would move the map
      // every time an unrelated field changed.
      void updateTrip(editing.id, fields)
    } else {
      void addTrip({ ...fields, route: randomRoute() })
    }
    setOpen(false)
    setEditing(null)
    setForm({ ...form, name: '', destination: '', distanceKm: '', durationMinutes: '', consumption: '', fuelCost: '', notes: '' })
  }

  const estimatedLegs = useMemo(() => {
    const sorted = [...data.fuelEntries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const legs = []
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      const distance = cur.mileage - prev.mileage
      if (distance <= 0) continue
      legs.push({
        id: cur.id,
        from: formatDate(prev.date),
        to: formatDate(cur.date),
        distance,
        cost: cur.totalCost,
      })
    }
    return legs.reverse().slice(0, 8)
  }, [data.fuelEntries])

  return (
    <div className="fade-in">
      <Header title="Trips" subtitle="Your road trips and journeys" />

      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} /> Add trip
        </Button>
      </div>

      {data.trips.length === 0 ? (
        <EmptyState icon={MapIcon} title="No trips yet" description="Log your first road trip to start building your driving history." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onClick={() => setDetail(trip)} />
          ))}
        </div>
      )}

      {estimatedLegs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-200 mb-1">Estimated driving, from fuel log</h3>
          <p className="text-xs text-gray-500 mb-3">Distance covered between fill-ups — not real trips, just mileage math.</p>
          <div className="rounded-2xl card-surface shadow-card divide-y divide-white/5">
            {estimatedLegs.map((leg) => (
              <div key={leg.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-gray-400">{leg.from} → {leg.to}</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-100">{formatKm(leg.distance)}</span>
                  <span className="text-xs text-gray-500">{formatCurrency(leg.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit trip' : 'Add trip'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </>
        }
      >
        <FieldWrap label="Trip name">
          <TextInput placeholder="e.g. Weekend getaway" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FieldWrap>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Start">
            <TextInput value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Destination">
            <TextInput list="be-cities" placeholder="e.g. Durbuy" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
            <datalist id="be-cities">
              {belgianCities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FieldWrap>
        </div>
        <FieldWrap label="Date">
          <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </FieldWrap>
        <div className="grid grid-cols-3 gap-3">
          <FieldWrap label="Distance (km)">
            <TextInput type="number" value={form.distanceKm} onChange={(e) => setForm({ ...form, distanceKm: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Duration (min)">
            <TextInput type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Consumption">
            <TextInput type="number" step="0.1" value={form.consumption} onChange={(e) => setForm({ ...form, consumption: e.target.value })} />
          </FieldWrap>
        </div>
        <FieldWrap label="Fuel cost (\u20ac)">
          <TextInput type="number" step="0.01" value={form.fuelCost} onChange={(e) => setForm({ ...form, fuelCost: e.target.value })} />
        </FieldWrap>
        <FieldWrap label="Notes" hint="Optional">
          <TextArea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </FieldWrap>
      </Modal>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        footer={
          detail && (
            <>
              <Button variant="ghost" onClick={() => openEdit(detail)}>
                <Pencil size={14} /> Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  void deleteTrip(detail.id)
                  setDetail(null)
                }}
              >
                <Trash2 size={14} /> Delete
              </Button>
            </>
          )
        }
      >
        {detail && (
          <div>
            <RouteMap start={detail.start} destination={detail.destination} route={detail.route} className="h-40 w-full mb-4" />
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <MiniStat icon={Route} label="Distance" value={`${detail.distanceKm} km`} />
              <MiniStat icon={Clock} label="Duration" value={formatDuration(detail.durationMinutes)} />
              <MiniStat icon={Fuel} label="Consumption" value={`${formatNumber(detail.consumption, 1)}L`} />
              <MiniStat icon={Wallet} label="Fuel cost" value={formatCurrency(detail.fuelCost)} />
            </div>
            <p className="text-xs text-gray-500 mb-2">{formatDate(detail.date)}</p>
            {detail.notes && <p className="text-sm text-gray-400">{detail.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Route; label: string; value: string }) {
  return (
    <div>
      <Icon size={13} className="text-gray-500 mx-auto mb-1" />
      <p className="text-xs font-medium text-gray-200">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  )
}
