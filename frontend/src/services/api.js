/**
 * Axios base instance for ParkEase.
 *
 * Base URL is read from VITE_API_URL (env) — defaults to localhost:5000.
 *
 * NOTE: Auth-related interceptors (token attachment, 401 refresh, error
 * normalisation) are set up in AuthContext so they can access React state.
 * This file intentionally registers no interceptors itself.
 */
import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 60_000,
  withCredentials: true,          // Required: sends the httpOnly refreshToken cookie
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api
