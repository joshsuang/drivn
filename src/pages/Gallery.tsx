import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, X, ChevronLeft, ChevronRight, Upload, Trash2 } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldWrap, TextInput } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { formatDate } from '@/lib/format'
import { belgianCities } from '@/lib/suggestions'

const fallbackPhoto =
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=900&auto=format&fit=crop'

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Gallery() {
  const { data, addPhoto, deletePhoto } = useCarData()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [fileData, setFileData] = useState<string | null>(null)

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
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    setFileData(dataUrl)
  }

  function submit() {
    addPhoto({
      url: fileData ?? fallbackPhoto,
      fileData: fileData ?? undefined,
      date: form.date,
      location: form.location || 'Unknown',
      description: form.description || undefined,
    })
    setOpen(false)
    setFileData(null)
    setForm({ ...form, location: '', description: '' })
  }

  return (
    <div className="fade-in">
      <Header title="Gallery" subtitle="Your car in every moment" />

      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setOpen(true)}>
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
              src={photo.fileData ?? photo.url}
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
              src={data.photos[lightbox].fileData ?? data.photos[lightbox].url}
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
            {fileData ? (
              <img src={fileData} alt="preview" className="h-24 rounded-lg object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1.5 text-gray-500">
                <Upload size={18} />
                <span className="text-xs">Tap to choose a photo</span>
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
