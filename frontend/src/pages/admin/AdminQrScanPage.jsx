import { useCallback, useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import {
  QrCode,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Camera,
  CameraOff,
  RefreshCw,
} from 'lucide-react'
import { releaseBookingEarly, scanBookingQr } from '@/services/booking.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { cn, formatCurrency, formatDateTime } from '@/utils/format'
import { getBookingGateSessions, getBookingStatusMeta } from '@/utils/parking'

const QR_TOKEN_REGEX = /^[a-f0-9]{64}$/

function getFriendlyCameraError(err) {
  const name = err?.name ?? ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Allow camera access in your browser settings and click Retry Camera, or enter the token manually.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera device was found on this device. Connect a camera or enter the QR token manually below.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is currently in use by another application. Close the other app and click Retry Camera.'
  }
  if (name === 'OverconstrainedError') {
    return 'Unable to start the preferred camera. Click Retry Camera or use manual token entry.'
  }
  return err?.message ?? 'Unable to access the camera for QR scanning.'
}

function stopVideoTracks(videoEl) {
  const stream = videoEl?.srcObject
  if (stream && typeof stream.getTracks === 'function') {
    for (const track of stream.getTracks()) {
      track.stop()
    }
  }
  if (videoEl) {
    videoEl.srcObject = null
  }
}

/**
 * AdminQrScanPage — verify customer QR tokens at gate ENTRY or EXIT
 * via live camera scanning (@zxing/browser) or manual/hardware-scanner fallback.
 * Integrates POST /api/bookings/scan matching ScanBookingQrDto.
 */
