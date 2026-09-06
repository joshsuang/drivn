import {
  LayoutDashboard,
  History,
  Wrench,
  Fuel,
  BarChart3,
  Sparkles,
  Map,
  FileText,
  Image,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
}

export const primaryNav: NavItem[] = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Timeline', path: '/timeline', icon: History },
  { label: 'Maintenance', path: '/maintenance', icon: Wrench },
  { label: 'Fuel & Costs', path: '/fuel', icon: Fuel },
  { label: 'Statistics', path: '/statistics', icon: BarChart3 },
  { label: 'Modifications', path: '/modifications', icon: Sparkles },
  { label: 'Trips', path: '/trips', icon: Map },
  { label: 'Documents', path: '/documents', icon: FileText },
  { label: 'Gallery', path: '/gallery', icon: Image },
  { label: 'Settings', path: '/settings', icon: Settings },
]

export const mobileTabs: NavItem[] = [
  { label: 'Overview', path: '/', icon: LayoutDashboard },
  { label: 'Timeline', path: '/timeline', icon: History },
  { label: 'Trips', path: '/trips', icon: Map },
  { label: 'More', path: '/more', icon: Settings },
]

export const moreNav: NavItem[] = [
  { label: 'Maintenance', path: '/maintenance', icon: Wrench },
  { label: 'Fuel & Costs', path: '/fuel', icon: Fuel },
  { label: 'Statistics', path: '/statistics', icon: BarChart3 },
  { label: 'Modifications', path: '/modifications', icon: Sparkles },
  { label: 'Documents', path: '/documents', icon: FileText },
  { label: 'Gallery', path: '/gallery', icon: Image },
  { label: 'Settings', path: '/settings', icon: Settings },
]
