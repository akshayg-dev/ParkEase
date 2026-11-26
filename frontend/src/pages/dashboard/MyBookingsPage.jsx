import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  CalendarCheck,
  CalendarPlus,
  QrCode,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  X,
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
import {
  formatVehicleType,
  getBookingGateSessions,
  getBookingStatusMeta,
  isBookingCheckedIn,
  isBookingRetainedAfterExit,
} from '@/utils/parking'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'CONFIRMED', label: 'Confirmed' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'EARLY_RELEASED', label: 'Early Released' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

function getQrModeForBooking(booking, loadedAt) {
  if (isBookingCheckedIn(booking)) return 'EXIT'
  if (isBookingRetainedAfterExit(booking, loadedAt)) return 'REENTRY'
  if (booking.status === 'CONFIRMED' && !booking.entryAt && !booking.exitAt) {
    return 'ENTRY'
  }
  return null
}

function getQrButtonLabel(mode) {
  if (mode === 'EXIT') return 'Exit QR'
  if (mode === 'REENTRY') return 'Re-entry QR'
  return 'Entry QR'
}

export function MyBookingsPage() {
  const navigate = useNavigate()

  const [bookings, setBookings]   = useState([])
  const [loadedAt, setLoadedAt]   = useState(0)
  const [filter, setFilter]       = useState('ALL')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [busyId, setBusyId]       = useState('')
  const [qrPass, setQrPass]       = useState(null)
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
      if (qrPass?.booking?._id === id) setQrPass(null)
    } catch (err) {
      if (isMountedRef.current) setError(err.message ?? 'Unable to cancel booking.')
    } finally {
      if (isMountedRef.current) setBusyId('')
    }
  }

  const handleGenerateQr = async (booking, mode) => {
    setBusyId(booking._id)
    setError('')
    setCopied(false)
    try {
      const result = await generateBookingQr(booking._id)
      if (isMountedRef.current) {
        setQrPass({
          qrToken: result.qrToken,
          booking,
          mode,
        })
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message ?? 'Unable to generate booking QR.')
      }
    } finally {
      if (isMountedRef.current) setBusyId('')
    }
  }

  const handleCopyToken = async () => {
    if (!qrPass?.qrToken) return
    try {
      await navigator.clipboard.writeText(qrPass.qrToken)
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
            Review your reservations, generate entry/exit/re-entry passes, and view gate activity.
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

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(({ key, label }) => (
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
            {label}
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
                : 'No bookings match this filter.'
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
              const badge = getBookingStatusMeta(booking, loadedAt)
              const sessions = getBookingGateSessions(booking)
              const canCancel =
                booking.status === 'CONFIRMED' &&
                !booking.entryAt &&
                sessions.length === 0 &&
                new Date(booking.startTime).getTime() > loadedAt
              const qrMode = getQrModeForBooking(booking, loadedAt)
              const isBusy = busyId === booking._id

              return (
                <div
                  key={booking._id}
                  className="px-5 py-4 flex flex-col gap-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

                      {booking.status === 'EARLY_RELEASED' && booking.releasedAt && (
                        <p className="text-[11px] text-text-tertiary">
                          Remaining slot time released on {formatDateTime(booking.releasedAt)}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {qrMode && (
                        <Button
                          variant={qrMode === 'ENTRY' ? 'secondary' : 'primary'}
                          size="sm"
                          leftIcon={<QrCode />}
                          loading={isBusy}
                          disabled={Boolean(busyId)}
                          onClick={() => handleGenerateQr(booking, qrMode)}
                        >
                          {getQrButtonLabel(qrMode)}
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

                  {/* Gate Activity History */}
                  {sessions.length > 0 && (
                    <div className="rounded-md border border-border bg-surface-subtle px-3.5 py-2.5">
                      <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                        Gate Activity
                      </p>
                      <div className="flex flex-col gap-1">
                        {sessions.map((session, idx) => (
                          <div
                            key={`${booking._id}-session-${idx}`}
                            className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary"
                          >
                            <span className="font-medium text-navy-800">
                              Cycle {idx + 1}:
                            </span>
                            <span>In {formatDateTime(session.entryAt)}</span>
                            <span>
                              ·{' '}
                              {session.exitAt
                                ? `Out ${formatDateTime(session.exitAt)}`
                                : 'Currently parked'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Scannable Entry / Exit / Re-entry QR Pass Modal ──────────── */}
      {qrPass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="qr-pass-modal-title"
        >
          <Card noPadding className="w-full max-w-md shadow-modal overflow-hidden">
            <Card.Header>
              <div>
                <h2
                  id="qr-pass-modal-title"
                  className="text-base font-semibold font-display text-navy-900"
                >
                  {qrPass.mode === 'EXIT'
                    ? 'Exit QR Pass'
                    : qrPass.mode === 'REENTRY'
                      ? 'Re-entry QR Pass'
                      : 'Entry QR Pass'}
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {qrPass.mode === 'EXIT'
                    ? 'Present this QR code to the exit gate scanner'
                    : qrPass.mode === 'REENTRY'
                      ? 'Your reservation is retained — scan at the entry gate to re-enter'
                      : 'Present this QR code to the entry gate scanner on arrival'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrPass(null)}
                aria-label="Close QR pass"
                className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-muted transition-base cursor-pointer"
              >
                <X size={18} />
              </button>
            </Card.Header>

            <Card.Body className="flex flex-col items-center text-center gap-4 py-6">
              <div className="p-4 rounded-lg bg-white border border-border shadow-card">
                <QRCodeSVG
                  value={qrPass.qrToken}
                  size={200}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#0d1e30"
                />
              </div>

              <div className="w-full rounded-md border border-border bg-surface-subtle px-4 py-3 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold font-display text-navy-900">
                    Slot {qrPass.booking.parkingSlot?.slotNumber ?? '—'}
                  </span>
                  <span className="text-xs font-medium text-text-secondary">
                    {qrPass.booking.vehicle?.vehicleNumber ?? '—'}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {formatDateTime(qrPass.booking.startTime)} →{' '}
                  {formatDateTime(qrPass.booking.endTime)}
                </p>
              </div>

              <div className="w-full flex flex-col items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={copied ? <Check /> : <Copy />}
                  onClick={handleCopyToken}
                  className="w-full"
                >
                  {copied ? 'Token copied' : 'Copy fallback token'}
                </Button>
                <p className="text-[11px] font-mono text-text-disabled break-all px-2">
                  {qrPass.qrToken}
                </p>
              </div>
            </Card.Body>

            <Card.Footer>
              <Button variant="primary" size="sm" onClick={() => setQrPass(null)}>
                Done
              </Button>
            </Card.Footer>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
