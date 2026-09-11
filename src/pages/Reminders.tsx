import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BellOff, CalendarClock, Settings as SettingsIcon, ShieldCheck, Wrench } from 'lucide-react'
import { useCarData } from '@/context/DataContext'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { KIND_ICON, ReminderRow, SEVERITY_TEXT } from '@/components/ReminderRow'
import {
  buildReminders,
  isReminderMuted,
  KIND_LABEL,
  summarise,
  type Reminder,
  type ReminderKind,
  type ReminderSeverity,
} from '@/lib/reminders'

const GROUPS: { severity: ReminderSeverity; title: string; hint: string }[] = [
  { severity: 'overdue', title: 'Overdue', hint: 'Past the interval or expiry date.' },
  { severity: 'due-soon', title: 'Due soon', hint: 'Coming up in the next month or 1,000 km.' },
  { severity: 'upcoming', title: 'Upcoming', hint: 'On the horizon, nothing to do yet.' },
]

export default function Reminders() {
  const { data } = useCarData()
  const settings = data.settings

  const reminders = useMemo(() => buildReminders(data), [data])
  const summary = summarise(reminders.filter((r) => !isReminderMuted(r.kind, settings)))

  // Everything the data implies, grouped — including categories the toggles hide.
  const mutedKinds = useMemo(() => {
    const kinds: ReminderKind[] = ['maintenance', 'inspection', 'insurance']
    return kinds.filter((kind) => isReminderMuted(kind, settings))
  }, [settings])

  const mutedWithItems = mutedKinds
    .map((kind) => ({
      kind,
      count: reminders.filter((r) => r.kind === kind).length,
    }))
    .filter((entry) => entry.count > 0)

  const active = reminders.filter((r) => !isReminderMuted(r.kind, settings))
  const allMuted = active.length === 0 && reminders.length > 0

  return (
    <div className="fade-in">
      <Header title="Reminders" subtitle="Services and paperwork that need attention" />

      {allMuted ? (
        <Card>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/5 p-2.5 shrink-0">
              <BellOff size={17} className="text-gray-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-100">
                All reminders are switched off
              </p>
              <p className="text-xs text-gray-500 mt-1">
                There {reminders.length === 1 ? 'is 1 item' : `are ${reminders.length} items`}{' '}
                waiting behind a disabled toggle. Turn a category back on to see it here and in the
                bell.
              </p>
              <Link
                to="/settings"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-accent-light/80 mt-3"
              >
                <SettingsIcon size={13} /> Manage reminders
              </Link>
            </div>
          </div>
        </Card>
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing to remind you about yet"
          description="Add a “Next interval” when you log a service, or an expiry date to a document, and it will show up here automatically."
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <SummaryTile label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? 'bad' : 'neutral'} />
            <SummaryTile label="Due soon" value={summary.dueSoon} tone={summary.dueSoon > 0 ? 'warn' : 'neutral'} />
            <SummaryTile label="Upcoming" value={summary.upcoming} tone="neutral" />
          </div>

          <div className="flex flex-col gap-4">
            {GROUPS.map((group) => {
              const items = active.filter((r) => r.severity === group.severity)
              if (items.length === 0) return null
              return (
                <Card key={group.severity} padded={false}>
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div>
                      <h3 className={`text-sm font-semibold ${SEVERITY_TEXT[group.severity]}`}>
                        {group.title}
                      </h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">{group.hint}</p>
                    </div>
                    <Badge tone={group.severity === 'overdue' ? 'bad' : group.severity === 'due-soon' ? 'warn' : 'neutral'}>
                      {items.length}
                    </Badge>
                  </div>
                  <div className="divide-y divide-white/5">
                    {items.map((reminder) => (
                      <ReminderRow key={reminder.id} reminder={reminder} />
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {mutedWithItems.length > 0 && (
        <Card className="mt-4">
          <h3 className="text-sm font-semibold text-gray-200 mb-1">Muted categories</h3>
          <p className="text-xs text-gray-500 mb-3">
            Switched off in Settings, so they don't appear in the bell.
          </p>
          <div className="flex flex-col gap-2">
            {mutedWithItems.map(({ kind, count }) => {
              const Icon = KIND_ICON[kind]
              return (
                <div key={kind} className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/5 p-2 shrink-0">
                    <Icon size={14} className="text-gray-500" />
                  </div>
                  <span className="text-sm text-gray-400 flex-1">
                    {KIND_LABEL[kind]} — {count} {count === 1 ? 'item' : 'items'}
                  </span>
                </div>
              )
            })}
            <Link
              to="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-light hover:text-accent-light/80 mt-1"
            >
              <SettingsIcon size={13} /> Turn back on
            </Link>
          </div>
        </Card>
      )}

      {active.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-4">
          <SourceLink to="/maintenance" icon={Wrench} label="Log a service or set an interval" />
          <SourceLink to="/documents" icon={ShieldCheck} label="Add an expiry to a document" />
        </div>
      )}
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'bad' | 'warn' | 'neutral'
}) {
  const tones = {
    bad: 'text-bad',
    warn: 'text-warn',
    neutral: 'text-gray-200',
  }
  return (
    <Card className="text-center">
      <p className={`text-2xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="text-[11px] text-gray-500 mt-1">{label}</p>
    </Card>
  )
}

function SourceLink({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: typeof Wrench
  label: string
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-100 bg-white/[0.03] hover:bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 transition-colors"
    >
      <Icon size={14} /> {label}
    </Link>
  )
}
