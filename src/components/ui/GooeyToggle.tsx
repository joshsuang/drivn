import { useId } from 'react'

interface GooeyToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

const W = 44
const ON_X = W - 10
const OFF_X = 10

export function GooeyToggle({ checked, onChange }: GooeyToggleProps) {
  const rawId = useId()
  const filterId = `goo-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const leadX = checked ? ON_X : OFF_X

  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="relative w-11 h-6 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base-850 rounded-full"
    >
      <span
        className={`absolute inset-0 rounded-full border transition-colors duration-200 ${
          checked ? 'bg-accent/20 border-accent/40' : 'bg-base-600 border-white/5'
        }`}
      />
      <svg viewBox={`0 0 ${W} 24`} className="relative w-full h-full" aria-hidden="true">
        <defs>
          <filter id={filterId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`}>
          <circle
            cx={leadX}
            cy={12}
            r={7}
            fill={checked ? '#5b6cff' : '#8a91a8'}
            style={{ transition: 'cx 220ms cubic-bezier(0.34,1.56,0.64,1), fill 200ms ease-out' }}
          />
        </g>
      </svg>
    </button>
  )
}
