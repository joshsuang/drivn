import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 font-medium rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-base-900 select-none whitespace-nowrap'

  const variants = {
    primary: 'bg-accent hover:bg-accent-light active:bg-accent-dark text-white shadow-glow',
    secondary: 'bg-base-700 hover:bg-base-600 active:bg-base-500 text-gray-100 border border-white/8',
    ghost: 'bg-transparent hover:bg-white/5 active:bg-white/10 text-gray-300',
    danger: 'bg-bad/10 hover:bg-bad/20 active:bg-bad/25 text-bad border border-bad/15',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2.5',
  }

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}
