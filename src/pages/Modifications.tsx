import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Sparkles } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput, Select, TextArea } from '@/components/ui/FormField'
import { ModificationCard } from '@/components/ModificationCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { useCarData } from '@/context/DataContext'
import type { ModCategory, Modification } from '@/types'
import { formatDate, formatCurrency } from '@/lib/format'
import { modificationBrands } from '@/lib/suggestions'

const categories: ModCategory[] = ['Exterior', 'Interior', 'Wheels', 'Performance', 'Lighting', 'Technology']

const placeholderImages = [
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
]

export default function Modifications() {
  const { data, addModification, deleteModification } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<Modification | null>(null)
  const [filter, setFilter] = useState<'All' | ModCategory>('All')

  useEffect(() => {
    if (params.get('add')) {
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState({
    name: '',
    category: 'Exterior' as ModCategory,
    dateInstalled: new Date().toISOString().slice(0, 10),
    price: '',
    brand: '',
    notes: '',
  })

  function submit() {
    if (!form.name) return
    addModification({
      name: form.name,
      category: form.category,
      dateInstalled: form.dateInstalled,
      price: Number(form.price) || 0,
      brand: form.brand || 'Unknown',
      notes: form.notes || undefined,
      imageUrl: placeholderImages[Math.floor(Math.random() * placeholderImages.length)],
    })
    setOpen(false)
    setForm({ ...form, name: '', price: '', brand: '', notes: '' })
  }

  const filtered = filter === 'All' ? data.modifications : data.modifications.filter((m) => m.category === filter)

  return (
    <div className="fade-in">
      <Header title="Modifications" subtitle="Track modifications and upgrades" />

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(['All', ...categories] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`shrink-0 text-xs font-medium px-3.5 py-2 rounded-full border transition-colors ${
                filter === c
                  ? 'bg-accent/20 border-accent/30 text-accent-light'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add modification
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Sparkles} title="No modifications yet" description="Add the first upgrade you've made to your car." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((mod) => (
            <ModificationCard key={mod.id} mod={mod} onClick={() => setDetail(mod)} />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add modification"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </>
        }
      >
        <FieldWrap label="Name">
          <TextInput placeholder="e.g. Maxton Spoiler" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FieldWrap>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Category">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as ModCategory })}>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Date installed">
            <TextInput type="date" value={form.dateInstalled} onChange={(e) => setForm({ ...form, dateInstalled: e.target.value })} />
          </FieldWrap>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Brand">
            <TextInput list="mod-brands" placeholder="e.g. Maxton Design" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <datalist id="mod-brands">
              {modificationBrands.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </FieldWrap>
          <FieldWrap label="Price (\u20ac)" hint="Optional">
            <TextInput type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          </FieldWrap>
        </div>
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
            <Button
              variant="danger"
              onClick={() => {
                deleteModification(detail.id)
                setDetail(null)
              }}
            >
              <Trash2 size={14} /> Delete
            </Button>
          )
        }
      >
        {detail && (
          <div>
            <img src={detail.imageUrl} alt={detail.name} className="w-full h-44 object-cover rounded-xl mb-4" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Category</p>
                <p className="text-gray-100">{detail.category}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Brand</p>
                <p className="text-gray-100">{detail.brand}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Installed</p>
                <p className="text-gray-100">{formatDate(detail.dateInstalled)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 mb-0.5">Price</p>
                <p className="text-gray-100">{formatCurrency(detail.price)}</p>
              </div>
            </div>
            {detail.notes && <p className="text-sm text-gray-400 mt-4">{detail.notes}</p>}
          </div>
        )}
      </Modal>
    </div>
  )
}
