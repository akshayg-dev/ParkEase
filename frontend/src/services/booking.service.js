/**
 * Booking service — customer and admin booking API calls.
 *
 * Customer endpoints (base: /api/bookings):
 *   GET    /            — get authenticated customer's bookings
 *   GET    /:id         — get single booking by id
 *   POST   /            — create a booking
 *   PATCH  /:id/cancel  — cancel a booking
 *   POST   /:id/qr      — generate entry/exit QR token
 *
 * Admin endpoints (base: /api/bookings):
 *   GET    /admin       — list all bookings with optional filters & pagination
 *   GET    /admin/:id   — get single booking with customer/vehicle/slot details
 *   POST   /scan        — scan QR token for ENTRY or EXIT
 */
import api from './api.js'

/**
 * Fetch all bookings belonging to the authenticated customer.
 * Sorted newest-first by the backend.
 * @returns {Promise<Array<object>>}
 */
export async function getMyBookings() {
  const res = await api.get('/bookings')
  // 200 — { success: true, message, data: { bookings } }
  return res.data.data?.bookings ?? []
}

/**
 * Fetch a single booking by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getBookingById(id) {
  const res = await api.get(`/bookings/${id}`)
  return res.data.data?.booking
}

/**
 * Create a new parking booking.
 * @param {{ vehicleId: string, parkingSlotId: string, startTime: string, endTime: string }} data
 * @returns {Promise<object>}
 */
export async function createBooking(data) {
  const res = await api.post('/bookings', data)
  // 201 — { succes: true, message, data: { booking } }
  return res.data.data?.booking
}

/**
 * Cancel an upcoming confirmed booking.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function cancelBooking(id) {
  const res = await api.patch(`/bookings/${id}/cancel`)
  return res.data.data?.booking
}

/**
 * Generate an entry/exit QR token for a confirmed booking.
 * @param {string} id
 * @returns {Promise<{ bookingId: string, qrToken: string }>}
 */
export async function generateBookingQr(id) {
  const res = await api.post(`/bookings/${id}/qr`)
  return res.data.data
}

/**
 * Admin: fetch paginated bookings with optional status and date filters.
 * @param {{
 *   status?: 'CONFIRMED'|'CANCELLED'|'COMPLETED',
 *   startDate?: string,
 *   endDate?: string,
 *   page?: number,
 *   limit?: number,
 * }} [filters]
 * @returns {Promise<{
 *   bookings: Array<object>,
 *   pagination: { total: number, page: number, limit: number, totalPages: number },
 * }>}
 */
export async function getAllBookings(filters = {}) {
  const params = {}
  if (filters.status) params.status = filters.status
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit

  const res = await api.get('/bookings/admin', { params })
  // 200 — { success: true, message, data: { bookings, pagination } }
  return {
    bookings: res.data.data?.bookings ?? [],
    pagination: res.data.data?.pagination ?? {
      total: 0,
      page: 1,
      limit: filters.limit ?? 10,
      totalPages: 0,
    },
  }
}

/**
 * Admin: fetch detailed booking record by ID.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function getAdminBookingById(id) {
  const res = await api.get(`/bookings/admin/${id}`)
  // 200 — { success: true, message, data: { booking } }
  return res.data.data?.booking
}

/**
 * Admin: record customer ENTRY or EXIT using a 64-char hex QR token.
 * @param {{ qrToken: string, action: 'ENTRY'|'EXIT' }} data
 * @returns {Promise<{ message: string, action: 'ENTRY'|'EXIT', isEarlyExit: boolean, booking: object }>}
 */
export async function scanBookingQr(data) {
  const res = await api.post('/bookings/scan', data)
  // 200 — { success: true, message, data: { booking, action, isEarlyExit } }
  return {
    message: res.data.message,
    action: res.data.data?.action ?? data.action,
    isEarlyExit: Boolean(res.data.data?.isEarlyExit),
    booking: res.data.data?.booking,
  }
}

/**
 * Admin: release remaining reservation time after an early exit so the slot
 * becomes available for other customers. Preserves booking and gate history.
 * @param {string} bookingId
 * @returns {Promise<object>}
 */
export async function releaseBookingEarly(bookingId) {
  const res = await api.patch(`/bookings/admin/${bookingId}/release`)
  return res.data.data?.booking
}

/**
 * Admin: reassign a confirmed booking to another compatible active slot.
 * Preserves booking ID, customer, vehicle, times, pricing, and QR token.
 * @param {string} bookingId
 * @param {string} targetSlotId
 * @returns {Promise<object>}
 */
export async function reassignBookingSlot(bookingId, targetSlotId) {
  const res = await api.patch(`/bookings/admin/${bookingId}/reassign`, {
    targetSlotId,
  })
  return res.data.data?.booking
}
