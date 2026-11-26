import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import * as authService from '@/services/auth.service.js'

function validate(email) {
  if (!email.trim()) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
  return ''
}

export function ForgotPasswordPage() {
  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading]       = useState(false)
  const [serverError, setServerError] = useState('')
  const [submitted, setSubmitted]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validationError = validate(email)
    if (validationError) { setEmailError(validationError); return }
    setLoading(true)
    setServerError('')
    try {
      await authService.forgotPassword({ email: email.trim().toLowerCase() })
      setSubmitted(true)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────
  if (submitted) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="flex items-center justify-center size-14 rounded-full bg-teal-50 border border-teal-200">
            <CheckCircle2 size={28} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-navy-900">Check your email</h1>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
              If an account exists for{' '}
              <span className="font-medium text-text-primary">{email}</span>, we've sent a
              password reset link. It expires in&nbsp;15&nbsp;minutes.
            </p>
          </div>
          <p className="text-xs text-text-tertiary mt-2">
            Didn't receive it?{' '}
            <button
              type="button"
              className="font-medium text-teal-600 hover:text-teal-700 transition-base"
              onClick={() => setSubmitted(false)}
            >
              Try again
            </button>
          </p>
          <Link
            to="/login"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-base"
          >
            <ArrowLeft size={14} />
            Back to sign in
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
          Forgot your password?
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Enter your email and we'll send you a reset link.
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
        <Input
          label="Email address"
          type="email"
          name="email"
          id="forgot-email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (emailError) setEmailError('')
            if (serverError) setServerError('')
          }}
          leftAddon={<Mail />}
          error={emailError}
          disabled={loading}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full mt-1"
        >
          Send reset link
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
