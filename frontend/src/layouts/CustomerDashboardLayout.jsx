import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarPlus,
  Car,
  CalendarCheck,
  User,
  LogOut,
  ParkingSquare,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/utils/format'

const SIDEBAR_ITEMS = [
  { label: 'Overview',     to: '/dashboard',          icon: LayoutDashboard, end: true },
  { label: 'Book Parking', to: '/dashboard/book',     icon: CalendarPlus },
  { label: 'My Vehicles',  to: '/dashboard/vehicles', icon: Car },
  { label: 'My Bookings',  to: '/dashboard/bookings', icon: CalendarCheck },
  { label: 'Profile',      to: '/dashboard/profile',  icon: User },
]

function getPageTitle(pathname) {
  const match = SIDEBAR_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  )
  return match?.label ?? 'Dashboard'
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Shared sidebar content rendered inside both desktop rail and mobile drawer.
 */
function SidebarContent({ user, onNavigate, onLogout, loggingOut, showClose, onClose }) {
  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Brand header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-border shrink-0">
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2.5 text-navy-900"
        >
          <span className="flex items-center justify-center size-8 rounded-md bg-navy-800 text-white">
            <ParkingSquare size={16} strokeWidth={2} />
          </span>
          <div className="flex flex-col">
            <span className="font-display font-bold text-[0.9375rem] leading-none tracking-tight text-navy-900">
              ParkEase
            </span>
            <span className="text-[11px] text-text-tertiary mt-0.5 leading-none">
              Customer Portal
            </span>
          </div>
        </NavLink>

        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-muted transition-base cursor-pointer lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Primary navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto" aria-label="Customer dashboard">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-base',
                  isActive
                    ? 'bg-navy-50 text-navy-900'
                    : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={17}
                    strokeWidth={isActive ? 2 : 1.75}
                    className={cn(
                      'shrink-0 transition-base',
                      isActive
                        ? 'text-teal-600'
                        : 'text-text-tertiary group-hover:text-text-primary',
                    )}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* Account + Logout footer */}
      <div className="p-3 border-t border-border shrink-0 flex flex-col gap-2">
        {user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md bg-surface-subtle border border-border">
            <span className="flex items-center justify-center size-8 rounded-md bg-navy-800 text-white text-xs font-semibold shrink-0">
              {getInitials(user.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user.name}
              </p>
              <p className="text-[11px] text-text-tertiary truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-red-50 hover:text-error transition-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <LogOut size={17} strokeWidth={1.75} className="shrink-0" />
          <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>
        </button>
      </div>
    </div>
  )
}

/**
 * CustomerDashboardLayout — responsive application shell with fixed desktop sidebar,
 * slide-over mobile drawer, and main content area.
 */
export function CustomerDashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const pageTitle = getPageTitle(location.pathname)

  const handleLogout = async () => {
    setLoggingOut(true)
    await logout()
    setMobileOpen(false)
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-svh flex bg-surface-subtle">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-border z-30">
        <SidebarContent
          user={user}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-navy-950/40"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative z-10 w-64 max-w-[80vw] h-full border-r border-border shadow-modal">
            <SidebarContent
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
              showClose
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-border px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 -ml-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-base cursor-pointer lg:hidden"
            >
              <Menu size={20} />
            </button>
            <span className="text-sm font-medium text-text-primary truncate">
              {pageTitle}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NavLink
              to="/dashboard/book"
              className="hidden sm:inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-base"
            >
              <CalendarPlus size={14} />
              <span>Book Parking</span>
            </NavLink>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
