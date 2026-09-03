import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, FileText, ShieldCheck, ClipboardList, Receipt, BookOpen, File, Upload, Trash2, Download } from 'lucide-react'
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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Documents() {
  const { data, addDocument, deleteDocument } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [fileData, setFileData] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

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

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const dataUrl = await readFileAsDataUrl(file)
    setFileData(dataUrl)
  }

  function submit() {
    if (!form.name) return
    addDocument({
      name: form.name,
      category: form.category,
      date: form.date,
      expirationDate: form.expirationDate || undefined,
      status: 'valid',
      fileData: fileData ?? undefined,
    })
    setOpen(false)
    setFileData(null)
    setFileName('')
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
                <div className="flex items-center gap-3 mt-2">
                  {doc.fileData && (
                    <a
                      href={doc.fileData}
                      download={doc.name}
                      className="flex items-center gap-1 text-[11px] text-accent-light hover:text-accent-light/80"
                    >
                      <Download size={12} /> File
                    </a>
                  )}
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-bad"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
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
        <FieldWrap label="File" hint="Optional — PDF or image">
          <label className="flex items-center gap-2.5 border border-dashed border-white/15 rounded-xl px-3.5 py-3 cursor-pointer hover:border-accent/50 transition-colors">
            <Upload size={16} className="text-gray-500 shrink-0" />
            <span className="text-xs text-gray-400 truncate">{fileName || 'Tap to attach a file'}</span>
            <input type="file" accept="application/pdf,image/*" className="hidden" onChange={onPickFile} />
          </label>
        </FieldWrap>
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
