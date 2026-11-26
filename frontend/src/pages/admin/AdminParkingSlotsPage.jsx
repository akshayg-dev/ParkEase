import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  MapPin,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Power,
  X,
  ArrowRightLeft,
} from 'lucide-react'
import {
  createParkingSlot,
  getParkingSlots,
  getSlotMaintenanceCheck,
  updateParkingSlot,
} from '@/services/parkingSlot.service'
import { reassignBookingSlot } from '@/services/booking.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { cn, formatDateTime } from '@/utils/format'
import { formatVehicleType } from '@/utils/parking'

const STATUS_FILTERS = ['ALL', 'ACTIVE', 'MAINTENANCE']

function getSlotStatusBadge(status) {
  if (status === 'ACTIVE') return { label: 'Active', variant: 'teal' }
  if (status === 'MAINTENANCE') return { label: 'Maintenance', variant: 'warning' }
  return { label: status ?? 'Unknown', variant: 'neutral' }
}

/**
 * AdminParkingSlotsPage — list, filter, create, toggle status, and handle
 * booking reassignment when moving a slot with confirmed bookings to MAINTENANCE.
 */
export function AdminParkingSlotsPage() {
  const [slots, setSlots]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [successMsg, setSuccessMsg]   = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter]     = useState('ALL')
  const [searchQuery, setSearchQuery]   = useState('')

  // Create form
  const [slotNumber, setSlotNumber]   = useState('')
  const [vehicleType, setVehicleType] = useState('FOUR_WHEELER')
  const [formError, setFormError]     = useState('')
  const [creating, setCreating]       = useState(false)

  // Per-slot status update lock
  const [updatingId, setUpdatingId]   = useState('')

  // Maintenance conflict + reassignment modal state
  const [conflictModal, setConflictModal] = useState(null)
  // { slot, conflicts: [{ booking, eligibleSlots }], error: '', loading: false }
  const [targetSelections, setTargetSelections] = useState({})
  const [reassigningId, setReassigningId]       = useState('')

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false

    getParkingSlots()
      .then((list) => {
        if (!cancelled) setSlots(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Unable to load parking slots.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      isMountedRef.current = false
    }
  }, [])

  const reloadSlots = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await getParkingSlots()
      if (!isMountedRef.current) return
      setSlots(list)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err.message ?? 'Unable to refresh parking slots.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  const seedTargetSelections = useCallback((conflicts) => {
    const next = {}
    for (const item of conflicts) {
      next[item.booking._id] = item.eligibleSlots[0]?._id ?? ''
    }
    setTargetSelections(next)
  }, [])

  const handleCreateSlot = async (e) => {
    e.preventDefault()
    const trimmed = slotNumber.trim().toUpperCase()

    if (!trimmed) {
      setFormError('Slot number is required.')
      return
    }
    if (trimmed.length > 20) {
      setFormError('Slot number must be 20 characters or fewer.')
      return
    }

    setCreating(true)
    setFormError('')
    setError('')
    setSuccessMsg('')

    try {
      const created = await createParkingSlot({
        slotNumber: trimmed,
        vehicleType,
      })
      if (!isMountedRef.current) return

      setSlots((prev) =>
        [...prev, created].sort((a, b) =>
          (a.slotNumber ?? '').localeCompare(b.slotNumber ?? ''),
        ),
      )
      setSlotNumber('')
      setSuccessMsg(`Parking slot ${created.slotNumber} added successfully.`)
    } catch (err) {
      if (isMountedRef.current) {
        setFormError(err.message ?? 'Unable to create parking slot.')
      }
    } finally {
      if (isMountedRef.current) setCreating(false)
    }
  }

  const handleToggleStatus = async (slot) => {
    const nextStatus = slot.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE'
    setUpdatingId(slot._id)
    setError('')
    setSuccessMsg('')

    try {
      const updated = await updateParkingSlot(slot._id, { status: nextStatus })
      if (!isMountedRef.current) return

      setSlots((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item)),
      )
      setSuccessMsg(
        `Slot ${updated.slotNumber} updated to ${nextStatus === 'ACTIVE' ? 'Active' : 'Maintenance'}.`,
      )
    } catch (err) {
      if (!isMountedRef.current) return

      if (err.status === 409 && Array.isArray(err.data?.conflicts)) {
        seedTargetSelections(err.data.conflicts)
        setConflictModal({
          slot,
          conflicts: err.data.conflicts,
          error: '',
          loading: false,
        })
      } else {
        setError(err.message ?? 'Unable to update slot status.')
      }
    } finally {
      if (isMountedRef.current) setUpdatingId('')
    }
  }

  const handleReassignBooking = async (bookingId) => {
    if (!conflictModal) return
    const targetSlotId = targetSelections[bookingId]
    if (!targetSlotId) return

    setReassigningId(bookingId)
    setConflictModal((prev) => (prev ? { ...prev, error: '' } : null))

    try {
      await reassignBookingSlot(bookingId, targetSlotId)
      const checkResult = await getSlotMaintenanceCheck(conflictModal.slot._id)
      if (!isMountedRef.current) return

      seedTargetSelections(checkResult.conflicts)
      setConflictModal({
        slot: checkResult.slot,
        conflicts: checkResult.conflicts,
        error: '',
        loading: false,
      })
    } catch (err) {
      if (!isMountedRef.current) return
      setConflictModal((prev) =>
        prev ? { ...prev, error: err.message ?? 'Unable to reassign booking.' } : null,
      )
    } finally {
      if (isMountedRef.current) setReassigningId('')
    }
  }

  const handleCompleteMaintenance = async () => {
    if (!conflictModal) return
    const targetSlot = conflictModal.slot
    setConflictModal((prev) => (prev ? { ...prev, loading: true, error: '' } : null))

    try {
      const updated = await updateParkingSlot(targetSlot._id, {
        status: 'MAINTENANCE',
      })
      if (!isMountedRef.current) return

      setSlots((prev) =>
        prev.map((item) => (item._id === updated._id ? updated : item)),
      )
      setConflictModal(null)
      setSuccessMsg(`Slot ${updated.slotNumber} updated to Maintenance.`)
    } catch (err) {
      if (!isMountedRef.current) return
      if (err.status === 409 && Array.isArray(err.data?.conflicts)) {
        seedTargetSelections(err.data.conflicts)
        setConflictModal({
          slot: targetSlot,
          conflicts: err.data.conflicts,
          error: err.message,
          loading: false,
        })
      } else {
        setConflictModal((prev) =>
          prev
            ? {
                ...prev,
                loading: false,
                error: err.message ?? 'Unable to set slot to maintenance.',
              }
            : null,
        )
      }
    }
  }

  const filteredSlots = useMemo(() => {
    const query = searchQuery.trim().toUpperCase()
    return slots.filter((slot) => {
      if (statusFilter !== 'ALL' && slot.status !== statusFilter) return false
      if (typeFilter !== 'ALL' && slot.vehicleType !== typeFilter) return false
      if (query && !(slot.slotNumber ?? '').toUpperCase().includes(query)) return false
      return true
    })
  }, [slots, statusFilter, typeFilter, searchQuery])

  const counts = useMemo(() => {
    let active = 0
    let maintenance = 0
    for (const s of slots) {
      if (s.status === 'ACTIVE') active += 1
      else if (s.status === 'MAINTENANCE') maintenance += 1
    }
    return { total: slots.length, active, maintenance }
  }, [slots])

  const hasFilters = statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery.trim() !== ''

  return (
    <PageContainer className="flex flex-col gap-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
            Parking Slots
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Add new parking slots and manage availability between Active and Maintenance.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          leftIcon={<RefreshCw />}
          loading={loading}
          onClick={reloadSlots}
          className="self-start sm:self-auto"
        >
          Refresh
        </Button>
      </div>

      {/* ── Feedback Banners ────────────────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center justify-between gap-3 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-xs font-medium text-teal-700 hover:text-teal-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw />}
              loading={loading}
              onClick={reloadSlots}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ── Main Grid: Slots Table + Add Slot Form ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Slots List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {STATUS_FILTERS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    className={cn(
                      'h-8 px-3 rounded-md text-xs font-medium border transition-base cursor-pointer',
                      statusFilter === key
                        ? 'bg-navy-800 text-white border-navy-800'
                        : 'bg-white text-text-secondary border-border hover:bg-surface-muted hover:text-text-primary',
                    )}
                  >
                    {key === 'ALL'
                      ? `All (${counts.total})`
                      : key === 'ACTIVE'
                        ? `Active (${counts.active})`
                        : `Maintenance (${counts.maintenance})`}
                  </button>
                ))}
              </div>

              <select
                aria-label="Filter by vehicle type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-8 rounded-md border border-border bg-white px-2.5 text-xs font-medium text-text-secondary focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="ALL">All vehicle types</option>
                <option value="FOUR_WHEELER">Four-wheeler</option>
                <option value="TWO_WHEELER">Two-wheeler</option>
              </select>
            </div>

            <Input
              placeholder="Search by slot number (e.g. A-01)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftAddon={<Search />}
            />
          </Card>

          <Card noPadding>
            <Card.Header>
              <div>
                <h2 className="text-base font-semibold font-display text-text-primary">
                  Slot Directory
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Showing {filteredSlots.length} of {slots.length} slot{slots.length === 1 ? '' : 's'}
                </p>
              </div>
            </Card.Header>

            {loading ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <Spinner size="md" label="Loading parking slots…" />
                <p className="text-xs text-text-tertiary">Loading parking slots…</p>
              </div>
            ) : filteredSlots.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title={hasFilters ? 'No matching parking slots' : 'No parking slots added yet'}
                description={
                  hasFilters
                    ? 'Adjust your status, vehicle type, or search filter.'
                    : 'Use the Add Parking Slot form to create the first facility slot.'
                }
                action={
                  hasFilters ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setStatusFilter('ALL')
                        setTypeFilter('ALL')
                        setSearchQuery('')
                      }}
                    >
                      Clear filters
                    </Button>
                  ) : null
                }
                className="py-12"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-subtle text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                      <th className="py-3 px-5">Slot Number</th>
                      <th className="py-3 px-4">Vehicle Type</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {filteredSlots.map((slot) => {
                      const badge = getSlotStatusBadge(slot.status)
                      const isActive = slot.status === 'ACTIVE'
                      const isUpdating = updatingId === slot._id

                      return (
                        <tr
                          key={slot._id}
                          className="hover:bg-surface-subtle/60 transition-base"
                        >
                          <td className="py-3.5 px-5 font-semibold font-display text-navy-900 whitespace-nowrap">
                            {slot.slotNumber}
                          </td>
                          <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                            {formatVehicleType(slot.vehicleType)}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge label={badge.label} variant={badge.variant} />
                          </td>
                          <td className="py-3.5 px-5 text-right whitespace-nowrap">
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={isActive ? <Wrench /> : <Power />}
                              loading={isUpdating}
                              disabled={Boolean(updatingId)}
                              onClick={() => handleToggleStatus(slot)}
                            >
                              {isActive ? 'Set Maintenance' : 'Set Active'}
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Add Slot Card */}
        <div>
          <Card noPadding>
            <Card.Header>
              <div>
                <h2 className="text-base font-semibold font-display text-text-primary">
                  Add Parking Slot
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Create a new active facility slot
                </p>
              </div>
            </Card.Header>

            <form onSubmit={handleCreateSlot} noValidate>
              <Card.Body className="flex flex-col gap-4">
                <Input
                  label="Slot number"
                  id="slot-number"
                  placeholder="A-01"
                  maxLength={20}
                  value={slotNumber}
                  onChange={(e) => {
                    setSlotNumber(e.target.value)
                    if (formError) setFormError('')
                  }}
                  hint="1–20 characters, stored in uppercase."
                  error={formError}
                  disabled={creating}
                />

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="slot-vehicle-type"
                    className="text-sm font-medium text-text-primary"
                  >
                    Vehicle type
                  </label>
                  <select
                    id="slot-vehicle-type"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    disabled={creating}
                    className="h-9 rounded-md border border-border bg-white px-3 text-sm text-text-primary focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    <option value="FOUR_WHEELER">Four-wheeler</option>
                    <option value="TWO_WHEELER">Two-wheeler</option>
                  </select>
                </div>
              </Card.Body>

              <Card.Footer>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<Plus />}
                  loading={creating}
                  className="w-full"
                >
                  Add Slot
                </Button>
              </Card.Footer>
            </form>
          </Card>
        </div>
      </div>

      {/* ── Maintenance Conflict & Booking Reassignment Modal ──────── */}
      {conflictModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="maint-conflict-title"
        >
          <Card noPadding className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-modal overflow-hidden">
            <Card.Header>
              <div>
                <h2
                  id="maint-conflict-title"
                  className="text-base font-semibold font-display text-navy-900"
                >
                  Confirmed Bookings on Slot {conflictModal.slot.slotNumber}
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Reassign all active and upcoming confirmed bookings before moving this slot to Maintenance.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                aria-label="Close maintenance conflict dialog"
                className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-muted transition-base cursor-pointer"
              >
                <X size={18} />
              </button>
            </Card.Header>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {conflictModal.error && (
                <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{conflictModal.error}</span>
                </div>
              )}

              {conflictModal.conflicts.length === 0 ? (
                <div className="flex items-start gap-2.5 rounded-md border border-teal-200 bg-teal-50 px-4 py-3.5 text-sm text-teal-800">
                  <CheckCircle2 size={16} className="text-teal-600 mt-0.5 shrink-0" />
                  <span>
                    All conflicting bookings have been reassigned. Slot{' '}
                    <strong>{conflictModal.slot.slotNumber}</strong> can now be moved to Maintenance.
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>
                      {conflictModal.conflicts.length} confirmed booking
                      {conflictModal.conflicts.length === 1 ? '' : 's'} currently reserve this slot.
                      Reassigned bookings keep their existing booking ID, times, pricing, and QR pass.
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {conflictModal.conflicts.map(({ booking, eligibleSlots }) => {
                      const selectedTarget = targetSelections[booking._id] ?? ''
                      const isReassigning = reassigningId === booking._id
                      const hasReplacement = eligibleSlots.length > 0

                      return (
                        <div
                          key={booking._id}
                          className="rounded-md border border-border bg-surface-subtle p-4 flex flex-col gap-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-navy-900">
                                {booking.customer?.name ?? 'Customer'}{' '}
                                <span className="font-normal text-text-tertiary">
                                  ({booking.customer?.email ?? '—'})
                                </span>
                              </p>
                              <p className="text-xs text-text-secondary mt-0.5">
                                {booking.vehicle?.vehicleNumber ?? '—'} ·{' '}
                                {formatVehicleType(booking.vehicle?.vehicleType)} ·{' '}
                                {formatDateTime(booking.startTime)} →{' '}
                                {formatDateTime(booking.endTime)}
                              </p>
                            </div>
                            <Badge
                              label={
                                booking.entryAt && !booking.exitAt
                                  ? 'Active Session'
                                  : booking.exitAt
                                    ? 'Reserved Until End'
                                    : 'Upcoming'
                              }
                              variant={
                                booking.entryAt && !booking.exitAt
                                  ? 'teal'
                                  : booking.exitAt
                                    ? 'warning'
                                    : 'navy'
                              }
                            />
                          </div>

                          {hasReplacement ? (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-border">
                              <select
                                aria-label={`Select replacement slot for booking ${booking._id}`}
                                value={selectedTarget}
                                onChange={(e) =>
                                  setTargetSelections((prev) => ({
                                    ...prev,
                                    [booking._id]: e.target.value,
                                  }))
                                }
                                disabled={Boolean(reassigningId)}
                                className="flex-1 h-9 rounded-md border border-border bg-white px-3 text-sm text-text-primary focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                              >
                                {eligibleSlots.map((candidate) => (
                                  <option key={candidate._id} value={candidate._id}>
                                    Slot {candidate.slotNumber} ({formatVehicleType(candidate.vehicleType)})
                                  </option>
                                ))}
                              </select>

                              <Button
                                variant="primary"
                                size="sm"
                                leftIcon={<ArrowRightLeft />}
                                loading={isReassigning}
                                disabled={!selectedTarget || Boolean(reassigningId)}
                                onClick={() => handleReassignBooking(booking._id)}
                              >
                                Reassign
                              </Button>
                            </div>
                          ) : (
                            <p className="text-xs text-red-700 pt-2 border-t border-border">
                              No eligible active {formatVehicleType(conflictModal.slot.vehicleType).toLowerCase()} replacement
                              slot is free during this booking window. Maintenance cannot proceed until
                              another compatible slot is available or this booking ends.
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            <Card.Footer>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConflictModal(null)}
                disabled={conflictModal.loading || Boolean(reassigningId)}
              >
                Close
              </Button>
              {conflictModal.conflicts.length === 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<Wrench />}
                  loading={conflictModal.loading}
                  onClick={handleCompleteMaintenance}
                >
                  Confirm Maintenance
                </Button>
              )}
            </Card.Footer>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
