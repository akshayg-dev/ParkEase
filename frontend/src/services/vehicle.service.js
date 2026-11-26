/**
 * Vehicle service — customer vehicle API calls.
 *
 * Endpoints (base: /api/vehicles):
 *   GET    /            — list authenticated customer's vehicles
 *   POST   /            — register a new vehicle
 *   GET    /:id         — get a single vehicle
 *   PATCH  /:id         — update a vehicle
 *   DELETE /:id         — delete a vehicle
 *   PATCH  /:id/default — mark a vehicle as default
 */
import api from './api.js'

/**
 * Fetch all vehicles owned by the authenticated customer.
 * @returns {Promise<Array<object>>}
 */
export async function getVehicles() {
  const res = await api.get('/vehicles')
  // 200 — { success: true, message, data: vehicles[] }
  return Array.isArray(res.data.data) ? res.data.data : []
}

/**
 * Register a new vehicle.
 * @param {{ vehicleNumber: string, vehicleType: 'TWO_WHEELER'|'FOUR_WHEELER' }} data
 * @returns {Promise<object>}
 */
export async function addVehicle(data) {
  const res = await api.post('/vehicles', data)
  return res.data.data
}

/**
 * Update an existing vehicle.
 * @param {string} id
 * @param {{ vehicleNumber?: string, vehicleType?: 'TWO_WHEELER'|'FOUR_WHEELER' }} data
 * @returns {Promise<object>}
 */
export async function updateVehicle(id, data) {
  const res = await api.patch(`/vehicles/${id}`, data)
  return res.data.data
}

/**
 * Delete a vehicle.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function deleteVehicle(id) {
  const res = await api.delete(`/vehicles/${id}`)
  return res.data.data
}

/**
 * Set a vehicle as the default booking vehicle.
 * @param {string} id
 * @returns {Promise<object>}
 */
export async function setDefaultVehicle(id) {
  const res = await api.patch(`/vehicles/${id}/default`)
  return res.data.data
}
