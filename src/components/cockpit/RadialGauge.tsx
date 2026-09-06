interface RadialGaugeProps {
  value: number
  displayValue: string
  unit: string
  label: string
  max: number
  color?: string
  size?: number
}

export function RadialGauge({ value, displayValue, unit, label, max, color = '#ff5a3c', size = 220 }: RadialGaugeProps) {
  const stroke = 10
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const startAngle = -220
  const sweep = 260
  const pct = Math.max(0, Math.min(1, value / max))

  function polar(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  function arcPath(fromDeg: number, toDeg: number) {
    const from = polar(fromDeg)
    const to = polar(toDeg)
    const large = toDeg - fromDeg > 180 ? 1 : 0
    return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 1 ${to.x} ${to.y}`
  }

  const ticks = Array.from({ length: 13 }, (_, i) => startAngle + (sweep / 12) * i)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <path d={arcPath(startAngle, startAngle + sweep)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arcPath(startAngle, startAngle + sweep * pct)}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}aa)`, transition: 'all 500ms cubic-bezier(0.22,1,0.36,1)' }}
        />
        {ticks.map((deg, i) => {
          const outer = polar(deg)
          const inner = {
            x: cx + (r - 14) * Math.cos((deg * Math.PI) / 180),
            y: cy + (r - 14) * Math.sin((deg * Math.PI) / 180),
          }
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1.5}
            />
          )
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[11px] tracking-[0.2em] text-gray-500 font-medium uppercase mb-1">{label}</span>
        <span className="text-4xl font-bold text-white tabular-nums tracking-tight">{displayValue}</span>
        <span className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{unit}</span>
      </div>
    </div>
  )
}
