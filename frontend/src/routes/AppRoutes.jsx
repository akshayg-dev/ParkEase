import { Routes, Route, Navigate } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { CustomerDashboardLayout } from '@/layouts/CustomerDashboardLayout'
import { AdminDashboardLayout } from '@/layouts/AdminDashboardLayout'
import { AdminGuard, CustomerGuard, GuestGuard, RootEntry } from '@/routes/guards'
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
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage'
import { AdminParkingSlotsPage } from '@/pages/admin/AdminParkingSlotsPage'
import { AdminBookingsPage } from '@/pages/admin/AdminBookingsPage'
import { AdminQrScanPage } from '@/pages/admin/AdminQrScanPage'

/**
 * Application route tree.
 *
 * /               — RootEntry (customer → /dashboard, admin → /admin, guest → /login)
 * /login, /register, /forgot-password, /reset-password (+ /auth/* aliases)
 *                 — guest-only; authenticated users redirect to role dashboard
 * /dashboard/*    — customer-only (CustomerGuard + CustomerDashboardLayout)
 * /admin/*        — admin-only (AdminGuard + AdminDashboardLayout)
 * /design-system  — design system showcase preserved for development
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* ── Root entry ────────────────────────────────────────────────── */}
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

      {/* ── Admin portal (authenticated admins only) ──────────────────── */}
      <Route element={<AdminGuard />}>
        <Route path="/admin" element={<AdminDashboardLayout />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="slots" element={<AdminParkingSlotsPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="scan" element={<AdminQrScanPage />} />
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
