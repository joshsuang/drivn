import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent'
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  const tones = {
    neutral: 'bg-white/5 text-gray-300 border-white/10',
    good: 'bg-good/10 text-good border-good/20',
    warn: 'bg-warn/10 text-warn border-warn/20',
    bad: 'bg-bad/10 text-bad border-bad/20',
    accent: 'bg-accent/10 text-accent-light border-accent/20',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md border',
        tones[tone]
      )}
    >
      {children}
    </span>
  )
}
