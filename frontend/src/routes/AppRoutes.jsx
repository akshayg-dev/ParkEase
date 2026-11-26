import { Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { CustomerDashboardLayout } from '@/layouts/CustomerDashboardLayout'
import { CustomerGuard, GuestGuard, RootEntry } from '@/routes/guards'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { EmailVerificationPage } from '@/pages/auth/EmailVerificationPage'
import { CustomerOverviewPage } from '@/pages/dashboard/CustomerOverviewPage'
import { BookParkingPage } from '@/pages/dashboard/BookParkingPage'
import { MyVehiclesPage } from '@/pages/dashboard/MyVehiclesPage'
import { MyBookingsPage } from '@/pages/dashboard/MyBookingsPage'
import { ProfilePage } from '@/pages/dashboard/ProfilePage'

/**
 * Application route tree.
 *
 * /               — RootEntry (customer → /dashboard, guest → /login, admin → holding screen)
 * /login, /register, /forgot-password, /reset-password (+ /auth/* aliases)
 *                 — guest-only; authenticated customers redirect to /dashboard
 * /dashboard/*    — customer-only (CustomerGuard + CustomerDashboardLayout)
 * /design-system  — design system showcase preserved for development
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* ── Root entry (replaces DesignSystemPage as default landing) ── */}
      <Route path="/" element={<RootEntry />} />

      {/* ── Auth routes (guest only) ──────────────────────────────────── */}
      <Route element={<GuestGuard />}>
        <Route path="/login"            element={<LoginPage />} />
        <Route path="/register"         element={<RegisterPage />} />
        <Route path="/forgot-password"  element={<ForgotPasswordPage />} />
        <Route path="/reset-password"   element={<ResetPasswordPage />} />

        {/* /auth/* aliases */}
        <Route path="/auth/login"           element={<LoginPage />} />
        <Route path="/auth/register"        element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password"  element={<ResetPasswordPage />} />
      </Route>

      {/* ── Email verification (public) ───────────────────────────────── */}
      <Route path="/verify-email/:token"       element={<EmailVerificationPage />} />
      <Route path="/auth/verify-email/:token"  element={<EmailVerificationPage />} />

      {/* ── Customer dashboard (authenticated customers only) ───────────── */}
      <Route element={<CustomerGuard />}>
        <Route path="/dashboard" element={<CustomerDashboardLayout />}>
          <Route index element={<CustomerOverviewPage />} />
          <Route path="book" element={<BookParkingPage />} />
          <Route path="vehicles" element={<MyVehiclesPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* ── Design system (preserved for development) ─────────────────── */}
      <Route element={<RootLayout />}>
        <Route path="/design-system" element={<DesignSystemPage />} />
      </Route>

      {/* ── Catch-all ─────────────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
