import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { uid } from '@/lib/format'

type ToastKind = 'success' | 'error' | 'info'

interface ToastMsg {
  id: string
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([])

  const showToast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = uid('toast')
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3200)
  }, [])

  const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id))

  const icon = {
    success: <CheckCircle2 size={18} className="text-good shrink-0" />,
    error: <XCircle size={18} className="text-bad shrink-0" />,
    info: <Info size={18} className="text-accent-light shrink-0" />,
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[min(92vw,380px)]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-slide-up card-surface rounded-2xl shadow-card px-4 py-3 flex items-center gap-2.5 text-sm text-base-50"
          >
            {icon[t.kind]}
            <span className="flex-1 text-[13px] leading-snug text-gray-100">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="text-gray-500 hover:text-gray-300 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
