import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/Button'
import * as authService from '@/services/auth.service.js'

/**
 * EmailVerificationPage
 *
 * Mounted at /auth/verify-email/:token
 * The backend sends a link like:
 *   <FRONTEND_URL>/auth/verify-email/<raw_token>
 *
 * This page hits GET /api/auth/verify-email/:token automatically on mount.
 */
export function EmailVerificationPage() {
  const { token } = useParams()

  const [status, setStatus] = useState(token ? 'loading' : 'error') // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState(
    token ? '' : 'Verification token is missing.',
  )

  useEffect(() => {
    if (!token) return

    let cancelled = false

    authService
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus('success')
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error')
          setMessage(err.message ?? 'Invalid or expired verification link.')
        }
      })

    return () => { cancelled = true }
  }, [token])

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center gap-5 py-4">

        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="flex items-center justify-center size-14 rounded-full bg-navy-50 border border-navy-200">
              <Loader2 size={28} className="text-navy-600 animate-spin" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-navy-900">
                Verifying your email…
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                Please wait while we confirm your address.
              </p>
            </div>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="flex items-center justify-center size-14 rounded-full bg-teal-50 border border-teal-200">
              <CheckCircle2 size={28} className="text-teal-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-navy-900">
                Email verified
              </h1>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                Your email address has been confirmed. You can now sign in to
                your ParkEase account.
              </p>
            </div>
            <Link to="/login" className="w-full mt-2">
              <Button variant="primary" size="lg" className="w-full">
                Go to sign in
              </Button>
            </Link>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="flex items-center justify-center size-14 rounded-full bg-red-50 border border-red-200">
              <XCircle size={28} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display text-navy-900">
                Verification failed
              </h1>
              <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
                {message || 'This verification link is invalid or has expired.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full mt-2">
              <Link to="/register">
                <Button variant="primary" size="lg" className="w-full">
                  Register again
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="lg" className="w-full">
                  Back to sign in
                </Button>
              </Link>
            </div>
          </>
        )}

      </div>
    </AuthLayout>
  )
}
