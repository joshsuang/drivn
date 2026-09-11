import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, FileText, ShieldCheck, ClipboardList, Receipt, BookOpen, File, Upload, Download } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { RowActions } from '@/components/ui/RowActions'
import { FieldWrap, TextInput, Select } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { describeDbError } from '@/lib/db'
import { deleteMedia, uploadMedia } from '@/lib/media'
import { deriveDocStatus } from '@/lib/reminders'
import type { DocCategory, DocStatus, DocumentItem } from '@/types'
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

function emptyForm() {
  return {
    name: '',
    category: 'Other' as DocCategory,
    date: new Date().toISOString().slice(0, 10),
    expirationDate: '',
  }
}

export default function Documents() {
  const { data, addDocument, updateDocument, deleteDocument } = useCarData()
  const { session } = useAuth()
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [uploaded, setUploaded] = useState<{ path: string; url: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileName, setFileName] = useState('')
  const [editing, setEditing] = useState<DocumentItem | null>(null)

  useEffect(() => {
    if (params.get('add')) {
      setEditing(null)
      setUploaded(null)
      setFileName('')
      setForm(emptyForm())
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState(emptyForm)

  function openAdd() {
    setEditing(null)
    setUploaded(null)
    setFileName('')
    setForm(emptyForm())
    setOpen(true)
  }

  function openEdit(doc: DocumentItem) {
    setEditing(doc)
    setUploaded(null)
    setFileName('')
    setForm({
      name: doc.name,
      category: doc.category,
      date: doc.date,
      expirationDate: doc.expirationDate ?? '',
    })
    setOpen(true)
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session?.user.id) return
    setFileName(file.name)
    setUploading(true)
    try {
      setUploaded(await uploadMedia(session.user.id, file, 'document'))
    } catch (error) {
      showToast(describeDbError(error, 'Upload failed'), 'error')
    } finally {
      setUploading(false)
    }
  }

  function submit() {
    if (!form.name) return
    const fields = {
      name: form.name,
      category: form.category,
      date: form.date,
      expirationDate: form.expirationDate || undefined,
      // Stored for reference only — reads recompute it from the date, so this
      // can never go stale the way it used to.
      status: deriveDocStatus(form.expirationDate || undefined),
    }
    if (editing) {
      // Keep the stored file unless a new one was attached.
      void updateDocument(editing.id, {
        ...fields,
        storagePath: uploaded?.path ?? editing.storagePath,
        fileUrl: uploaded?.url ?? editing.fileUrl,
      })
      // Replacing a file leaves the old object behind unless we sweep it up.
      if (uploaded?.path && editing.storagePath && editing.storagePath !== uploaded.path) {
        void deleteMedia(editing.storagePath)
      }
    } else {
      void addDocument({
        ...fields,
        storagePath: uploaded?.path,
        fileUrl: uploaded?.url,
      })
    }
    setOpen(false)
    setEditing(null)
    setUploaded(null)
    setFileName('')
    setForm({ ...form, name: '', expirationDate: '' })
  }

  return (
    <div className="fade-in">
      <Header title="Documents" subtitle="Insurance, registration, invoices and manuals" />

      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={openAdd}>
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
                  {(doc.fileUrl || doc.fileData) && (
                    <a
                      href={doc.fileUrl ?? doc.fileData}
                      download={doc.name}
                      className="flex items-center gap-1 text-[11px] text-accent-light hover:text-accent-light/80"
                    >
                      <Download size={12} /> File
                    </a>
                  )}
                  <RowActions
                    onEdit={() => openEdit(doc)}
                    onDelete={() => void deleteDocument(doc.id)}
                  />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit document' : 'Add document'}
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
            <span className="text-xs text-gray-400 truncate">
              {uploading ? 'Uploading…' : fileName || 'Tap to attach a file'}
            </span>
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
