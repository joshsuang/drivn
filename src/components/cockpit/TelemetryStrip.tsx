interface TelemetryStripProps {
  items: { label: string; value: string; color?: string }[]
}

export function TelemetryStrip({ items }: TelemetryStripProps) {
  return (
    <div className="flex flex-wrap divide-x divide-white/8 border-y border-white/8">
      {items.map((it) => (
        <div key={it.label} className="flex-1 min-w-[120px] px-5 py-4 text-center">
          <p className="text-[10px] tracking-[0.2em] text-gray-500 uppercase mb-1.5">{it.label}</p>
          <p className="text-xl font-bold tabular-nums tracking-tight" style={{ color: it.color ?? '#fff' }}>
            {it.value}
          </p>
        </div>
      ))}
    </div>
  )
}