export function AdminQrScanPage() {
  const [action, setAction]             = useState('ENTRY')
  const [qrToken, setQrToken]           = useState('')
  const [fieldError, setFieldError]     = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [serverError, setServerError]   = useState('')
  const [scanResult, setScanResult]     = useState(null)
  const [confirmingRelease, setConfirmingRelease] = useState(false)
  const [releasing, setReleasing]       = useState(false)

  const [cameraActive, setCameraActive]     = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError]       = useState('')
  const [cameraSession, setCameraSession]   = useState(0)

  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const actionRef = useRef(action)
  const isMountedRef = useRef(true)
  const inFlightRef = useRef(false)
  const lastProcessedRef = useRef({ token: '', action: '' })
  const lastInvalidRawRef = useRef('')

  useEffect(() => {
    actionRef.current = action
  }, [action])

  const releaseCameraResources = useCallback(() => {
    if (controlsRef.current) {
      try {
        controlsRef.current.stop()
      } catch {
        // Ignore stop errors if already released
      }
      controlsRef.current = null
    }
    stopVideoTracks(videoRef.current)
  }, [])

  const closeCamera = useCallback(() => {
    releaseCameraResources()
    setCameraStarting(false)
    setCameraActive(false)
  }, [releaseCameraResources])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      releaseCameraResources()
    }
  }, [releaseCameraResources])

  const submitScan = useCallback(
    async (rawToken, scanAction, { fromCamera = false } = {}) => {
      if (inFlightRef.current) return

      const normalized = rawToken.trim().toLowerCase()
      if (!normalized) {
        setFieldError('QR token is required.')
        return
      }
      if (!QR_TOKEN_REGEX.test(normalized)) {
        setFieldError('QR token must be a valid 64-character hexadecimal token.')
        return
      }

      inFlightRef.current = true
      setSubmitting(true)
      setFieldError('')
      setServerError('')
      setScanResult(null)
      setConfirmingRelease(false)

      try {
        const result = await scanBookingQr({
          qrToken: normalized,
          action: scanAction,
        })
        if (!isMountedRef.current) return

        setScanResult({
          message: result.message,
          booking: result.booking,
          action: scanAction,
          isEarlyExit: result.isEarlyExit,
          retentionDecision: result.isEarlyExit ? 'PENDING' : null,
        })
        setQrToken('')

        if (fromCamera) {
          closeCamera()
        }
      } catch (err) {
        if (!isMountedRef.current) return
        setServerError(err.message ?? 'Unable to verify QR token.')
      } finally {
        inFlightRef.current = false
        if (isMountedRef.current) setSubmitting(false)
      }
    },
    [closeCamera],
  )

  // Live @zxing/browser camera lifecycle
  useEffect(() => {
    if (!cameraActive || !videoRef.current) return

    let cancelled = false
    const videoEl = videoRef.current
    const reader = new BrowserQRCodeReader()

    reader
      .decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: 'environment' },
          },
        },
        videoEl,
        (result) => {
          if (cancelled || !isMountedRef.current || !result) return

          const raw = result.getText()?.trim().toLowerCase() ?? ''
          if (!raw) return

          if (!QR_TOKEN_REGEX.test(raw)) {
            if (lastInvalidRawRef.current !== raw) {
              lastInvalidRawRef.current = raw
              setFieldError(
                'Scanned QR code is not a valid 64-character hexadecimal ParkEase booking token.',
              )
            }
            return
          }

          lastInvalidRawRef.current = ''
          const currentAction = actionRef.current
          const last = lastProcessedRef.current

          // Prevent duplicate API requests while the same QR stays in front of the camera
          const isSameActiveScan =
            last.token === raw && last.action === currentAction

          if (inFlightRef.current || isSameActiveScan) {
            return
          }

          lastProcessedRef.current = {
            token: raw,
            action: currentAction,
          }
          setQrToken(raw)
          submitScan(raw, currentAction, { fromCamera: true })
        },
      )
      .then((controls) => {
        if (cancelled) {
          try {
            controls.stop()
          } catch {
            // Ignore
          }
          stopVideoTracks(videoEl)
          return
        }
        controlsRef.current = controls
        if (isMountedRef.current) {
          setCameraStarting(false)
        }
      })
      .catch((err) => {
        if (cancelled || !isMountedRef.current) return
        releaseCameraResources()
        setCameraError(getFriendlyCameraError(err))
        setCameraStarting(false)
        setCameraActive(false)
      })

    return () => {
      cancelled = true
      releaseCameraResources()
    }
  }, [cameraActive, cameraSession, releaseCameraResources, submitScan])

  const handleOpenCamera = () => {
    setCameraError('')
    setFieldError('')
    setServerError('')
    lastProcessedRef.current = { token: '', action: '' }
    lastInvalidRawRef.current = ''

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setCameraError(
        'Camera access requires HTTPS in deployment (or http://localhost in local development). Use manual token entry below.',
      )
      return
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Camera access is unavailable in this browser. Use manual token entry below.',
      )
      return
    }

    setCameraStarting(true)
    setCameraActive(true)
    setCameraSession((n) => n + 1)
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    submitScan(qrToken, action, { fromCamera: false })
  }

  const handleKeepReservation = () => {
    setConfirmingRelease(false)
    setScanResult((prev) =>
      prev ? { ...prev, retentionDecision: 'RETAINED' } : null,
    )
  }

  const handleConfirmRelease = async () => {
    if (!scanResult?.booking?._id) return
    setReleasing(true)
    setServerError('')

    try {
      const updatedBooking = await releaseBookingEarly(scanResult.booking._id)
      if (!isMountedRef.current) return

      setConfirmingRelease(false)
      setScanResult((prev) =>
        prev
          ? {
              ...prev,
              booking: updatedBooking,
              isEarlyExit: false,
              retentionDecision: 'RELEASED',
              message:
                'Remaining reservation released. Slot is now available for other customers.',
            }
          : null,
      )
    } catch (err) {
      if (!isMountedRef.current) return
      setServerError(err.message ?? 'Unable to release remaining reservation.')
    } finally {
      if (isMountedRef.current) setReleasing(false)
    }
  }

  return (
    <PageContainer maxWidth="lg" className="flex flex-col gap-6">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
          QR Scanner
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Verify customer booking passes at entry and exit gates using your camera or manual token entry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Scanner / Input Card */}
        <div className="lg:col-span-2">
          <Card noPadding>
            <Card.Header>
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center size-8 rounded-md bg-teal-50 text-teal-600 border border-teal-200">
                  <QrCode size={16} strokeWidth={1.75} />
                </span>
                <div>
                  <h2 className="text-base font-semibold font-display text-text-primary">
                    Scan Booking Pass
                  </h2>
                  <p className="text-xs text-text-tertiary">
                    Select gate action, open camera to scan, or enter the 64-character token
                  </p>
                </div>
              </div>
            </Card.Header>

            <form onSubmit={handleFormSubmit} noValidate>
              <Card.Body className="flex flex-col gap-5">
                {serverError && (
                  <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}

                {cameraError && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle size={15} className="mt-0.5 shrink-0" />
                      <span>{cameraError}</span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<RefreshCw />}
                      onClick={handleOpenCamera}
                      className="shrink-0 self-start sm:self-auto"
                    >
                      Retry Camera
                    </Button>
                  </div>
                )}

                {/* Action Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text-primary">
                    Gate action
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAction('ENTRY')}
                      disabled={submitting}
                      className={cn(
                        'h-11 px-4 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-base cursor-pointer',
                        action === 'ENTRY'
                          ? 'bg-navy-800 text-white border-navy-800'
                          : 'bg-white text-text-secondary border-border hover:bg-surface-muted hover:text-text-primary',
                      )}
                    >
                      <LogIn size={16} />
                      <span>Entry Scan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAction('EXIT')}
                      disabled={submitting}
                      className={cn(
                        'h-11 px-4 rounded-md border text-sm font-medium flex items-center justify-center gap-2 transition-base cursor-pointer',
                        action === 'EXIT'
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-text-secondary border-border hover:bg-surface-muted hover:text-text-primary',
                      )}
                    >
                      <LogOut size={16} />
                      <span>Exit Scan</span>
                    </button>
                  </div>
                </div>

                {/* Live camera preview */}
                {cameraActive && (
                  <div className="relative rounded-md border border-border overflow-hidden bg-navy-950">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full max-h-72 object-cover"
                    />
                    {cameraStarting && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy-950/75 text-white">
                        <Spinner size="md" label="Starting camera…" />
                        <p className="text-xs text-navy-100">Requesting camera access…</p>
                      </div>
                    )}
                    {!cameraStarting && (
                      <div className="px-3 py-2 bg-navy-900/90 text-xs text-navy-100 flex items-center justify-between">
                        <span>Point the camera at the customer&apos;s QR code</span>
                        <span className="text-teal-300 font-medium">
                          {action === 'ENTRY' ? 'Mode: Entry' : 'Mode: Exit'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* QR Token Fallback Input */}
                <Input
                  label="Booking QR token (manual fallback)"
                  id="qr-token-input"
                  placeholder="Paste or scan 64-character hex token…"
                  value={qrToken}
                  onChange={(e) => {
                    setQrToken(e.target.value)
                    if (fieldError) setFieldError('')
                    if (serverError) setServerError('')
                  }}
                  leftAddon={<QrCode />}
                  hint="Customer generates this QR pass from My Bookings before arrival."
                  error={fieldError}
                  disabled={submitting}
                />
              </Card.Body>

              <Card.Footer className="justify-between">
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    leftIcon={cameraActive ? <CameraOff /> : <Camera />}
                    onClick={cameraActive ? closeCamera : handleOpenCamera}
                    disabled={submitting}
                  >
                    {cameraActive ? 'Close Camera' : 'Open Camera'}
                  </Button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting}
                >
                  {action === 'ENTRY' ? 'Record Entry' : 'Record Exit'}
                </Button>
              </Card.Footer>
            </form>
          </Card>
        </div>

        {/* Scan Result Panel */}
        <div>
          <Card noPadding>
            <Card.Header>
              <div>
                <h2 className="text-base font-semibold font-display text-text-primary">
                  Verification Result
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Latest processed gate scan
                </p>
              </div>
            </Card.Header>

            {!scanResult ? (
              <Card.Body className="py-10 text-center">
                <p className="text-sm font-medium text-text-primary">
                  Awaiting QR scan
                </p>
                <p className="mt-1 text-xs text-text-tertiary">
                  Open the camera or submit a token to record gate entry or exit.
                </p>
              </Card.Body>
            ) : (
              <div className="divide-y divide-border text-sm">
                <div className="px-5 py-4 bg-teal-50/60 flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-teal-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-navy-900">
                      {scanResult.action === 'ENTRY' ? 'Entry Recorded' : 'Exit Recorded'}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {scanResult.message}
                    </p>
                  </div>
                </div>

                {scanResult.booking && (
                  <>
                    <div className="px-5 py-3.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-text-tertiary">Status</span>
                      <Badge {...getBookingStatusMeta(scanResult.booking)} />
                    </div>
                    <div className="px-5 py-3.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-text-tertiary">Slot & Vehicle</span>
                      <span className="text-xs font-medium text-text-primary text-right">
                        {scanResult.booking.parkingSlot?.slotNumber ?? '—'} ·{' '}
                        {scanResult.booking.vehicle?.vehicleNumber ?? '—'}
                      </span>
                    </div>
                    <div className="px-5 py-3.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-text-tertiary">Customer</span>
                      <span className="text-xs text-text-primary text-right">
                        {scanResult.booking.customer?.name ?? '—'}
                      </span>
                    </div>
                    <div className="px-5 py-3.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-text-tertiary">Scheduled Window</span>
                      <span className="text-xs text-text-primary text-right">
                        {formatDateTime(scanResult.booking.startTime)} →{' '}
                        {formatDateTime(scanResult.booking.endTime)}
                      </span>
                    </div>
                    <div className="px-5 py-3.5 flex items-center justify-between gap-2">
                      <span className="text-xs text-text-tertiary">Amount</span>
                      <span className="font-semibold text-navy-900">
                        {formatCurrency(scanResult.booking.totalPrice)}
                      </span>
                    </div>

                    {/* Gate Activity History */}
                    {getBookingGateSessions(scanResult.booking).length > 0 && (
                      <div className="px-5 py-3.5">
                        <p className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider mb-1.5">
                          Gate Activity History
                        </p>
                        <div className="flex flex-col gap-1 text-xs text-text-secondary">
                          {getBookingGateSessions(scanResult.booking).map((session, idx) => (
                            <div key={`${scanResult.booking._id}-scan-session-${idx}`}>
                              <span className="font-medium text-navy-800">
                                Cycle {idx + 1}:
                              </span>{' '}
                              In {formatDateTime(session.entryAt)} ·{' '}
                              {session.exitAt
                                ? `Out ${formatDateTime(session.exitAt)}`
                                : 'Active'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Early Exit Customer Decision */}
                    {scanResult.action === 'EXIT' &&
                      scanResult.isEarlyExit &&
                      scanResult.booking.status === 'CONFIRMED' && (
                        <div className="px-5 py-4 bg-amber-50/70 flex flex-col gap-3">
                          <div>
                            <p className="text-xs font-semibold text-navy-900">
                              Early Exit — Customer Decision
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">
                              Scheduled reservation ends at{' '}
                              {formatDateTime(scanResult.booking.endTime)}. Choose whether to
                              keep the slot reserved for re-entry or release it now.
                            </p>
                          </div>

                          {scanResult.retentionDecision === 'RETAINED' ? (
                            <div className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
                              Reservation retained. The customer may return and re-enter using
                              their booking QR until {formatDateTime(scanResult.booking.endTime)}.
                            </div>
                          ) : confirmingRelease ? (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 flex flex-col gap-2.5">
                              <p className="text-xs text-red-800">
                                Confirm release: Slot{' '}
                                <strong>{scanResult.booking.parkingSlot?.slotNumber ?? '—'}</strong>{' '}
                                will become available immediately and the booking QR will be invalidated.
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="danger"
                                  size="sm"
                                  loading={releasing}
                                  onClick={handleConfirmRelease}
                                >
                                  Confirm Release Slot
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  disabled={releasing}
                                  onClick={() => setConfirmingRelease(false)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleKeepReservation}
                                disabled={releasing}
                                className="w-full"
                              >
                                Keep Reservation Active
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirmingRelease(true)}
                                disabled={releasing}
                                className="w-full"
                              >
                                Release Remaining Reservation
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
