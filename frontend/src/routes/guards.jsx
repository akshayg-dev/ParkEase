import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageLoader } from '@/components/Spinner'

/**
 * Resolve the default landing route for an authenticated user based on role.
 */
function getDefaultRouteForRole(role) {
  if (role === 'admin') return '/admin'
  if (role === 'customer') return '/dashboard'
  return '/'
}

function getSafeRedirectTarget(role, fromPathname) {
  const fallback = getDefaultRouteForRole(role)
  if (!fromPathname) return fallback
  if (role === 'admin' && fromPathname.startsWith('/admin')) return fromPathname
  if (role === 'customer' && fromPathname.startsWith('/dashboard')) return fromPathname
  return fallback
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
    const target = getSafeRedirectTarget(user?.role, location.state?.from?.pathname)
    return <Navigate to={target} replace />
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
 * Unauthenticated users go to /login; admins are directed to /admin.
 */
export function CustomerGuard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'customer') {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  }

  return <Outlet />
}

/**
 * AdminGuard — allows only authenticated users with role === 'admin'.
 * Unauthenticated users go to /login; customers are directed to /dashboard.
 */
export function AdminGuard() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader label="Checking session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user?.role !== 'admin') {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
  }

  return <Outlet />
}

/**
 * RootEntry — routes visitors by authentication and role:
 *  - Unauthenticated visitors → /login
 *  - Authenticated customers  → /dashboard
 *  - Authenticated admins     → /admin
 */
export function RootEntry() {
  const { user, isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <PageLoader label="Checking session…" />

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={getDefaultRouteForRole(user?.role)} replace />
}
