/**
 * Shared domain helpers matching backend enums and booking lifecycle rules.
 */

export const VEHICLE_TYPE_LABELS = {
  TWO_WHEELER: 'Two-wheeler',
  FOUR_WHEELER: 'Four-wheeler',
}

/** Matches HOURLY_RATES in backend booking.service.js (INR per hour) */
export const HOURLY_RATES = {
  TWO_WHEELER: 20,
  FOUR_WHEELER: 40,
}

export function formatVehicleType(type) {
  return VEHICLE_TYPE_LABELS[type] ?? 'Vehicle'
}

/**
 * Return chronological gate entry/exit cycles, supporting both new
 * `gateSessions` arrays and legacy single `entryAt`/`exitAt` records.
 */
export function getBookingGateSessions(booking) {
  if (Array.isArray(booking?.gateSessions) && booking.gateSessions.length > 0) {
    return booking.gateSessions
  }
  if (booking?.entryAt) {
    return [{ entryAt: booking.entryAt, exitAt: booking.exitAt ?? null }]
  }
  return []
}

export function isBookingCheckedIn(booking) {
  if (!booking) return false
  if (booking.status !== 'CONFIRMED' && booking.status !== 'COMPLETED') {
    return false
  }
  return Boolean(booking.entryAt) && !booking.exitAt
}

export function isBookingRetainedAfterExit(booking, referenceMs = 0) {
  if (!booking || booking.status !== 'CONFIRMED') return false
  if (!booking.entryAt || !booking.exitAt) return false
  if (!referenceMs) return true
  return new Date(booking.endTime).getTime() > referenceMs
}

export function getBookingStatusMeta(booking, referenceMs = 0) {
  if (isBookingCheckedIn(booking)) {
    return { label: 'Checked In', variant: 'teal' }
  }
  if (booking?.status === 'EARLY_RELEASED') {
    return { label: 'Early Released', variant: 'info' }
  }
  if (booking?.status === 'CANCELLED') {
    return { label: 'Cancelled', variant: 'neutral' }
  }
  if (booking?.status === 'CONFIRMED' && booking.entryAt && booking.exitAt) {
    const endMs = new Date(booking.endTime).getTime()
    if (!referenceMs || endMs > referenceMs) {
      return { label: 'Exited · Reservation Retained', variant: 'warning' }
    }
    return { label: 'Completed', variant: 'success' }
  }
  if (booking?.status === 'CONFIRMED') {
    return { label: 'Confirmed', variant: 'navy' }
  }
  if (booking?.status === 'COMPLETED') {
    return { label: 'Completed', variant: 'success' }
  }
  return { label: booking?.status ?? 'Unknown', variant: 'neutral' }
}

export function isBookingActive(booking, referenceMs) {
  if (isBookingCheckedIn(booking)) return true
  if (booking?.status !== 'CONFIRMED') return false
  const start = new Date(booking.startTime).getTime()
  const end = new Date(booking.endTime).getTime()
  return start <= referenceMs && end >= referenceMs
}

export function isBookingUpcoming(booking, referenceMs) {
  if (booking?.status !== 'CONFIRMED' || booking.entryAt) return false
  return new Date(booking.startTime).getTime() > referenceMs
}
