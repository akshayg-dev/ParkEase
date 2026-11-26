import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import api from '@/services/api.js'
import * as authService from '@/services/auth.service.js'
import { AuthContext } from './auth.context.js'

/** Persistence key for the access token in sessionStorage */
const TOKEN_KEY = 'parkease_access_token'

/** Endpoints that must never trigger a silent token refresh on 401 */
const SKIP_REFRESH_URLS = [
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
]

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) ?? null)
  const [isLoading, setIsLoading]     = useState(true)

  // Keep a ref so axios interceptors always read the latest token
  const tokenRef = useRef(accessToken)

  useEffect(() => {
    tokenRef.current = accessToken
  }, [accessToken])

  // ── Helpers ─────────────────────────────────────────────────────────
  const clearSession = useCallback(() => {
    setUser(null)
    setAccessToken(null)
    sessionStorage.removeItem(TOKEN_KEY)
    tokenRef.current = null
  }, [])

  // ── Axios interceptors ──────────────────────────────────────────────
  useEffect(() => {
    // Attach the access token to every outgoing request
    const reqId = api.interceptors.request.use((config) => {
      const token = tokenRef.current
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    // On 401 from protected endpoints, try a silent refresh once; on failure, sign out
    const resId = api.interceptors.response.use(
      (res) => res,
      async (error) => {
        const original = error.config
        const requestUrl = original?.url ?? ''
        const shouldSkipRefresh = SKIP_REFRESH_URLS.some((path) =>
          requestUrl.includes(path),
        )

        if (
          error.response?.status === 401 &&
          original &&
          !original._retry &&
          !shouldSkipRefresh
        ) {
          original._retry = true
          try {
            const data = await authService.refreshToken()
            const newToken = data.accessToken
            setAccessToken(newToken)
            sessionStorage.setItem(TOKEN_KEY, newToken)
            tokenRef.current = newToken
            original.headers.Authorization = `Bearer ${newToken}`
            return api(original)
          } catch {
            clearSession()
          }
        }

        const message =
          error.response?.data?.message ?? error.message ?? 'An unexpected error occurred.'
        const normalizedError = new Error(message)
        normalizedError.status = error.response?.status ?? null
        normalizedError.data = error.response?.data?.data ?? null
        return Promise.reject(normalizedError)
      },
    )

    return () => {
      api.interceptors.request.eject(reqId)
      api.interceptors.response.eject(resId)
    }
  }, [clearSession])

  // ── Bootstrap — restore session on mount ───────────────────────────
  useEffect(() => {
    let cancelled = false

    const bootstrap = async () => {
      const storedToken = sessionStorage.getItem(TOKEN_KEY)

      if (!storedToken) {
        // Try a silent refresh in case the httpOnly cookie is still alive
        try {
          const data = await authService.refreshToken()
          if (cancelled) return
          const newToken = data.accessToken
          setAccessToken(newToken)
          sessionStorage.setItem(TOKEN_KEY, newToken)
          tokenRef.current = newToken

          const meData = await authService.getMe()
          if (!cancelled) setUser(meData.user)
        } catch {
          // No valid session — remain logged out
        }
      } else {
        try {
          const meData = await authService.getMe()
          if (!cancelled) setUser(meData.user)
        } catch {
          if (!cancelled) clearSession()
        }
      }

      if (!cancelled) setIsLoading(false)
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [clearSession])

  // ── Public actions ───────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials)
    setAccessToken(data.accessToken)
    sessionStorage.setItem(TOKEN_KEY, data.accessToken)
    tokenRef.current = data.accessToken
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(async (formData) => {
    const result = await authService.register(formData)
    return { message: result.message, verificationEmailSent: result.verificationEmailSent }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Even if the server call fails, clear client state
    }
    clearSession()
  }, [clearSession])

  // ── Context value ────────────────────────────────────────────────────
  const value = useMemo(
    () => ({
      user,
      accessToken,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, accessToken, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
