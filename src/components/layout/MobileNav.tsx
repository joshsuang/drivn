import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Plus, Fuel, Wrench, Map, Sparkles, Image, Receipt, X } from 'lucide-react'
import { mobileTabs, moreNav, type NavItem } from '@/lib/nav'
import { useCarData } from '@/context/DataContext'

const allTabs: NavItem[] = [...mobileTabs.filter((t) => t.path !== '/more'), ...moreNav]

const actions = [
  { label: 'Fuel', icon: Fuel, path: '/fuel', color: 'text-good', bg: 'bg-good/15' },
  { label: 'Maintenance', icon: Wrench, path: '/maintenance', color: 'text-warn', bg: 'bg-warn/15' },
  { label: 'Trip', icon: Map, path: '/trips', color: 'text-accent-light', bg: 'bg-accent/15' },
  { label: 'Modification', icon: Sparkles, path: '/modifications', color: 'text-purple', bg: 'bg-purple/15' },
  { label: 'Expense', icon: Receipt, path: '/statistics', color: 'text-bad', bg: 'bg-bad/15' },
  { label: 'Photo', icon: Image, path: '/gallery', color: 'text-gray-300', bg: 'bg-white/10' },
]

export function MobileNav() {
  const { data } = useCarData()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  function handleAction(path: string) {
    setOpen(false)
    navigate(`${path}?add=1`)
  }

  const moreTab = mobileTabs.find((t) => t.path === '/more')!
  const chosenPaths = data.settings.mobileNavItems ?? ['/', '/timeline', '/trips']
  const chosen = chosenPaths.map((p) => allTabs.find((t) => t.path === p)).filter(Boolean) as NavItem[]
  const tabs = [...chosen.slice(0, 3), moreTab]
  const [left1, left2, right1, right2] = tabs

  return (
    <>
      {open && (
        <div className="md:hidden fixed inset-0 z-[95] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-scale-in" onClick={() => setOpen(false)} />
          <div className="relative w-full bg-base-850 border-t border-white/10 rounded-t-3xl pb-8 pt-5 px-5 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-100">Quick add</h3>
              <button onClick={() => setOpen(false)} className="text-gray-500 p-1.5 rounded-lg hover:bg-white/5">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => handleAction(a.path)}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-95 transition-transform"
                >
                  <div className={`rounded-xl p-2.5 ${a.bg}`}>
                    <a.icon size={19} className={a.color} />
                  </div>
                  <span className="text-[11px] font-medium text-gray-300">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-base-900/95 backdrop-blur-lg border-t border-white/5 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+6px)]">
        <div className="grid grid-cols-5 items-center">
          <TabLink key={left1.path} {...left1} />
          <TabLink key={left2.path} {...left2} />

          <button
            onClick={() => setOpen(true)}
            className="flex flex-col items-center justify-center -mt-5"
          >
            <div className="w-12 h-12 rounded-full bg-accent shadow-glow flex items-center justify-center active:scale-95 transition-transform mx-auto">
              <Plus size={22} className="text-white" />
            </div>
          </button>

          <TabLink key={right1.path} {...right1} />
          <TabLink key={right2.path} {...right2} />
        </div>
      </nav>
    </>
  )
}

function TabLink({ path, icon: Icon, label }: { path: string; icon: typeof Plus; label: string }) {
  return (
    <NavLink
      to={path}
      end={path === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 py-1.5 mx-auto transition-colors ${
          isActive ? 'text-accent-light' : 'text-gray-500'
        }`
      }
    >
      <Icon size={20} strokeWidth={2} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}
