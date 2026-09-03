import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-scale-in"
        onClick={onClose}
      />
      <div className="relative w-full md:w-[540px] max-h-[88vh] md:max-h-[85vh] bg-base-850 border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl animate-slide-up flex flex-col">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/5 shrink-0">
          <h3 className="text-[15px] font-semibold text-gray-50">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 hover:bg-white/5 rounded-lg p-1.5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-white/5 shrink-0 flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}
