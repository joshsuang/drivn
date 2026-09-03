interface RouteMapProps {
  start: string
  destination: string
  route: { x: number; y: number }[]
  className?: string
}

export function RouteMap({ start, destination, route, className }: RouteMapProps) {
  const path = route.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const first = route[0]
  const last = route[route.length - 1]

  return (
    <div className={`relative rounded-xl overflow-hidden bg-base-800 border border-white/5 ${className ?? ''}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#5b6cff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <pattern id="mapGrid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 8" fill="none" stroke="rgba(255,255,255,0.035)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#mapGrid)" />
        <path d={path} fill="none" stroke="url(#routeGrad)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={first.x} cy={first.y} r="2.2" fill="#5b6cff" stroke="#0d0f12" strokeWidth="0.8" />
        <circle cx={last.x} cy={last.y} r="2.2" fill="#f5a524" stroke="#0d0f12" strokeWidth="0.8" />
      </svg>
      <div
        className="absolute text-[10px] font-medium text-gray-200 bg-base-900/90 border border-white/10 rounded-md px-1.5 py-0.5 -translate-x-1/2 -translate-y-full"
        style={{ left: `${first.x}%`, top: `${first.y}%`, marginTop: '-4px' }}
      >
        {start}
      </div>
      <div
        className="absolute text-[10px] font-medium text-gray-200 bg-base-900/90 border border-white/10 rounded-md px-1.5 py-0.5 -translate-x-1/2"
        style={{ left: `${last.x}%`, top: `${last.y}%`, marginTop: '6px' }}
      >
        {destination}
      </div>
    </div>
  )
}
