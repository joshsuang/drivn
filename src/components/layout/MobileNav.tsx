import { useEffect, useRef, useState } from 'react'
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

const RADIUS = 92
const ARC = 150 // degrees, fanned upward above the button

export function MobileNav() {
  const { data } = useCarData()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const wrapRef = useRef<HTMLDivElement>(null)
  const fabStyle = data.settings.fabStyle ?? 'radial'

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && fabStyle === 'radial' && wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, fabStyle])

  function handleAction(path: string) {
    setOpen(false)
    navigate(`${path}?add=1`)
  }

  const DEFAULT_TABS = ['/', '/timeline', '/trips']
  const moreTab = mobileTabs.find((t) => t.path === '/more')!
  const chosenPaths = data.settings.mobileNavItems ?? DEFAULT_TABS
  let chosen = chosenPaths.map((p) => allTabs.find((t) => t.path === p)).filter(Boolean) as NavItem[]
  if (chosen.length < 3) {
    for (const p of DEFAULT_TABS) {
      if (chosen.length >= 3) break
      const fallback = allTabs.find((t) => t.path === p)
      if (fallback && !chosen.some((c) => c.path === fallback.path)) chosen.push(fallback)
    }
  }
  const tabs = [...chosen.slice(0, 3), moreTab]
  const [left1, left2, right1, right2] = tabs

  return (
    <>
      {open && fabStyle === 'sheet' && (
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[80] bg-base-900 border-t border-white/5 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+6px)]">
        <div className="grid grid-cols-5 items-center">
          <TabLink key={left1.path} {...left1} />
          <TabLink key={left2.path} {...left2} />

          <div ref={wrapRef} className="relative flex items-center justify-center">
            {fabStyle === 'radial' &&
              actions.map((a, i) => {
                const angleDeg = -ARC / 2 + (ARC / (actions.length - 1)) * i
                const rad = (angleDeg * Math.PI) / 180
                const x = RADIUS * Math.sin(rad)
                const y = -RADIUS * Math.cos(rad)
                return (
                  <button
                    key={a.label}
                    onClick={() => handleAction(a.path)}
                    aria-label={a.label}
                    tabIndex={open ? 0 : -1}
                    className="absolute left-1/2 top-1/2 w-11 h-11 -ml-[22px] -mt-[22px] rounded-full bg-base-800 border border-white/12 flex items-center justify-center shadow-lg"
                    style={{
                      transform: open ? `translate(${x}px, ${y}px) scale(1)` : 'translate(0,0) scale(0.3)',
                      opacity: open ? 1 : 0,
                      transition: `transform 320ms cubic-bezier(0.34,1.56,0.64,1) ${open ? i * 35 : 0}ms, opacity 160ms ease-out`,
                      pointerEvents: open ? 'auto' : 'none',
                    }}
                  >
                    <a.icon size={17} className="text-gray-200" />
                  </button>
                )
              })}

            <button
              onClick={() => setOpen((o) => !o)}
              className="relative w-12 h-12 rounded-full bg-gradient-to-br from-accent-light to-purple shadow-glow flex items-center justify-center -mt-5 z-10"
              aria-expanded={open}
              aria-label="Quick add"
            >
              <Plus
                size={22}
                className="text-white"
                style={{
                  transform: open && fabStyle === 'radial' ? 'rotate(135deg)' : 'rotate(0deg)',
                  transition: 'transform 280ms cubic-bezier(0.34,1.56,0.64,1)',
                }}
              />
            </button>
          </div>

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
