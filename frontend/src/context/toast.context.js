import { createContext } from 'react'

/** @typedef {{ id: string, type: 'success'|'error'|'warning'|'info', message: string }} Toast */

export const ToastContext = createContext(null)
