import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import * as authService from '@/services/auth.service.js'

function getStrength(pw) {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}

const STRENGTH_LABEL = ['', 'Weak', 'Fair', 'Good', 'Strong']
const STRENGTH_COLOR = ['', 'bg-error', 'bg-warning', 'bg-teal-400', 'bg-teal-600']

function validate(form) {
  const errors = {}
  if (!form.newPassword) errors.newPassword = 'Password is required.'
  else if (form.newPassword.length < 8)
    errors.newPassword = 'Password must be at least 8 characters.'
  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (form.newPassword !== form.confirmPassword)
    errors.confirmPassword = 'Passwords do not match.'
  return errors
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // The backend emails a link like: /auth/reset-password?token=<raw_token>
  const token = searchParams.get('token') ?? ''

  const [form, setForm]           = useState({ newPassword: '', confirmPassword: '' })
  const [errors, setErrors]       = useState({})
  const [showNew, setShowNew]     = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [serverError, setServerError] = useState('')
  const [success, setSuccess]     = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (serverError) setServerError('')
  }

  const strength = getStrength(form.newPassword)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!token) {
      setServerError('Reset token is missing. Please use the link from your email.')
      return
    }

    const fieldErrors = validate(form)
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }

    setLoading(true)
    setServerError('')
    try {
      await authService.resetPassword({ token, newPassword: form.newPassword })
      setSuccess(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────
  if (success) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="flex items-center justify-center size-14 rounded-full bg-teal-50 border border-teal-200">
            <CheckCircle2 size={28} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-navy-900">Password reset</h1>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
              Your password has been updated successfully. You can now sign in
              with your new password.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="w-full mt-2"
            onClick={() => navigate('/login', { replace: true })}
          >
            Sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  // ── Missing token guard ────────────────────────────────────────────
  if (!token) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="flex items-center justify-center size-14 rounded-full bg-red-50 border border-red-200">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-navy-900">Invalid link</h1>
            <p className="mt-2 text-sm text-text-secondary max-w-xs mx-auto">
              This password reset link is invalid or has expired. Please request
              a new one.
            </p>
          </div>
          <Link
            to="/forgot-password"
            className="mt-2"
          >
            <Button variant="primary" size="lg" className="w-full">
              Request new link
            </Button>
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
          Set new password
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Choose a strong password for your account.
        </p>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* New password + strength */}
        <div className="flex flex-col gap-1.5">
          <Input
            label="New password"
            type={showNew ? 'text' : 'password'}
            name="newPassword"
            id="reset-new"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            value={form.newPassword}
            onChange={handleChange}
            leftAddon={<Lock />}
            rightAddon={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowNew((v) => !v)}
                className="pointer-events-auto text-text-tertiary hover:text-text-secondary transition-base"
                aria-label={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
            error={errors.newPassword}
            disabled={loading}
          />
          {form.newPassword.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      strength >= n ? STRENGTH_COLOR[strength] : 'bg-border'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-text-tertiary w-10 text-right">
                {STRENGTH_LABEL[strength]}
              </span>
            </div>
          )}
        </div>

        <Input
          label="Confirm new password"
          type={showConfirm ? 'text' : 'password'}
          name="confirmPassword"
          id="reset-confirm"
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirmPassword}
          onChange={handleChange}
          leftAddon={<Lock />}
          rightAddon={
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              className="pointer-events-auto text-text-tertiary hover:text-text-secondary transition-base"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
          error={errors.confirmPassword}
          disabled={loading}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full mt-2"
        >
          Reset password
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-base"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
