import { NavLink } from 'react-router-dom'
import { primaryNav } from '@/lib/nav'

export function CockpitSidebar() {
  return (
    <aside className="hidden md:flex flex-col items-center w-[76px] shrink-0 h-screen sticky top-0 border-r border-white/5 bg-[#0a0708] py-5 gap-1">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#ff5a3c] to-[#ff8a3c] flex items-center justify-center mb-6 shrink-0">
        <span className="text-[11px] font-black text-black tracking-tighter">D</span>
      </div>

      <nav className="flex-1 flex flex-col gap-1 items-center">
        {primaryNav
          .filter((item) => item.path !== '/settings')
          .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              title={item.label}
              className={({ isActive }) =>
                `relative w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  isActive ? 'text-[#ff5a3c] bg-[#ff5a3c]/10' : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[#ff5a3c]"
                      style={{ boxShadow: '0 0 8px #ff5a3c' }}
                    />
                  )}
                  <item.icon size={18} strokeWidth={2} />
                </>
              )}
            </NavLink>
          ))}
      </nav>

      <NavLink
        to="/settings"
        title="Settings"
        className={({ isActive }) =>
          `w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
            isActive ? 'text-[#ff5a3c] bg-[#ff5a3c]/10' : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
          }`
        }
      >
        {primaryNav.find((i) => i.path === '/settings') &&
          (() => {
            const SettingsIcon = primaryNav.find((i) => i.path === '/settings')!.icon
            return <SettingsIcon size={18} strokeWidth={2} />
          })()}
      </NavLink>
    </aside>
  )
}
