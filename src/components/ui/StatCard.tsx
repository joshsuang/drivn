import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from './Card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  label: string
  value: string
  sublabel?: string
  trend?: 'up' | 'down' | 'neutral'
  to?: string
}

export function StatCard({
  icon: Icon,
  iconColor = 'text-accent-light',
  iconBg = 'bg-accent/10',
  label,
  value,
  sublabel,
  trend,
  to,
}: StatCardProps) {
  const content = (
    <Card className={cn('flex items-center gap-3.5 h-full', to && 'hover:bg-white/[0.04] transition-colors cursor-pointer')}>
      <div className={cn('rounded-xl p-2.5 shrink-0', iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] text-gray-400 leading-none mb-1.5">{label}</p>
        <p className="text-xl font-semibold text-gray-50 leading-none tracking-tight">{value}</p>
        {sublabel && (
          <p
            className={cn(
              'text-xs mt-1.5',
              trend === 'up' && 'text-good',
              trend === 'down' && 'text-bad',
              !trend && 'text-gray-500'
            )}
          >
            {sublabel}
          </p>
        )}
      </div>
    </Card>
  )

  if (to) {
    return (
      <Link to={to} className="block h-full">
        {content}
      </Link>
    )
  }
  return content
}
