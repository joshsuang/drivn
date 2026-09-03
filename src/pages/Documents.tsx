import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, FileText, ShieldCheck, ClipboardList, Receipt, BookOpen, File } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput, Select } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import type { DocCategory, DocStatus } from '@/types'
import { formatDate } from '@/lib/format'

const categories: DocCategory[] = ['Insurance', 'Registration', 'Maintenance', 'Invoice', 'Manual', 'Other']

const catIcons: Record<DocCategory, typeof FileText> = {
  Insurance: ShieldCheck,
  Registration: ClipboardList,
  Maintenance: FileText,
  Invoice: Receipt,
  Manual: BookOpen,
  Other: File,
}

const statusTone: Record<DocStatus, 'good' | 'warn' | 'bad'> = {
  valid: 'good',
  expiring: 'warn',
  expired: 'bad',
}

export default function Documents() {
  const { data, addDocument } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (params.get('add')) {
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState({
    name: '',
    category: 'Other' as DocCategory,
    date: new Date().toISOString().slice(0, 10),
    expirationDate: '',
  })

  function submit() {
    if (!form.name) return
    addDocument({
      name: form.name,
      category: form.category,
      date: form.date,
      expirationDate: form.expirationDate || undefined,
      status: 'valid',
    })
    setOpen(false)
    setForm({ ...form, name: '', expirationDate: '' })
  }

  return (
    <div className="fade-in">
      <Header title="Documents" subtitle="Insurance, registration, invoices and manuals" />

      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add document
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.documents.map((doc) => {
          const Icon = catIcons[doc.category]
          return (
            <Card key={doc.id} className="flex items-start gap-3.5">
              <div className="rounded-xl bg-white/5 p-2.5 shrink-0">
                <Icon size={17} className="text-gray-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-100 truncate">{doc.name}</p>
                  <Badge tone={statusTone[doc.status]}>{doc.status}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{doc.category} · Added {formatDate(doc.date)}</p>
                {doc.expirationDate && (
                  <p className="text-xs text-gray-600 mt-0.5">Expires {formatDate(doc.expirationDate)}</p>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add document"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </>
        }
      >
        <FieldWrap label="Name">
          <TextInput placeholder="e.g. Insurance policy" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </FieldWrap>
        <FieldWrap label="Category">
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DocCategory })}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </FieldWrap>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Date added">
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Expiration date" hint="Optional">
            <TextInput type="date" value={form.expirationDate} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
          </FieldWrap>
        </div>
      </Modal>
    </div>
  )
}
