/**
 * Shared domain helpers matching backend enums and business rules.
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

export function getBookingStatusMeta(booking) {
  if (booking.status === 'CONFIRMED' && booking.entryAt && !booking.exitAt) {
    return { label: 'Checked in', variant: 'teal' }
  }
  if (booking.status === 'CONFIRMED') {
    return { label: 'Confirmed', variant: 'navy' }
  }
  if (booking.status === 'COMPLETED') {
    return { label: 'Completed', variant: 'success' }
  }
  if (booking.status === 'CANCELLED') {
    return { label: 'Cancelled', variant: 'neutral' }
  }
  return { label: booking.status ?? 'Unknown', variant: 'neutral' }
}

export function isBookingActive(booking, referenceMs) {
  if (booking.status !== 'CONFIRMED') return false
  if (booking.entryAt && !booking.exitAt) return true
  const start = new Date(booking.startTime).getTime()
  const end = new Date(booking.endTime).getTime()
  return start <= referenceMs && end >= referenceMs && !booking.exitAt
}

export function isBookingUpcoming(booking, referenceMs) {
  if (booking.status !== 'CONFIRMED' || booking.entryAt) return false
  return new Date(booking.startTime).getTime() > referenceMs
}
