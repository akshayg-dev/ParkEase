/**
 * Parking slot service — read and manage parking slots.
 *
 * Endpoints (base: /api/parking-slots):
 *   GET   /     — list slots (supports optional query filters: vehicleType, status)
 *   GET   /:id  — get single slot by id
 *   POST  /     — create a parking slot (admin only)
 *   PATCH /:id  — update a parking slot (admin only)
 */
import api from './api.js'

/**
 * Fetch parking slots.
 * @param {{ vehicleType?: 'TWO_WHEELER'|'FOUR_WHEELER', status?: 'ACTIVE'|'MAINTENANCE' }} [filters]
 * @returns {Promise<Array<object>>}
 */
export async function getParkingSlots(filters = {}) {
  const params = {}
  if (filters.vehicleType) params.vehicleType = filters.vehicleType
  if (filters.status) params.status = filters.status

  const res = await api.get('/parking-slots', { params })
  // 200 — { success: true, message, data: { slots } }
  return res.data.data?.slots ?? []
}

/**
 * Create a new parking slot (admin only).
 * @param {{ slotNumber: string, vehicleType: 'TWO_WHEELER'|'FOUR_WHEELER' }} data
 * @returns {Promise<object>}
 */
export async function createParkingSlot(data) {
  const res = await api.post('/parking-slots', data)
  // 201 — { succes: true, message, data: { slot } }
  return res.data.data?.slot
}

/**
 * Update an existing parking slot (admin only).
 * @param {string} id
 * @param {{ slotNumber?: string, vehicleType?: 'TWO_WHEELER'|'FOUR_WHEELER', status?: 'ACTIVE'|'MAINTENANCE' }} data
 * @returns {Promise<object>}
 */
export async function updateParkingSlot(id, data) {
  const res = await api.patch(`/parking-slots/${id}`, data)
  // 200 — { success: true, message, data: { slot } }
  return res.data.data?.slot
}

/**
 * Inspect whether a parking slot has active/upcoming confirmed bookings
 * blocking maintenance, along with eligible replacement slots per conflict.
 * @param {string} id
 * @returns {Promise<{ slot: object, conflicts: Array<{ booking: object, eligibleSlots: Array<object> }> }>}
 */
export async function getSlotMaintenanceCheck(id) {
  const res = await api.get(`/parking-slots/${id}/maintenance-check`)
  return res.data.data
}
