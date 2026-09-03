import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padded?: boolean
}

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'card-surface rounded-2xl shadow-card',
        padded && 'p-5',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
