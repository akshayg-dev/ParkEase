import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  CalendarPlus,
  CalendarCheck,
  Clock,
  Car,
  MapPin,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Plus,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getMyBookings } from '@/services/booking.service'
import { getVehicles } from '@/services/vehicle.service'
import { getParkingSlots } from '@/services/parkingSlot.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { formatCurrency, formatDateTime } from '@/utils/format'
import {
  formatVehicleType,
  getBookingStatusMeta,
  isBookingActive,
  isBookingUpcoming,
} from '@/utils/parking'

async function fetchDashboardData() {
  const [bookingsRes, vehiclesRes, slotsRes] = await Promise.allSettled([
    getMyBookings(),
    getVehicles(),
    getParkingSlots({ status: 'ACTIVE' }),
  ])

  return {
    bookings: bookingsRes.status === 'fulfilled' ? bookingsRes.value : null,
    bookingsError:
      bookingsRes.status === 'rejected'
        ? bookingsRes.reason?.message ?? 'Unable to load bookings.'
        : '',
    vehicles: vehiclesRes.status === 'fulfilled' ? vehiclesRes.value : null,
    vehiclesError:
      vehiclesRes.status === 'rejected'
        ? vehiclesRes.reason?.message ?? 'Unable to load vehicles.'
        : '',
    slots: slotsRes.status === 'fulfilled' ? slotsRes.value : null,
    slotsError:
      slotsRes.status === 'rejected'
        ? slotsRes.reason?.message ?? 'Unable to load parking slots.'
        : '',
  }
}

/**
 * CustomerOverviewPage — real customer dashboard at /dashboard.
 * Integrates bookings, registered vehicles, and active parking slots.
 */
