/**
 * Admin service — administrative API calls.
 *
 * Endpoints (base: /api/admin):
 *   GET /dashboard — retrieve facility-wide slot, booking, and occupancy statistics
 */
import api from './api.js'

/**
 * Fetch admin dashboard statistics.
 * @returns {Promise<{
 *   slots: { total: number, active: number, maintenance: number, twoWheeler: number, fourWheeler: number },
 *   bookings: { confirmed: number, cancelled: number, completed: number, createdToday: number },
 *   occupancy: { currentlyParked: number },
 * }>}
 */
export async function getAdminDashboardStats() {
  const res = await api.get('/admin/dashboard')
  // 200 — { success: true, message, data: { stats } }
  return res.data.data?.stats
}
