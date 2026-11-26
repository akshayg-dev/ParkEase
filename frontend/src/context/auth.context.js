import { createContext } from 'react'

/**
 * @typedef {{ _id: string, name: string, email: string, role: 'customer'|'admin', isVerified: boolean }} User
 */

/**
 * @typedef {{
 *   user: User|null,
 *   accessToken: string|null,
 *   isAuthenticated: boolean,
 *   isLoading: boolean,
 *   login: (data: { email: string, password: string }) => Promise<void>,
 *   register: (data: { name: string, email: string, password: string }) => Promise<{ message: string, verificationEmailSent: boolean }>,
 *   logout: () => Promise<void>,
 * }} AuthContextValue
 */

export const AuthContext = createContext(/** @type {AuthContextValue|null} */ (null))
