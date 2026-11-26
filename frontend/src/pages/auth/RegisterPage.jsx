import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { useAuth } from '@/hooks/useAuth'

function validate(form) {
  const errors = {}
  if (!form.name.trim()) errors.name = 'Full name is required.'
  else if (form.name.trim().length < 2) errors.name = 'Name must be at least 2 characters.'
  else if (form.name.trim().length > 50) errors.name = 'Name must be under 50 characters.'

  if (!form.email.trim()) errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = 'Enter a valid email address.'

  if (!form.password) errors.password = 'Password is required.'
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.'

  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password.'
  else if (form.password !== form.confirmPassword)
    errors.confirmPassword = 'Passwords do not match.'

  return errors
}

/** Password strength: 0–4 */
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

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
  })
  const [errors, setErrors]       = useState({})
  const [showPassword, setShowPassword]         = useState(false)
  const [showConfirm, setShowConfirm]           = useState(false)
  const [loading, setLoading]                   = useState(false)
  const [serverError, setServerError]           = useState('')
  const [successMessage, setSuccessMessage]     = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    if (serverError) setServerError('')
  }

  const strength = getStrength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const fieldErrors = validate(form)
    if (Object.keys(fieldErrors).length) {
      setErrors(fieldErrors)
      return
    }
    setLoading(true)
    setServerError('')
    try {
      const result = await register({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      setSuccessMessage(result.message)
    } catch (err) {
      setServerError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ──────────────────────────────────────────────────
  if (successMessage) {
    return (
      <AuthLayout>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="flex items-center justify-center size-14 rounded-full bg-teal-50 border border-teal-200">
            <CheckCircle2 size={28} className="text-teal-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-navy-900">Account created</h1>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-xs mx-auto">
              {successMessage}
            </p>
          </div>
          <Button variant="primary" size="lg" className="w-full mt-2" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      {/* Heading */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Join ParkEase and manage your parking facility with ease.
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
          label="Full name"
          type="text"
          name="name"
          id="reg-name"
          autoComplete="name"
          placeholder="Jane Smith"
          value={form.name}
          onChange={handleChange}
          leftAddon={<User />}
          error={errors.name}
          disabled={loading}
        />

        <Input
          label="Email address"
          type="email"
          name="email"
          id="reg-email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          leftAddon={<Mail />}
          error={errors.email}
          disabled={loading}
        />

        {/* Password + strength meter */}
        <div className="flex flex-col gap-1.5">
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            id="reg-password"
            autoComplete="new-password"
            placeholder="Minimum 8 characters"
            value={form.password}
            onChange={handleChange}
            leftAddon={<Lock />}
            rightAddon={
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="pointer-events-auto text-text-tertiary hover:text-text-secondary transition-base"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            }
            error={errors.password}
            disabled={loading}
          />
          {/* Strength bar */}
          {form.password.length > 0 && (
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
          label="Confirm password"
          type={showConfirm ? 'text' : 'password'}
          name="confirmPassword"
          id="reg-confirm"
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
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-teal-600 hover:text-teal-700 transition-base"
        >
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
