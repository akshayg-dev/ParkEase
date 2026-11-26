/**
 * Lightweight class-based formatting utilities.
 * No external dependencies — pure JS.
 */

/**
 * Format a number as a currency string.
 * @param {number} amount
 * @param {string} [currency='INR']
 * @param {string} [locale='en-IN']
 */
export function formatCurrency(amount, currency = 'INR', locale = 'en-IN') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format an ISO date string to a readable date.
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatDate(date, options = { dateStyle: 'medium' }) {
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(date))
}

/**
 * Format an ISO date string to a readable date + time.
 * @param {string|Date} date
 */
export function formatDateTime(date) {
  return formatDate(date, { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Clamp a number within [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Merge class names, filtering falsy values.
 * @param {...(string|undefined|null|false)} classes
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