export function CustomerOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [slots, setSlots]       = useState([])
  const [loadedAt, setLoadedAt] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [errors, setErrors]     = useState({
    bookings: '',
    vehicles: '',
    slots: '',
  })

  const isMountedRef = useRef(true)

  const applyDashboardResult = useCallback((result) => {
    if (result.bookings !== null) setBookings(result.bookings)
    if (result.vehicles !== null) setVehicles(result.vehicles)
    if (result.slots !== null) setSlots(result.slots)
    setErrors({
      bookings: result.bookingsError,
      vehicles: result.vehiclesError,
      slots: result.slotsError,
    })
    setLoadedAt(Date.now())
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false

    fetchDashboardData()
      .then((result) => {
        if (cancelled) return
        applyDashboardResult(result)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      isMountedRef.current = false
    }
  }, [applyDashboardResult])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchDashboardData()
      if (!isMountedRef.current) return
      applyDashboardResult(result)
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [applyDashboardResult])

  const { activeBooking, upcomingBookings, recentBookings } = useMemo(() => {
    const active = bookings.find((b) => isBookingActive(b, loadedAt)) ?? null
    const upcoming = bookings
      .filter((b) => isBookingUpcoming(b, loadedAt))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))

    return {
      activeBooking: active,
      upcomingBookings: upcoming,
      recentBookings: bookings.slice(0, 5),
    }
  }, [bookings, loadedAt])

  const slotCounts = useMemo(() => {
    let twoWheeler = 0
    let fourWheeler = 0
    for (const slot of slots) {
      if (slot.vehicleType === 'TWO_WHEELER') twoWheeler += 1
      else if (slot.vehicleType === 'FOUR_WHEELER') fourWheeler += 1
    }
    return { twoWheeler, fourWheeler }
  }, [slots])

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const hasAnyError = Boolean(errors.bookings || errors.vehicles || errors.slots)

  return (
    <PageContainer className="flex flex-col gap-6">
      {/* ── Welcome + Booking Action ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Monitor active parking sessions, upcoming bookings, available slots, and vehicles.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<RefreshCw />}
            loading={loading}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<CalendarPlus />}
            onClick={() => navigate('/dashboard/book')}
          >
            Book Parking
          </Button>
        </div>
      </div>

      {/* ── API Error Alert (if any request failed) ──────────────────── */}
      {hasAnyError && (
        <Card className="border-red-200 bg-red-50/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>
                {errors.bookings || errors.slots || errors.vehicles}
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw />}
              loading={loading}
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ── Active Booking & Upcoming Bookings ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Booking */}
        <Card noPadding className="flex flex-col">
          <Card.Header className="pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center size-8 rounded-md bg-teal-50 text-teal-600 border border-teal-200">
                <Clock size={16} strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-text-primary font-display">
                  Active Booking
                </h2>
                <p className="text-xs text-text-tertiary">Ongoing parking session</p>
              </div>
            </div>
            {activeBooking && (
              <Badge {...getBookingStatusMeta(activeBooking, loadedAt)} />
            )}
          </Card.Header>

          <Card.Body className="flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" label="Loading active booking…" />
              </div>
            ) : errors.bookings ? (
              <EmptyState
                icon={AlertCircle}
                title="Could not load active booking"
                description={errors.bookings}
                className="py-5"
              />
            ) : activeBooking ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xl font-bold font-display text-navy-900">
                    Slot {activeBooking.parkingSlot?.slotNumber ?? '—'}
                  </span>
                  <span className="text-sm font-semibold text-text-primary">
                    {formatCurrency(activeBooking.totalPrice)}
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-text-secondary pt-2.5 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Car size={14} className="text-text-tertiary shrink-0" />
                    <span>
                      {activeBooking.vehicle?.vehicleNumber ?? '—'} ·{' '}
                      {formatVehicleType(activeBooking.vehicle?.vehicleType)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-text-tertiary shrink-0" />
                    <span>
                      {formatDateTime(activeBooking.startTime)} →{' '}
                      {formatDateTime(activeBooking.endTime)}
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <Link
                    to="/dashboard/bookings"
                    className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-base"
                  >
                    <span>Manage active booking</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={Clock}
                title="No active parking session"
                description="You do not have an ongoing parking session right now."
                className="py-5"
              />
            )}
          </Card.Body>
        </Card>

        {/* Upcoming Bookings */}
        <Card noPadding className="flex flex-col">
          <Card.Header className="pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center size-8 rounded-md bg-navy-50 text-navy-700 border border-navy-200">
                <CalendarCheck size={16} strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-text-primary font-display">
                  Upcoming Bookings
                </h2>
                <p className="text-xs text-text-tertiary">
                  {upcomingBookings.length > 0
                    ? `${upcomingBookings.length} confirmed reservation${upcomingBookings.length === 1 ? '' : 's'}`
                    : 'Scheduled reservations'}
                </p>
              </div>
            </div>
            {upcomingBookings.length > 0 && (
              <Link
                to="/dashboard/bookings"
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-base"
              >
                <span>View all</span>
                <ArrowRight size={13} />
              </Link>
            )}
          </Card.Header>

          <Card.Body className="flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" label="Loading upcoming bookings…" />
              </div>
            ) : errors.bookings ? (
              <EmptyState
                icon={AlertCircle}
                title="Could not load upcoming bookings"
                description={errors.bookings}
                className="py-5"
              />
            ) : upcomingBookings.length > 0 ? (
              <div className="flex flex-col divide-y divide-border">
                {upcomingBookings.slice(0, 3).map((booking) => (
                  <div
                    key={booking._id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">
                        Slot {booking.parkingSlot?.slotNumber ?? '—'} ·{' '}
                        <span className="text-text-secondary font-normal">
                          {booking.vehicle?.vehicleNumber ?? '—'}
                        </span>
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {formatDateTime(booking.startTime)} · {booking.durationHours}h
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-semibold text-text-primary">
                        {formatCurrency(booking.totalPrice)}
                      </span>
                      <Badge {...getBookingStatusMeta(booking, loadedAt)} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CalendarCheck}
                title="No upcoming bookings"
                description="Reserve a parking slot ahead of arrival to guarantee availability."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<CalendarPlus />}
                    onClick={() => navigate('/dashboard/book')}
                  >
                    Book Parking
                  </Button>
                }
                className="py-5"
              />
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ── Available Parking Slots & Registered Vehicles ────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Available Parking Slots */}
        <Card noPadding className="flex flex-col">
          <Card.Header className="pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center size-8 rounded-md bg-teal-50 text-teal-600 border border-teal-200">
                <MapPin size={16} strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-text-primary font-display">
                  Available Parking Slots
                </h2>
                <p className="text-xs text-text-tertiary">
                  Active slots across the facility
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<CalendarPlus />}
              onClick={() => navigate('/dashboard/book')}
            >
              Book Slot
            </Button>
          </Card.Header>

          <Card.Body className="flex-1 flex flex-col gap-4">
            {loading ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" label="Loading parking slots…" />
              </div>
            ) : errors.slots ? (
              <EmptyState
                icon={AlertCircle}
                title="Could not load parking slots"
                description={errors.slots}
                className="py-5"
              />
            ) : slots.length === 0 ? (
              <EmptyState
                icon={MapPin}
                title="No active parking slots"
                description="There are currently no active slots open for booking."
                className="py-5"
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={`${slots.length} Active`} variant="teal" />
                  <Badge label={`${slotCounts.fourWheeler} Four-wheeler`} variant="navy" />
                  <Badge label={`${slotCounts.twoWheeler} Two-wheeler`} variant="neutral" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {slots.slice(0, 6).map((slot) => (
                    <button
                      key={slot._id}
                      type="button"
                      onClick={() => navigate(`/dashboard/book?slotId=${slot._id}`)}
                      className="text-left p-2.5 rounded-md border border-border bg-surface-subtle hover:border-teal-500 hover:bg-teal-50/40 transition-base cursor-pointer"
                    >
                      <p className="text-sm font-semibold font-display text-navy-900">
                        {slot.slotNumber}
                      </p>
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        {formatVehicleType(slot.vehicleType)}
                      </p>
                    </button>
                  ))}
                </div>

                {slots.length > 6 && (
                  <p className="text-xs text-text-tertiary">
                    Showing 6 of {slots.length} active slots.{' '}
                    <Link
                      to="/dashboard/book"
                      className="font-medium text-teal-600 hover:text-teal-700"
                    >
                      View all in Book Parking
                    </Link>
                  </p>
                )}
              </>
            )}
          </Card.Body>
        </Card>

        {/* Registered Vehicles */}
        <Card noPadding className="flex flex-col">
          <Card.Header className="pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center size-8 rounded-md bg-navy-50 text-navy-700 border border-navy-200">
                <Car size={16} strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-text-primary font-display">
                  My Vehicles
                </h2>
                <p className="text-xs text-text-tertiary">
                  {vehicles.length > 0
                    ? `${vehicles.length} registered vehicle${vehicles.length === 1 ? '' : 's'}`
                    : 'Registered vehicles'}
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/vehicles"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-base"
            >
              <span>Manage</span>
              <ArrowRight size={13} />
            </Link>
          </Card.Header>

          <Card.Body className="flex-1 flex flex-col justify-between">
            {loading ? (
              <div className="py-8 flex justify-center">
                <Spinner size="md" label="Loading vehicles…" />
              </div>
            ) : errors.vehicles ? (
              <EmptyState
                icon={AlertCircle}
                title="Could not load vehicles"
                description={errors.vehicles}
                className="py-5"
              />
            ) : vehicles.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No vehicles registered"
                description="Add a vehicle before creating your first parking booking."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus />}
                    onClick={() => navigate('/dashboard/vehicles')}
                  >
                    Add Vehicle
                  </Button>
                }
                className="py-5"
              />
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {vehicles.slice(0, 4).map((vehicle) => (
                  <div
                    key={vehicle._id}
                    className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900 tracking-wide">
                        {vehicle.vehicleNumber}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {formatVehicleType(vehicle.vehicleType)}
                      </p>
                    </div>
                    {vehicle.isDefault && (
                      <Badge label="Default" variant="teal" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* ── Recent Booking History ───────────────────────────────────── */}
      <Card noPadding>
        <Card.Header>
          <div>
            <h2 className="text-base font-semibold text-text-primary font-display">
              Recent Booking History
            </h2>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Your latest parking reservations from your account history.
            </p>
          </div>
          {bookings.length > 0 && (
            <Link
              to="/dashboard/bookings"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-base shrink-0"
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </Card.Header>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <Spinner size="md" label="Loading recent bookings…" />
            <p className="text-xs text-text-tertiary">Loading recent activity…</p>
          </div>
        ) : errors.bookings ? (
          <EmptyState
            icon={AlertCircle}
            title="Unable to load booking history"
            description={errors.bookings}
            className="py-10"
          />
        ) : recentBookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No booking history yet"
            description="Once you reserve a parking slot, your bookings and session statuses will appear here."
            action={
              <Button
                variant="primary"
                size="sm"
                leftIcon={<CalendarPlus />}
                onClick={() => navigate('/dashboard/book')}
              >
                Book Parking
              </Button>
            }
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-subtle text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                  <th className="py-3 px-5">Slot</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Start Time</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {recentBookings.map((booking) => {
                  const badge = getBookingStatusMeta(booking, loadedAt)
                  return (
                    <tr
                      key={booking._id}
                      className="hover:bg-surface-subtle/60 transition-base"
                    >
                      <td className="py-3.5 px-5 font-medium text-text-primary whitespace-nowrap">
                        {booking.parkingSlot?.slotNumber ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                        <span className="font-medium text-text-primary">
                          {booking.vehicle?.vehicleNumber ?? '—'}
                        </span>
                        {booking.vehicle?.vehicleType && (
                          <span className="ml-2 text-xs text-text-tertiary">
                            {formatVehicleType(booking.vehicle.vehicleType)}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                        {formatDateTime(booking.startTime)}
                      </td>
                      <td className="py-3.5 px-4 text-text-secondary whitespace-nowrap">
                        {booking.durationHours}h
                      </td>
                      <td className="py-3.5 px-4 font-medium text-text-primary whitespace-nowrap">
                        {formatCurrency(booking.totalPrice)}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <Badge label={badge.label} variant={badge.variant} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
