import { useRef, useState, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'
import { useCarData } from '@/context/DataContext'

export function PullToRefresh({ children }: { children: ReactNode }) {
  const { reload } = useCarData()
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY <= 0) startY.current = e.touches[0].clientY
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null || refreshing) return
    const diff = e.touches[0].clientY - startY.current
    if (diff > 0 && window.scrollY <= 0) {
      setPull(Math.min(diff * 0.5, 80))
    }
  }

  async function onTouchEnd() {
    if (pull > 55 && !refreshing) {
      setRefreshing(true)
      await reload()
      setRefreshing(false)
    }
    setPull(0)
    startY.current = null
  }

  return (
    <div ref={containerRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-all md:hidden"
        style={{ height: refreshing ? 40 : pull }}
      >
        <RefreshCw
          size={18}
          className={`text-accent-light ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
        />
      </div>
      {children}
    </div>
  )
}
