interface Subsystem {
  label: string
  status: 'good' | 'warn' | 'bad'
}

interface HealthRingProps {
  score: number
  subsystems: Subsystem[]
  size?: number
}

const statusColor = { good: '#34d399', warn: '#f5a524', bad: '#ff5a3c' }
const statusLabel = { good: 'GOOD', warn: 'SOON', bad: 'CHECK' }

export function HealthRing({ score, subsystems, size = 220 }: HealthRingProps) {
  const stroke = 10
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, score / 100))
  const color = score >= 80 ? '#34d399' : score >= 50 ? '#f5a524' : '#ff5a3c'

  return (
    <div>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ filter: `drop-shadow(0 0 6px ${color}aa)`, transition: 'stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white tabular-nums tracking-tight">{score}</span>
          <span className="text-[11px] tracking-[0.2em] text-gray-500 font-medium uppercase mt-0.5">Health</span>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-1.5">
        {subsystems.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className="text-gray-500 uppercase tracking-wide">{s.label}</span>
            <span className="font-medium tabular-nums" style={{ color: statusColor[s.status] }}>
              {statusLabel[s.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
