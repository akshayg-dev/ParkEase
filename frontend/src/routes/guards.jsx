import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LogOut, ParkingSquare } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/Spinner'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'

/**
 * Resolve the default landing route for an authenticated user based on role.
 * Admin routing is reserved for a later phase and stays separate from /dashboard.
 */
function getDefaultRouteForRole(role) {
  return role === 'customer' ? '/dashboard' : '/'
}

/**
 * GuestGuard — redirects authenticated users away from guest-only auth pages.
 * While the session is bootstrapping, shows a full-page loader.
 */
export function GuestGuard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking session…" />

  if (isAuthenticated) {
    const defaultRoute = getDefaultRouteForRole(user?.role)
    const from = location.state?.from?.pathname

    // Keep admin users separate from the customer dashboard
    if (user?.role !== 'customer') {
      return <Navigate to={defaultRoute} replace />
    }

    return <Navigate to={from ?? defaultRoute} replace />
  }

  return <Outlet />
}

/**
 * AuthGuard — redirects unauthenticated users to login.
 * While the session is bootstrapping, shows a full-page loader.
 */
export function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * CustomerGuard — allows only authenticated users with role === 'customer'.
 * Unauthenticated users go to /login; non-customer users (e.g. admin) stay
 * separated from the customer dashboard.
 */
export function CustomerGuard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'customer') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

/**
 * RootEntry — replaces the temporary Phase 1 home page:
 *  - Unauthenticated visitors → /login
 *  - Authenticated customers  → /dashboard
 *  - Authenticated admins     → minimal holding view (admin dashboard comes later)
 */
export function RootEntry() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  if (isLoading) return <PageLoader label="Checking session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role === 'customer') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-svh bg-surface-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center flex flex-col items-center gap-4">
        <span className="flex items-center justify-center size-10 rounded-lg bg-navy-800 text-white">
          <ParkingSquare size={20} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="text-lg font-bold font-display text-navy-900">
            Admin workspace pending
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Signed in as <span className="font-medium text-text-primary">{user?.email}</span>.
            The admin dashboard will be built in the next phase.
          </p>
        </div>
        <Button
          variant="secondary"
          size="md"
          leftIcon={<LogOut />}
          onClick={() => logout()}
        >
          Sign out
        </Button>
      </Card>
    </div>
  )
}
