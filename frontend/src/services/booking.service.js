/**
 * Booking service — customer booking API calls.
 *
 * Endpoints (base: /api/bookings):
 *   GET    /            — get authenticated customer's bookings
 *   GET    /:id         — get single booking by id
 *   POST   /            — create a booking
 *   PATCH  /:id/cancel  — cancel a booking
 *   POST   /:id/qr      — generate entry/exit QR token
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
