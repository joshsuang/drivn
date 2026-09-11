import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Wrench, Droplets, FileCheck2, Gauge } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RowActions } from '@/components/ui/RowActions'
import { MaintenanceEntryDetailView } from '@/components/EntryDetail'
import { FieldWrap, TextInput, TextArea } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { buildMaintenanceEntryDetail } from '@/lib/entryDetail'
import type { MaintenanceEntry } from '@/types'
import { buildReminders } from '@/lib/reminders'
import { SEVERITY_TEXT, SEVERITY_TONE } from '@/components/ReminderRow'
import { formatDate, formatKm, formatCurrency } from '@/lib/format'
import { maintenanceTypes, garages } from '@/lib/suggestions'

const upcomingIcons = [Droplets, Wrench, FileCheck2, Gauge]

function emptyForm(mileage: number) {
  return {
    type: '',
    date: new Date().toISOString().slice(0, 10),
    mileage: String(mileage),
    cost: '',
    garage: '',
    notes: '',
    nextIntervalKm: '',
  }
}

export default function Maintenance() {
  const { data, addMaintenance, updateMaintenance, deleteMaintenance } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MaintenanceEntry | null>(null)
  // Held by id so the drill-down recomputes from live data rather than a copy.
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    if (params.get('add')) {
      setEditing(null)
      setForm(emptyForm(data.vehicle.currentMileage))
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams, data.vehicle.currentMileage])

  const [form, setForm] = useState(() => emptyForm(data.vehicle.currentMileage))

  function openAdd() {
    setEditing(null)
    setForm(emptyForm(data.vehicle.currentMileage))
    setOpen(true)
  }

  function openEdit(entry: MaintenanceEntry) {
    setEditing(entry)
    setForm({
      type: entry.type,
      date: entry.date,
      mileage: String(entry.mileage),
      cost: String(entry.cost),
      garage: entry.garage ?? '',
      notes: entry.notes ?? '',
      nextIntervalKm: entry.nextIntervalKm ? String(entry.nextIntervalKm) : '',
    })
    setOpen(true)
  }

  function submit() {
    if (!form.type || !form.date) return
    const fields = {
      type: form.type,
      date: form.date,
      mileage: Number(form.mileage) || 0,
      cost: Number(form.cost) || 0,
      garage: form.garage || 'Unknown garage',
      notes: form.notes || undefined,
      nextIntervalKm: form.nextIntervalKm ? Number(form.nextIntervalKm) : undefined,
    }
    if (editing) {
      void updateMaintenance(editing.id, fields)
    } else {
      void addMaintenance(fields)
    }
    setOpen(false)
    setEditing(null)
    setForm({ ...form, type: '', cost: '', garage: '', notes: '', nextIntervalKm: '' })
  }

  // Derived the same way as the bell and the Reminders page, so a service due by
  // date shows up here too — it used to only ever look at the km interval.
  const upcoming = useMemo(
    () => buildReminders(data).filter((reminder) => reminder.kind === 'maintenance'),
    [data],
  )

  const detail = useMemo(
    () => (detailId ? buildMaintenanceEntryDetail(data, detailId) : null),
    [data, detailId],
  )

  return (
    <div className="fade-in">
      <Header title="Maintenance" subtitle="Services, intervals and upcoming work" />

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-200">Upcoming</h3>
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} /> Add maintenance
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {upcoming.length === 0 ? (
          <p className="col-span-full text-sm text-gray-500">No upcoming intervals yet — add a “Next interval (km)” or a next date when logging a service.</p>
        ) : (
          upcoming.slice(0, 4).map((reminder, i) => {
            const Icon = upcomingIcons[i % upcomingIcons.length]
            return (
              <Card key={reminder.id}>
                <div className={`rounded-xl p-2.5 w-fit mb-3 ${SEVERITY_TONE[reminder.severity]}`}>
                  <Icon size={17} />
                </div>
                <p className="text-sm font-semibold text-gray-100">{reminder.title}</p>
                <p className={`text-xs mt-0.5 ${SEVERITY_TEXT[reminder.severity]}`}>
                  {reminder.detail}
                </p>
                {reminder.secondary && (
                  <p className="text-[11px] text-gray-600 mt-0.5">{reminder.secondary}</p>
                )}
              </Card>
            )
          })
        )}
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
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.maintenance.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => setDetailId(m.id)}
                  className="border-t border-white/5 hover:bg-white/[0.02] cursor-pointer"
                >
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-5 py-3.5 text-gray-100 font-medium">{m.type}</td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatKm(m.mileage)}</td>
                  <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap">{formatCurrency(m.cost)}</td>
                  <td className="px-5 py-3.5 text-gray-500 hidden sm:table-cell">{m.garage}</td>
                  <td
                    className="px-5 py-3.5 text-right whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowActions
                      onEdit={() => openEdit(m)}
                      onDelete={() => void deleteMaintenance(m.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title="Service details"
      >
        {detail ? (
          <MaintenanceEntryDetailView
            detail={detail}
            onEdit={() => {
              const entry = detail.entry
              setDetailId(null)
              openEdit(entry)
            }}
          />
        ) : (
          <p className="text-sm text-gray-500">
            This service is no longer available — it may have been deleted on another device.
          </p>
        )}
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit maintenance' : 'Add maintenance'}
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
