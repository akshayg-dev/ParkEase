import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarCheck,
  CalendarPlus,
  QrCode,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react'
import {
  cancelBooking,
  generateBookingQr,
  getMyBookings,
} from '@/services/booking.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { cn, formatCurrency, formatDateTime } from '@/utils/format'
import { formatVehicleType, getBookingStatusMeta } from '@/utils/parking'

const FILTERS = ['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export function MyBookingsPage() {
  const navigate = useNavigate()

  const [bookings, setBookings]   = useState([])
  const [loadedAt, setLoadedAt]   = useState(0)
  const [filter, setFilter]       = useState('ALL')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [busyId, setBusyId]       = useState('')
  const [qrResult, setQrResult]   = useState(null)
  const [copied, setCopied]       = useState(false)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false

    getMyBookings()
      .then((list) => {
        if (cancelled) return
        setBookings(list)
        setLoadedAt(Date.now())
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Unable to load bookings.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      isMountedRef.current = false
    }
  }, [])

  const handleRefresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await getMyBookings()
      if (!isMountedRef.current) return
      setBookings(list)
      setLoadedAt(Date.now())
    } catch (err) {
      if (isMountedRef.current) setError(err.message ?? 'Unable to refresh bookings.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  const handleCancel = async (id) => {
    setBusyId(id)
    setError('')
    try {
      await cancelBooking(id)
      const list = await getMyBookings()
      if (!isMountedRef.current) return
      setBookings(list)
      setLoadedAt(Date.now())
      if (qrResult?.bookingId === id) setQrResult(null)
    } catch (err) {
      if (isMountedRef.current) setError(err.message ?? 'Unable to cancel booking.')
    } finally {
      if (isMountedRef.current) setBusyId('')
    }
  }

  const handleGenerateQr = async (id) => {
    setBusyId(id)
    setError('')
    setCopied(false)
    try {
      const result = await generateBookingQr(id)
      if (isMountedRef.current) setQrResult(result)
    } catch (err) {
      if (isMountedRef.current) setError(err.message ?? 'Unable to generate entry QR.')
    } finally {
      if (isMountedRef.current) setBusyId('')
    }
  }

  const handleCopyToken = async () => {
    if (!qrResult?.qrToken) return
    try {
      await navigator.clipboard.writeText(qrResult.qrToken)
      setCopied(true)
    } catch {
      // Ignore clipboard failures cleanly
    }
  }

  const filteredBookings = useMemo(() => {
    if (filter === 'ALL') return bookings
    return bookings.filter((b) => b.status === filter)
  }, [bookings, filter])

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
            My Bookings
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review your reservations, generate entry/exit passes, or cancel upcoming bookings.
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

      {error && (
        <Card className="border-red-200 bg-red-50/70">
          <div className="flex items-start gap-2.5 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {/* Active QR Pass Output */}
      {qrResult && (
        <Card className="border-teal-200 bg-teal-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-900">
                Entry / Exit QR Token Generated
              </p>
              <p className="mt-1 text-xs font-mono text-text-secondary break-all">
                {qrResult.qrToken}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                leftIcon={copied ? <Check /> : <Copy />}
                onClick={handleCopyToken}
              >
                {copied ? 'Copied' : 'Copy token'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQrResult(null)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={cn(
              'h-8 px-3 rounded-md text-xs font-medium border transition-base cursor-pointer',
              filter === key
                ? 'bg-navy-800 text-white border-navy-800'
                : 'bg-white text-text-secondary border-border hover:bg-surface-muted hover:text-text-primary',
            )}
          >
            {key === 'ALL' ? 'All' : key.charAt(0) + key.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <Card noPadding>
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-2">
            <Spinner size="md" label="Loading bookings…" />
            <p className="text-xs text-text-tertiary">Loading bookings…</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No bookings found"
            description={
              filter === 'ALL'
                ? 'You have not made any parking reservations yet.'
                : `You have no ${filter.toLowerCase()} bookings.`
            }
            action={
              filter === 'ALL' ? (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<CalendarPlus />}
                  onClick={() => navigate('/dashboard/book')}
                >
                  Book Parking
                </Button>
              ) : null
            }
            className="py-12"
          />
        ) : (
          <div className="divide-y divide-border">
            {filteredBookings.map((booking) => {
              const badge = getBookingStatusMeta(booking)
              const canCancel =
                booking.status === 'CONFIRMED' &&
                new Date(booking.startTime).getTime() > loadedAt
              const canGenerateQr =
                booking.status === 'CONFIRMED' && !booking.entryAt && !booking.exitAt
              const isBusy = busyId === booking._id

              return (
                <div
                  key={booking._id}
                  className="px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold font-display text-navy-900">
                        Slot {booking.parkingSlot?.slotNumber ?? '—'}
                      </span>
                      <Badge label={badge.label} variant={badge.variant} />
                      <span className="text-xs text-text-tertiary">
                        {booking.vehicle?.vehicleNumber ?? '—'} (
                        {formatVehicleType(booking.vehicle?.vehicleType)})
                      </span>
                    </div>

                    <p className="text-xs text-text-secondary">
                      {formatDateTime(booking.startTime)} → {formatDateTime(booking.endTime)} ·{' '}
                      {booking.durationHours}h ·{' '}
                      <span className="font-semibold text-text-primary">
                        {formatCurrency(booking.totalPrice)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {canGenerateQr && (
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<QrCode />}
                        loading={isBusy}
                        disabled={Boolean(busyId)}
                        onClick={() => handleGenerateQr(booking._id)}
                      >
                        Entry QR
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<XCircle />}
                        loading={isBusy}
                        disabled={Boolean(busyId)}
                        onClick={() => handleCancel(booking._id)}
                        className="text-text-secondary hover:text-error hover:bg-red-50"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
