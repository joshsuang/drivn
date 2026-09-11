import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'

/**
 * Inline edit/delete for table rows and list items.
 *
 * Deletion asks once in place rather than opening a modal — the cost of the
 * mistake is low enough that a confirm-and-dismiss is plenty, and it keeps the
 * list uncluttered. The real safety net is that deleting now actually works and
 * is queued if offline.
 */
export function RowActions({
  onEdit,
  onDelete,
  editLabel = 'Edit',
  deleteLabel = 'Delete',
}: {
  onEdit?: () => void
  onDelete?: () => void
  editLabel?: string
  deleteLabel?: string
}) {
  const [confirming, setConfirming] = useState(false)

  const iconButton =
    'rounded-lg p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors'

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setConfirming(false)
            onDelete?.()
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-bad bg-bad/10 hover:bg-bad/20 transition-colors"
          title={deleteLabel}
        >
          <Check size={12} /> {deleteLabel}?
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg p-1.5 text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors"
          title="Cancel"
        >
          <X size={13} />
        </button>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      {onEdit && (
        <button type="button" onClick={onEdit} className={iconButton} title={editLabel}>
          <Pencil size={13} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-lg p-1.5 text-gray-500 hover:text-bad hover:bg-bad/10 transition-colors"
          title={deleteLabel}
        >
          <Trash2 size={13} />
        </button>
      )}
    </span>
  )
}
