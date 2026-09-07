interface RadialGaugeProps {
  value: number
  displayValue: string
  unit: string
  label: string
  max: number
  color?: string
  colorEnd?: string
  size?: number
  image?: string
  showScale?: boolean
}

export function RadialGauge({
  value,
  displayValue,
  unit,
  label,
  max,
  color = '#ff5a3c',
  colorEnd,
  size = 220,
  image,
  showScale = true,
}: RadialGaugeProps) {
  const stroke = 10
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const startAngle = -220
  const sweep = 260
  const pct = Math.max(0, Math.min(1, value / max))
  const gradId = `rg-${label.replace(/\s+/g, '')}-${size}`

  function polar(angleDeg: number, radius = r) {
    const rad = (angleDeg * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function arcPath(fromDeg: number, toDeg: number) {
    const from = polar(fromDeg)
    const to = polar(toDeg)
    const large = toDeg - fromDeg > 180 ? 1 : 0
    return `M ${from.x} ${from.y} A ${r} ${r} 0 ${large} 1 ${to.x} ${to.y}`
  }

  const tickCount = 13
  const ticks = Array.from({ length: tickCount }, (_, i) => startAngle + (sweep / (tickCount - 1)) * i)

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorEnd ?? color} />
          </linearGradient>
        </defs>
        <path d={arcPath(startAngle, startAngle + sweep)} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arcPath(startAngle, startAngle + sweep * pct)}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 10px ${color}bb)`, transition: 'all 500ms cubic-bezier(0.22,1,0.36,1)' }}
        />
        {ticks.map((deg, i) => {
          const outer = polar(deg)
          const inner = polar(deg, r - 12)
          const major = i % 3 === 0
          return (
            <line
              key={i}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              stroke={major ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)'}
              strokeWidth={major ? 2 : 1}
            />
          )
        })}
        {showScale &&
          ticks
            .filter((_, i) => i % 3 === 0)
            .map((deg, i) => {
              const pos = polar(deg, r - 24)
              const scaleVal = Math.round((max / (tickCount - 1)) * (i * 3))
              return (
                <text
                  key={i}
                  x={pos.x}
                  y={pos.y}
                  fill="rgba(255,255,255,0.35)"
                  fontSize={8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {scaleVal >= 1000 ? `${Math.round(scaleVal / 1000)}k` : scaleVal}
                </text>
              )
            })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {image && (
          <img
            src={image}
            alt=""
            className="absolute rounded-full object-cover opacity-40"
            style={{ width: size - 60, height: size - 60, top: 30, left: 30 }}
          />
        )}
        <span className="relative text-[11px] tracking-[0.2em] text-gray-400 font-medium uppercase mb-1">{label}</span>
        <span className="relative text-4xl font-bold text-white tabular-nums tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">{displayValue}</span>
        <span className="relative text-xs text-gray-300 uppercase tracking-wide mt-0.5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">{unit}</span>
      </div>
    </div>
  )
}
