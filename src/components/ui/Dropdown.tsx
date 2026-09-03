import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface DropdownProps {
  options: string[]
  value: string
  onChange: (value: string) => void
}

export function Dropdown({ options, value, onChange }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-300 bg-base-800 hover:bg-base-700 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
      >
        {value}
        <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-40 bg-base-800 border border-white/10 rounded-xl shadow-2xl py-1.5 z-20 animate-scale-in">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => {
                onChange(opt)
                setOpen(false)
              }}
              className={`w-full text-left px-3.5 py-2 text-xs transition-colors ${
                opt === value ? 'text-accent-light bg-accent/10' : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
