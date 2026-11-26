/**
 * Auth service — all API calls for authentication.
 *
 * Endpoints (base: /api/auth):
 *   POST   /register        { name, email, password }
 *   POST   /login           { email, password }
 *   POST   /refresh         (uses httpOnly refreshToken cookie)
 *   POST   /logout          (protected — sends Authorization header)
 *   POST   /forgot-password { email }
 *   POST   /reset-password  { token, newPassword }
 *   GET    /verify-email/:token
 *   GET    /me              (protected)
 */
import api from './api.js'

/**
 * Register a new customer account.
 * @param {{ name: string, email: string, password: string }} data
 * @returns {Promise<{ user: object, verificationEmailSent: boolean, message: string }>}
 */
export async function register(data) {
  const res = await api.post('/auth/register', data)
  // 201 — { succes: true, message, data: { user, verificationEmailSent } }
  return { ...res.data.data, message: res.data.message }
}

/**
 * Log in with email and password.
 * The server sets an httpOnly `refreshToken` cookie automatically.
 * @param {{ email: string, password: string }} data
 * @returns {Promise<{ user: object, accessToken: string }>}
 */
export async function login(data) {
  const res = await api.post('/auth/login', data)
  // 200 — { success: true, message, data: { user, accessToken } }
  return res.data.data
}

/**
 * Silently refresh the access token using the refreshToken cookie.
 * @returns {Promise<{ accessToken: string }>}
 */
export async function refreshToken() {
  const res = await api.post('/auth/refresh')
  return res.data.data
}

/**
 * Log out the current user (clears the refreshToken cookie server-side).
 * @returns {Promise<void>}
 */
export async function logout() {
  await api.post('/auth/logout')
}

/**
 * Request a password-reset email.
 * Always returns a generic success message regardless of whether the
 * email is registered (backend is intentionally vague).
 * @param {{ email: string }} data
 * @returns {Promise<{ message: string }>}
 */
export async function forgotPassword(data) {
  const res = await api.post('/auth/forgot-password', data)
  return { message: res.data.message }
}

/**
 * Complete a password reset using the token from the email link.
 * @param {{ token: string, newPassword: string }} data
 * @returns {Promise<{ message: string }>}
 */
export async function resetPassword(data) {
  const res = await api.post('/auth/reset-password', data)
  return { message: res.data.message }
}

/**
 * Verify an email address using the token embedded in the verification link.
 * @param {string} token  The raw token from the URL param.
 * @returns {Promise<{ user: object }>}
 */
export async function verifyEmail(token) {
  const res = await api.get(`/auth/verify-email/${token}`)
  // 200 — { success: true, message, data: { user } }
  return res.data.data
}

/**
 * Fetch the currently authenticated user's profile.
 * @returns {Promise<{ user: object }>}
 */
export async function getMe() {
  const res = await api.get('/auth/me')
  return res.data.data
}
