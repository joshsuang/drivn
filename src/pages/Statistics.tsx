import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { RowActions } from '@/components/ui/RowActions'
import { FieldWrap, TextInput, Select } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import type { Expense } from '@/types'
import { formatKm, formatCurrency, formatNumber, formatDate } from '@/lib/format'

export default function Statistics() {
  const { data, addExpense, updateExpense, deleteExpense } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  useEffect(() => {
    if (params.get('add')) {
      setEditing(null)
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'Insurance',
    description: '',
    cost: '',
  })

  function openAdd() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setForm({
      date: expense.date,
      category: expense.category,
      description: expense.description ?? '',
      cost: String(expense.cost),
    })
    setOpen(true)
  }

  function submit() {
    if (!form.cost) return
    const fields = {
      date: form.date,
      category: form.category,
      description: form.description || form.category,
      cost: Number(form.cost),
    }
    if (editing) {
      void updateExpense(editing.id, fields)
    } else {
      void addExpense(fields)
    }
    setOpen(false)
    setEditing(null)
    setForm({ ...form, description: '', cost: '' })
  }

  const stats = useMemo(() => {
    const { mileageByMonth, fuelEntries, maintenance, modifications, expenses, trips, vehicle } = data
    const totalMileage = mileageByMonth.reduce((s, m) => s + m.value, 0)
    const activeMonths = mileageByMonth.filter((m) => m.value > 0).length || 1
    const avgMonthly = totalMileage / activeMonths

    const consumptions = fuelEntries.map((f) => f.consumption).filter(Boolean) as number[]
    const avgConsumption = consumptions.reduce((s, c) => s + c, 0) / (consumptions.length || 1)
    const best = consumptions.length ? Math.min(...consumptions) : 0
    const worst = consumptions.length ? Math.max(...consumptions) : 0

    const fuelCost = fuelEntries.reduce((s, f) => s + f.totalCost, 0)
    const maintenanceCost = maintenance.reduce((s, m) => s + m.cost, 0)
    const modCost = modifications.reduce((s, m) => s + m.price, 0)
    const insuranceCost = expenses.filter((e) => e.category === 'Insurance').reduce((s, e) => s + e.cost, 0)
    const taxCost = expenses.filter((e) => e.category === 'Tax').reduce((s, e) => s + e.cost, 0)
    const otherCost = expenses
      .filter((e) => e.category !== 'Insurance' && e.category !== 'Tax')
      .reduce((s, e) => s + e.cost, 0)
    const totalCost = fuelCost + maintenanceCost + modCost + insuranceCost + taxCost + otherCost

    const longestTrip = trips.reduce((max, t) => (t.distanceKm > max ? t.distanceKm : max), 0)
    const avgTrip = trips.length ? trips.reduce((s, t) => s + t.distanceKm, 0) / trips.length : 0

    return {
      totalMileage,
      avgMonthly,
      avgConsumption,
      best,
      worst,
      fuelCost,
      maintenanceCost,
      modCost,
      insuranceCost,
      taxCost,
      totalCost,
      tripCount: trips.length,
      longestTrip,
      avgTrip,
      currentMileage: vehicle.currentMileage,
    }
  }, [data])

  return (
    <div className="fade-in">
      <Header title="Statistics" subtitle="Stats about your car" />

      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}>
          <Plus size={14} /> Add expense
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <h3 className="text-[13px] font-medium text-gray-300 mb-4">Mileage</h3>
          <StatRow label="Total distance" value={formatKm(stats.currentMileage)} />
          <StatRow label="Monthly average" value={formatKm(stats.avgMonthly)} />
          <StatRow label="Recorded this year" value={formatKm(stats.totalMileage)} last />
        </Card>
        <Card>
          <h3 className="text-[13px] font-medium text-gray-300 mb-4">Consumption</h3>
          <StatRow label="Average" value={`${formatNumber(stats.avgConsumption, 1)} L/100km`} />
          <StatRow label="Best" value={`${formatNumber(stats.best, 1)} L/100km`} good />
          <StatRow label="Worst" value={`${formatNumber(stats.worst, 1)} L/100km`} last />
        </Card>
        <Card>
          <h3 className="text-[13px] font-medium text-gray-300 mb-4">Driving</h3>
          <StatRow label="Number of trips" value={String(stats.tripCount)} />
          <StatRow label="Longest trip" value={`${stats.longestTrip} km`} />
          <StatRow label="Average trip" value={`${formatNumber(stats.avgTrip, 0)} km`} last />
        </Card>
      </div>

      <Card className="mb-4">
        <h3 className="text-[13px] font-medium text-gray-300 mb-4">Costs</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <StatRow label="Fuel" value={formatCurrency(stats.fuelCost)} />
          <StatRow label="Maintenance" value={formatCurrency(stats.maintenanceCost)} />
          <StatRow label="Insurance" value={formatCurrency(stats.insuranceCost)} />
          <StatRow label="Tax" value={formatCurrency(stats.taxCost)} />
          <StatRow label="Modifications" value={formatCurrency(stats.modCost)} />
          <StatRow label="Total ownership cost" value={formatCurrency(stats.totalCost)} good />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-[13px] font-medium text-gray-300 mb-4">Monthly mileage</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.mileageByMonth} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#15171d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number) => [formatKm(v), 'Mileage']}
                />
                <Bar dataKey="value" fill="#5b6cff" radius={[6, 6, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <h3 className="text-[13px] font-medium text-gray-300 mb-4">Consumption trend</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.consumptionByMonth} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                <Tooltip
                  contentStyle={{ background: '#15171d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: number) => [`${formatNumber(v, 1)} L/100km`, 'Consumption']}
                />
                <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3, fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {data.expenses.length > 0 && (
        <Card className="mt-4" padded={false}>
          <div className="px-5 py-4 border-b border-white/5">
            <h3 className="text-sm font-semibold text-gray-200">Other expenses</h3>
          </div>
          <div className="divide-y divide-white/5">
            {data.expenses.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-100 truncate">{e.description}</p>
                  <p className="text-xs text-gray-500">{e.category} · {formatDate(e.date)}</p>
                </div>
                <span className="text-sm font-medium text-gray-200 whitespace-nowrap">{formatCurrency(e.cost)}</span>
                <RowActions
                  onEdit={() => openEdit(e)}
                  onDelete={() => void deleteExpense(e.id)}
                />
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit expense' : 'Add expense'}
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
          <FieldWrap label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {['Insurance', 'Tax', 'Cleaning', 'Parking', 'Fines', 'Other'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </FieldWrap>
        </div>
        <FieldWrap label="Description" hint="Optional">
          <TextInput placeholder="e.g. Annual premium" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FieldWrap>
        <FieldWrap label="Cost (\u20ac)">
          <TextInput type="number" step="0.01" placeholder="0.00" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </FieldWrap>
      </Modal>
    </div>
  )
}

function StatRow({ label, value, good, last }: { label: string; value: string; good?: boolean; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${last ? '' : 'mb-3'}`}>
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${good ? 'text-good' : 'text-gray-100'}`}>{value}</span>
    </div>
  )
}
