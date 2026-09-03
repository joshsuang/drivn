import {
  Car,
  Wrench,
  Fuel,
  Sparkles,
  Mountain,
  FileText,
  Receipt,
  Image,
  type LucideIcon,
} from 'lucide-react'
import type { EventType } from '@/types'

export const eventMeta: Record<EventType, { icon: LucideIcon; color: string; bg: string }> = {
  purchase: { icon: Car, color: 'text-accent-light', bg: 'bg-accent/15' },
  maintenance: { icon: Wrench, color: 'text-warn', bg: 'bg-warn/15' },
  fuel: { icon: Fuel, color: 'text-good', bg: 'bg-good/15' },
  modification: { icon: Sparkles, color: 'text-purple', bg: 'bg-purple/15' },
  trip: { icon: Mountain, color: 'text-accent-light', bg: 'bg-accent/15' },
  document: { icon: FileText, color: 'text-gray-300', bg: 'bg-white/10' },
  expense: { icon: Receipt, color: 'text-bad', bg: 'bg-bad/15' },
  photo: { icon: Image, color: 'text-gray-300', bg: 'bg-white/10' },
}
