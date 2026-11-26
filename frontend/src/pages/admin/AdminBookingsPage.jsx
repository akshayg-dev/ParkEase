import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CalendarCheck,
  RefreshCw,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Car,
  MapPin,
  Clock,
} from 'lucide-react'
import {
  getAdminBookingById,
  getAllBookings,
} from '@/services/booking.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { cn, formatCurrency, formatDateTime } from '@/utils/format'
import {
  formatVehicleType,
  getBookingGateSessions,
  getBookingStatusMeta,
} from '@/utils/parking'

const STATUS_OPTIONS = [
  'ALL',
  'CONFIRMED',
  'COMPLETED',
  'EARLY_RELEASED',
  'CANCELLED',
]
const PAGE_LIMIT = 10

function buildQueryParams({ status, startDate, endDate, page }) {
  return {
    status: status !== 'ALL' ? status : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit: PAGE_LIMIT,
  }
}

/**
 * AdminBookingsPage — view all facility bookings, filter by status/date range,
 * paginate results, and inspect detailed booking records.
 */
export function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: PAGE_LIMIT,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [startDate, setStartDate]       = useState('')
  const [endDate, setEndDate]           = useState('')
  const [page, setPage]                 = useState(1)

  // Detail modal state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [detailLoading, setDetailLoading]     = useState(false)
  const [detailError, setDetailError]         = useState('')
  const [detailOpen, setDetailOpen]           = useState(false)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false

    getAllBookings(buildQueryParams({ status: statusFilter, startDate, endDate, page }))
      .then((res) => {
        if (cancelled) return
        setBookings(res.bookings)
        setPagination(res.pagination)
        setError('')
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Unable to load facility bookings.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      isMountedRef.current = false
    }
  }, [statusFilter, startDate, endDate, page])

  const handleStatusChange = (nextStatus) => {
    if (nextStatus === statusFilter) return
    setLoading(true)
    setError('')
    setStatusFilter(nextStatus)
    setPage(1)
  }

  const handleStartDateChange = (value) => {
    if (value === startDate) return
    setLoading(true)
    setError('')
    setStartDate(value)
    setPage(1)
  }

  const handleEndDateChange = (value) => {
    if (value === endDate) return
    setLoading(true)
    setError('')
    setEndDate(value)
    setPage(1)
  }

  const handleClearFilters = () => {
    setLoading(true)
    setError('')
    setStatusFilter('ALL')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getAllBookings(
        buildQueryParams({ status: statusFilter, startDate, endDate, page }),
      )
      if (!isMountedRef.current) return
      setBookings(res.bookings)
      setPagination(res.pagination)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err.message ?? 'Unable to refresh bookings.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [statusFilter, startDate, endDate, page])

  const handleInspect = async (bookingId) => {
    setDetailOpen(true)
    setDetailLoading(true)
    setDetailError('')
    setSelectedBooking(null)

    try {
      const detail = await getAdminBookingById(bookingId)
      if (!isMountedRef.current) return
      setSelectedBooking(detail)
    } catch (err) {
      if (!isMountedRef.current) return
      setDetailError(err.message ?? 'Unable to load booking details.')
    } finally {
      if (isMountedRef.current) setDetailLoading(false)
    }
  }

  const hasFilters = statusFilter !== 'ALL' || startDate !== '' || endDate !== ''
  const totalPages = Math.max(1, pagination.totalPages || 1)

  return (
    <PageContainer className="flex flex-col gap-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
            Bookings
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review customer reservations across all slots, filter by status or date, and inspect session details.
          </p>
        </div>

        <Button
          variant="secondary"
          size="md"
          leftIcon={<RefreshCw />}
          loading={loading}
          onClick={handleRefresh}
          className="self-start sm:self-auto"
        >
          Refresh
        </Button>
      </div>

      {/* ── Filter Controls ─────────────────────────────────────────── */}
      <Card className="p-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleStatusChange(key)}
                className={cn(
                  'h-8 px-3 rounded-md text-xs font-medium border transition-base cursor-pointer',
                  statusFilter === key
                    ? 'bg-navy-800 text-white border-navy-800'
                    : 'bg-white text-text-secondary border-border hover:bg-surface-muted hover:text-text-primary',
                )}
              >
                {key === 'ALL'
                  ? 'All statuses'
                  : key === 'EARLY_RELEASED'
                    ? 'Early Released'
                    : key.charAt(0) + key.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-start-date" className="text-xs font-medium text-text-tertiary">
              Start date (from)
            </label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="h-9 rounded-md border border-border bg-white px-3 text-sm text-text-primary focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-end-date" className="text-xs font-medium text-text-tertiary">
              Start date (to)
            </label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="h-9 rounded-md border border-border bg-white px-3 text-sm text-text-primary focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>
        </div>
      </Card>

      {/* ── Error Banner ────────────────────────────────────────────── */}
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
              onClick={handleRefresh}
            >
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* ── Bookings Table ──────────────────────────────────────────── */}
      <Card noPadding>
        <Card.Header>
          <div>
            <h2 className="text-base font-semibold font-display text-text-primary">
              All Reservations
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              {pagination.total} matching booking{pagination.total === 1 ? '' : 's'}
            </p>
          </div>
        </Card.Header>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <Spinner size="md" label="Loading bookings…" />
            <p className="text-xs text-text-tertiary">Loading facility bookings…</p>
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title={hasFilters ? 'No matching bookings' : 'No bookings recorded yet'}
            description={
              hasFilters
                ? 'Try widening your date range or changing the status filter.'
                : 'Customer reservations will appear here once created.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              ) : null
            }
            className="py-12"
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-subtle text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
                    <th className="py-3 px-5">Customer</th>
                    <th className="py-3 px-4">Slot</th>
                    <th className="py-3 px-4">Vehicle</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {bookings.map((booking) => {
                    const badge = getBookingStatusMeta(booking)
                    return (
                      <tr
                        key={booking._id}
                        className="hover:bg-surface-subtle/60 transition-base"
                      >
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <p className="font-medium text-text-primary">
                            {booking.customer?.name ?? '—'}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {booking.customer?.email ?? '—'}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold font-display text-navy-900 whitespace-nowrap">
                          {booking.parkingSlot?.slotNumber ?? '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-medium text-text-primary">
                            {booking.vehicle?.vehicleNumber ?? '—'}
                          </p>
                          <p className="text-xs text-text-tertiary">
                            {formatVehicleType(booking.vehicle?.vehicleType)}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-text-secondary whitespace-nowrap">
                          <p>{formatDateTime(booking.startTime)}</p>
                          <p className="text-text-tertiary mt-0.5">
                            {booking.durationHours}h
                          </p>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-text-primary whitespace-nowrap">
                          {formatCurrency(booking.totalPrice)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <Badge label={badge.label} variant={badge.variant} />
                        </td>
                        <td className="py-3.5 px-5 text-right whitespace-nowrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Eye />}
                            onClick={() => handleInspect(booking._id)}
                          >
                            Inspect
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-5 py-3.5 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-text-tertiary">
                Page {pagination.page} of {totalPages} · {pagination.total} total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ChevronLeft />}
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => {
                    setLoading(true)
                    setPage((p) => Math.max(1, p - 1))
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  rightIcon={<ChevronRight />}
                  disabled={pagination.page >= totalPages || loading}
                  onClick={() => {
                    setLoading(true)
                    setPage((p) => p + 1)
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* ── Booking Details Modal ───────────────────────────────────── */}
      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-detail-title"
        >
          <Card noPadding className="w-full max-w-lg shadow-modal overflow-hidden">
            <Card.Header>
              <div>
                <h2
                  id="booking-detail-title"
                  className="text-base font-semibold font-display text-navy-900"
                >
                  Booking Details
                </h2>
                {selectedBooking?._id && (
                  <p className="text-xs font-mono text-text-tertiary mt-0.5">
                    {selectedBooking._id}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                aria-label="Close booking details"
                className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-muted transition-base cursor-pointer"
              >
                <X size={18} />
              </button>
            </Card.Header>

            {detailLoading ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <Spinner size="md" label="Loading booking details…" />
                <p className="text-xs text-text-tertiary">Loading booking details…</p>
              </div>
            ) : detailError ? (
              <Card.Body>
                <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{detailError}</span>
                </div>
              </Card.Body>
            ) : selectedBooking ? (
              <div className="divide-y divide-border text-sm">
                <div className="px-5 py-3.5 flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Status
                  </span>
                  <Badge {...getBookingStatusMeta(selectedBooking)} />
                </div>

                <div className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <User size={13} /> Customer
                  </span>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">
                      {selectedBooking.customer?.name ?? '—'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {selectedBooking.customer?.email ?? '—'}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin size={13} /> Parking Slot
                  </span>
                  <div className="text-right">
                    <p className="font-semibold text-navy-900">
                      {selectedBooking.parkingSlot?.slotNumber ?? '—'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {formatVehicleType(selectedBooking.parkingSlot?.vehicleType)}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <Car size={13} /> Vehicle
                  </span>
                  <div className="text-right">
                    <p className="font-medium text-text-primary">
                      {selectedBooking.vehicle?.vehicleNumber ?? '—'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {formatVehicleType(selectedBooking.vehicle?.vehicleType)}
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={13} /> Schedule
                  </span>
                  <div className="text-right text-xs text-text-secondary">
                    <p>Start: {formatDateTime(selectedBooking.startTime)}</p>
                    <p className="mt-0.5">End: {formatDateTime(selectedBooking.endTime)}</p>
                    <p className="mt-0.5 text-text-tertiary">
                      Duration: {selectedBooking.durationHours}h
                    </p>
                  </div>
                </div>

                <div className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Gate Activity
                  </span>
                  <div className="text-right text-xs text-text-secondary">
                    {getBookingGateSessions(selectedBooking).length === 0 ? (
                      <p>Not recorded</p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {getBookingGateSessions(selectedBooking).map((session, idx) => (
                          <p key={`${selectedBooking._id}-detail-session-${idx}`}>
                            Cycle {idx + 1}: In {formatDateTime(session.entryAt)} ·{' '}
                            {session.exitAt
                              ? `Out ${formatDateTime(session.exitAt)}`
                              : 'Active'}
                          </p>
                        ))}
                      </div>
                    )}
                    {selectedBooking.releasedAt && (
                      <p className="mt-1 text-text-tertiary">
                        Early released: {formatDateTime(selectedBooking.releasedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="px-5 py-3.5 flex items-center justify-between gap-3 bg-surface-subtle">
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Total Charge
                  </span>
                  <div className="text-right">
                    <span className="text-base font-bold font-display text-navy-900">
                      {formatCurrency(selectedBooking.totalPrice)}
                    </span>
                    <span className="ml-2 text-xs text-text-tertiary">
                      ({formatCurrency(selectedBooking.pricePerHour)}/hr)
                    </span>
                  </div>
                </div>
              </div>
            ) : null}

            <Card.Footer>
              <Button variant="secondary" size="sm" onClick={() => setDetailOpen(false)}>
                Close
              </Button>
            </Card.Footer>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
