import { useRef, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { useCarData } from '@/context/DataContext'

export function PullToRefresh({ children }: { children: ReactNode }) {
  const { reload } = useCarData()
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const iconRef = useRef<SVGSVGElement>(null)
  const rafId = useRef<number | null>(null)
  const lastPull = useRef(0)

  function applyPull(px: number) {
    lastPull.current = px
    if (rafId.current !== null) return
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null
      if (indicatorRef.current) indicatorRef.current.style.height = `${lastPull.current}px`
      if (iconRef.current) iconRef.current.style.transform = `rotate(${lastPull.current * 3}deg)`
    })
  }

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY <= 0) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!pulling.current || startY.current === null || refreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && window.scrollY <= 0) {
      applyPull(Math.min(diff * 0.5, 80))
    } else {
      pulling.current = false
      applyPull(0)
    }
  }

  async function onTouchEnd() {
    if (!pulling.current) return
    pulling.current = false
    if (lastPull.current > 55 && !refreshing) {
      setRefreshing(true)
      applyPull(0)
      await reload()
      setRefreshing(false)
    } else {
      applyPull(0)
    }
    startY.current = null
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        ref={indicatorRef}
        className="flex items-center justify-center overflow-hidden md:hidden"
        style={{ height: refreshing ? 40 : 0 }}
      >
        <RefreshCw ref={iconRef} size={18} className={`text-accent-light ${refreshing ? 'animate-spin' : ''}`} />
      </div>
      {children}
    </div>
  )
}
