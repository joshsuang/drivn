import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react'
import { useCarData } from '@/context/DataContext'

/**
 * Tells the user when they're working offline and how much is waiting to sync.
 * Without it, a queued write looks identical to a saved one.
 */
export function OfflineBanner() {
  const { online, pendingCount, flushPending } = useCarData()

  if (online && pendingCount === 0) return null

  const changes = pendingCount === 1 ? '1 change' : `${pendingCount} changes`

  return (
    <div
      role="status"
      className={`flex items-center gap-2.5 px-4 md:px-6 lg:px-8 py-2.5 text-xs border-b ${
        online
          ? 'bg-accent/10 border-accent/20 text-accent-light'
          : 'bg-warn/10 border-warn/20 text-warn'
      }`}
    >
      {online ? (
        <CloudUpload size={14} className="shrink-0" />
      ) : (
        <WifiOff size={14} className="shrink-0" />
      )}
      <span className="flex-1">
        {online
          ? `${changes} waiting to sync`
          : pendingCount > 0
            ? `Offline — ${changes} saved on this device and will sync automatically`
            : "Offline — changes are saved on this device and sync when you're back"}
      </span>
      {online && pendingCount > 0 && (
        <button
          onClick={() => void flushPending()}
          className="flex items-center gap-1 font-medium hover:opacity-80 transition-opacity"
        >
          <RefreshCw size={12} /> Sync now
        </button>
      )}
    </div>
  )
}
