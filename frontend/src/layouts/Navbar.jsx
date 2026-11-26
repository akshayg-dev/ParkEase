import { NavLink } from 'react-router-dom'
import { ParkingSquare } from 'lucide-react'
import { cn } from '@/utils/format'

const NAV_LINKS = [
  { label: 'Overview', to: '/' },
]

/**
 * Top navigation bar shown on all pages.
 */
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 h-14 bg-white border-b border-border">
      <div className="h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
        {/* Wordmark */}
        <NavLink
          to="/"
          className="flex items-center gap-2 text-navy-900 shrink-0"
        >
          <span className="flex items-center justify-center size-8 rounded-md bg-navy-800 text-white">
            <ParkingSquare size={16} strokeWidth={2} />
          </span>
          <span className="font-display font-700 text-[0.9375rem] tracking-tight font-bold">
            ParkEase
          </span>
        </NavLink>

        {/* Primary nav */}
        <nav className="flex items-center gap-1 flex-1" aria-label="Primary">
          {NAV_LINKS.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  'h-8 px-3 rounded-md text-sm font-medium transition-base',
                  isActive
                    ? 'bg-surface-muted text-text-primary'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted',
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right slot — will hold user menu, notifications etc. in later phases */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-tertiary font-medium border border-border rounded px-2 py-1">
            Phase 1
          </span>
        </div>
      </div>
    </header>
  )
}
