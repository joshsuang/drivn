import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, ChevronLeft, ChevronRight, Upload, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { uploadMedia } from '@/lib/media'
import { describeDbError } from '@/lib/db'
import { formatDate } from '@/lib/format'
import { belgianCities } from '@/lib/suggestions'

const fallbackPhoto =
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=900&auto=format&fit=crop'

export default function Gallery() {
  const { data, addPhoto, deletePhoto } = useCarData()
  const { session } = useAuth()
  const { showToast } = useToast()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [uploaded, setUploaded] = useState<{ path: string; url: string } | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (params.get('add')) {
      setOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    location: '',
    description: '',
  })

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session?.user.id) return
    setUploading(true)
    try {
      // Upload on pick rather than on save: the image is already in storage by
      // the time the user hits Save, so the insert stays fast.
      setUploaded(await uploadMedia(session.user.id, file, 'photo'))
    } catch (error) {
      showToast(describeDbError(error, 'Upload failed'), 'error')
    } finally {
      setUploading(false)
    }
  }

  function submit() {
    void addPhoto({
      // The stored row keeps the path; `url` here is the signed preview that
      // shows immediately, and is replaced on the next fetch.
      url: uploaded?.url ?? fallbackPhoto,
      storagePath: uploaded?.path,
      date: form.date,
      location: form.location || 'Unknown',
      description: form.description || undefined,
    })
    setOpen(false)
    setUploaded(null)
    setForm({ ...form, location: '', description: '' })
  }

  return (
    <div className="fade-in">
      <Header title="Gallery" subtitle="Your car in every moment" />

      <div className="flex justify-end mb-4">          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> Add photo
          </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => setLightbox(i)}
            className="aspect-square rounded-2xl overflow-hidden bg-base-800 border border-white/5 group"
          >
            <img
              src={photo.url}
              alt={photo.description ?? photo.location}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </button>
        ))}
      </div>

      {lightbox !== null && data.photos[lightbox] && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-scale-in">
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"
          >
            <X size={22} />
          </button>
          <button
            onClick={() => {
              deletePhoto(data.photos[lightbox].id)
              setLightbox(null)
            }}
            className="absolute top-5 left-5 text-white/70 hover:text-bad p-2 rounded-full hover:bg-white/10"
          >
            <Trash2 size={20} />
          </button>
          {lightbox > 0 && (
            <button
              onClick={() => setLightbox(lightbox - 1)}
              className="absolute left-3 md:left-8 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"
            >
              <ChevronLeft size={26} />
            </button>
          )}
          {lightbox < data.photos.length - 1 && (
            <button
              onClick={() => setLightbox(lightbox + 1)}
              className="absolute right-3 md:right-8 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10"
            >
              <ChevronRight size={26} />
            </button>
          )}
          <div className="max-w-3xl w-full px-6">
            <img
              src={data.photos[lightbox].url}
              alt={data.photos[lightbox].location}
              className="w-full max-h-[70vh] object-contain rounded-2xl"
            />
            <div className="text-center mt-4">
              <p className="text-sm font-medium text-white">{data.photos[lightbox].location}</p>
              <p className="text-xs text-white/50 mt-0.5">{formatDate(data.photos[lightbox].date)}</p>
              {data.photos[lightbox].description && (
                <p className="text-xs text-white/60 mt-1">{data.photos[lightbox].description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add photo"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit}>Save</Button>
          </>
        }
      >
        <FieldWrap label="Photo">
          <label className="flex items-center justify-center gap-2 border border-dashed border-white/15 rounded-xl py-6 cursor-pointer hover:border-accent/50 transition-colors overflow-hidden">
            {uploaded?.url ? (
              <img src={uploaded.url} alt="preview" className="h-24 rounded-lg object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-gray-500">
                <Upload size={18} />
                <span className="text-xs">
                  {uploading ? 'Uploading…' : 'Tap to choose a photo'}
                </span>
              </span>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onPickFile} />
          </label>
        </FieldWrap>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Date">
            <TextInput type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Location">
            <TextInput list="be-cities" placeholder="e.g. Ardennen" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <datalist id="be-cities">
              {belgianCities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FieldWrap>
        </div>
        <FieldWrap label="Description" hint="Optional">
          <TextInput value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </FieldWrap>
      </Modal>
    </div>
  )
}
