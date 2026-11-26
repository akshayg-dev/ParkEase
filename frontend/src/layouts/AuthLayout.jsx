import { Link } from 'react-router-dom'
import { ParkEaseLogo } from '@/components/ParkEaseLogo'

/**
 * AuthLayout — premium split-screen authentication shell.
 *
 * Left pane: form content (passed as children).
 * Right pane: full-bleed photography + brand overlay.
 *
 * On mobile the right pane collapses; the left pane fills the viewport.
 */
export function AuthLayout({ children }) {
  return (
    <div className="min-h-svh flex">

      {/* ── LEFT — form pane ─────────────────────────────────────── */}
      <div className="relative flex flex-col w-full lg:w-[52%] xl:w-[48%] bg-white">

        {/* Top bar */}
        <div className="shrink-0 px-8 pt-8 pb-6">
          <Link to="/" className="inline-flex items-center">
            <ParkEaseLogo variant="full" theme="light" size="md" />
          </Link>
        </div>

        {/* Form area — vertically centred */}
        <div className="flex flex-1 flex-col justify-center px-8 pb-10 sm:px-12 lg:px-14 xl:px-16">
          <div className="w-full max-w-sm mx-auto">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 pb-6 text-center sm:text-left">
          <p className="text-xs text-text-disabled">
            &copy; {new Date().getFullYear()} ParkEase. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── RIGHT — visual pane ───────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[48%] xl:w-[52%] relative overflow-hidden"
        aria-hidden="true"
      >
        {/* Photography — Unsplash (parking / automotive) */}
        <img
          src="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?w=1400&q=85&auto=format&fit=crop"
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />

        {/* Subtle dark overlay — keeps text legible without being heavy */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950/70 via-navy-900/50 to-navy-800/30" />

        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-end p-10 xl:p-14">
          <blockquote className="max-w-xs">
            <p className="text-white/90 text-lg font-display font-medium leading-snug">
              "Parking management that gets out of your way — so you can focus
              on what matters."
            </p>
            <footer className="mt-5">
              <ParkEaseLogo
                variant="full"
                theme="dark"
                size="sm"
                subtitle="Smart facility management"
              />
            </footer>
          </blockquote>

          {/* Subtle feature pills */}
          <div className="flex flex-wrap gap-2 mt-8">
            {['Real-time occupancy', 'Automated billing', 'Role-based access'].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-white/70 border border-white/15 backdrop-blur-sm"
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
