import { Link } from 'react-router-dom'
import { Wrench, ShieldCheck, FileCheck2, type LucideIcon } from 'lucide-react'
import type { Reminder, ReminderKind, ReminderSeverity } from '@/lib/reminders'

export const KIND_ICON: Record<ReminderKind, LucideIcon> = {
  maintenance: Wrench,
  inspection: FileCheck2,
  insurance: ShieldCheck,
}

export const SEVERITY_TONE: Record<ReminderSeverity, string> = {
  overdue: 'bg-bad/15 text-bad',
  'due-soon': 'bg-warn/15 text-warn',
  upcoming: 'bg-white/8 text-gray-300',
}

export const SEVERITY_TEXT: Record<ReminderSeverity, string> = {
  overdue: 'text-bad',
  'due-soon': 'text-warn',
  upcoming: 'text-gray-500',
}

/** One reminder, tappable through to where it can be dealt with. */
export function ReminderRow({
  reminder,
  onNavigate,
}: {
  reminder: Reminder
  onNavigate?: () => void
}) {
  const Icon = KIND_ICON[reminder.kind]
  return (
    <Link
      to={reminder.to}
      onClick={onNavigate}
      className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-white/5 transition-colors"
    >
      <span className={`rounded-lg p-1.5 shrink-0 ${SEVERITY_TONE[reminder.severity]}`}>
        <Icon size={14} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-gray-100 truncate">{reminder.title}</span>
        <span className={`block text-[11px] ${SEVERITY_TEXT[reminder.severity]}`}>
          {reminder.detail}
          {reminder.secondary && <span className="text-gray-600"> · {reminder.secondary}</span>}
        </span>
      </span>
    </Link>
  )
}
