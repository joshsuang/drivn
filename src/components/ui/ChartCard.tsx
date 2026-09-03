import type { ReactNode } from 'react'
import { Card } from './Card'

interface ChartCardProps {
  title: string
  headerRight?: ReactNode
  value?: string
  valueUnit?: string
  sublabel?: string
  trend?: string
  trendTone?: 'up' | 'down'
  children: ReactNode
}

export function ChartCard({
  title,
  headerRight,
  value,
  valueUnit,
  sublabel,
  trend,
  trendTone,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium text-gray-300">{title}</h3>
        {headerRight}
      </div>
      {value && (
        <div className="mb-1">
          <span className="text-2xl font-semibold text-gray-50 tracking-tight">{value}</span>
          {valueUnit && <span className="text-sm text-gray-400 ml-1">{valueUnit}</span>}
        </div>
      )}
      {sublabel && <p className="text-xs text-gray-500 mb-0.5">{sublabel}</p>}
      {trend && (
        <p className={`text-xs mb-4 ${trendTone === 'down' ? 'text-good' : 'text-good'}`}>
          {trend}
        </p>
      )}
      {!trend && !sublabel && <div className="mb-4" />}
      <div>{children}</div>
    </Card>
  )
}
