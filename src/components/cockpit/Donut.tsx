interface DonutSlice {
  label: string
  value: number
  color: string
}

export function Donut({ slices, size = 160 }: { slices: DonutSlice[]; size?: number }) {
  const stroke = 18
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const total = slices.reduce((s, d) => s + d.value, 0) || 1

  let offsetAcc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      {slices.map((s) => {
        const frac = s.value / total
        const dash = frac * circumference
        const gap = circumference - dash
        const el = (
          <circle
            key={s.label}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offsetAcc}
            strokeLinecap="butt"
          />
        )
        offsetAcc += dash
        return el
      })}
    </svg>
  )
}
