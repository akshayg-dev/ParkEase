import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarPlus,
  Car,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { getVehicles } from '@/services/vehicle.service'
import { getParkingSlots } from '@/services/parkingSlot.service'
import { createBooking } from '@/services/booking.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { formatCurrency, formatDateTime, cn } from '@/utils/format'
import { HOURLY_RATES, formatVehicleType } from '@/utils/parking'

function toLocalDateTimeInput(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getInitialWindow() {
  const start = new Date(Date.now() + 60 * 60 * 1000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return {
    startTime: toLocalDateTimeInput(start),
    endTime: toLocalDateTimeInput(end),
  }
}

export function BookParkingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedSlotId = searchParams.get('slotId') ?? ''

  const [vehicles, setVehicles]             = useState([])
  const [slots, setSlots]                   = useState([])
  const [selectedVehicleId, setVehicleId]   = useState('')
  const [selectedSlotId, setSlotId]         = useState(preselectedSlotId)
  const [windowTimes, setWindowTimes]       = useState(getInitialWindow)
  const [loading, setLoading]               = useState(true)
  const [loadError, setLoadError]           = useState('')
  const [submitting, setSubmitting]         = useState(false)
  const [submitError, setSubmitError]       = useState('')
  const [createdBooking, setCreatedBooking] = useState(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false

    Promise.all([getVehicles(), getParkingSlots({ status: 'ACTIVE' })])
      .then(([vehicleList, slotList]) => {
        if (cancelled) return
        setVehicles(vehicleList)
        setSlots(slotList)

        const preSlot = slotList.find((s) => s._id === preselectedSlotId)
        const compatibleDefault = preSlot
          ? vehicleList.find((v) => v.vehicleType === preSlot.vehicleType && v.isDefault) ??
            vehicleList.find((v) => v.vehicleType === preSlot.vehicleType)
          : null

        const fallbackVehicle =
          compatibleDefault ??
          vehicleList.find((v) => v.isDefault) ??
          vehicleList[0] ??
          null

        if (fallbackVehicle) setVehicleId(fallbackVehicle._id)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message ?? 'Unable to load booking options.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      isMountedRef.current = false
    }
  }, [preselectedSlotId])

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v._id === selectedVehicleId) ?? null,
    [vehicles, selectedVehicleId],
  )

  const compatibleSlots = useMemo(() => {
    if (!selectedVehicle) return []
    return slots.filter((s) => s.vehicleType === selectedVehicle.vehicleType)
  }, [slots, selectedVehicle])

  const activeSlotId = useMemo(() => {
    if (compatibleSlots.some((s) => s._id === selectedSlotId)) return selectedSlotId
    return compatibleSlots[0]?._id ?? ''
  }, [compatibleSlots, selectedSlotId])

  const pricingPreview = useMemo(() => {
    if (!selectedVehicle || !windowTimes.startTime || !windowTimes.endTime) return null
    const start = new Date(windowTimes.startTime)
    const end = new Date(windowTimes.endTime)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null
    }
    const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    const rate = HOURLY_RATES[selectedVehicle.vehicleType] ?? 0
    return {
      durationHours,
      rate,
      totalPrice: durationHours * rate,
    }
  }, [selectedVehicle, windowTimes])

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault()
      setSubmitError('')

      if (!selectedVehicle) {
        setSubmitError('Please select a registered vehicle.')
        return
      }
      if (!activeSlotId) {
        setSubmitError('Please select an available parking slot.')
        return
      }

      const start = new Date(windowTimes.startTime)
      const end = new Date(windowTimes.endTime)
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        setSubmitError('Please choose valid start and end times.')
        return
      }
      if (start <= new Date()) {
        setSubmitError('Booking start time must be in the future.')
        return
      }
      if (end <= start) {
        setSubmitError('End time must be after start time.')
        return
      }

      setSubmitting(true)
      try {
        const booking = await createBooking({
          vehicleId: selectedVehicle._id,
          parkingSlotId: activeSlotId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        })
        if (!isMountedRef.current) return
        setCreatedBooking(booking)
      } catch (err) {
        if (!isMountedRef.current) return
        setSubmitError(err.message ?? 'Unable to create booking.')
      } finally {
        if (isMountedRef.current) setSubmitting(false)
      }
    },
    [selectedVehicle, activeSlotId, windowTimes],
  )

  if (loading) {
    return (
      <PageContainer>
        <Card className="py-14 flex flex-col items-center gap-3">
          <Spinner size="lg" label="Loading booking options…" />
          <p className="text-sm text-text-tertiary">Loading vehicles and active parking slots…</p>
        </Card>
      </PageContainer>
    )
  }

  if (loadError) {
    return (
      <PageContainer>
        <Card className="border-red-200 bg-red-50/70">
          <div className="flex items-start gap-2.5 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        </Card>
      </PageContainer>
    )
  }

  if (createdBooking) {
    return (
      <PageContainer maxWidth="md">
        <Card className="text-center flex flex-col items-center gap-4 py-8">
          <span className="flex items-center justify-center size-12 rounded-full bg-teal-50 border border-teal-200 text-teal-600">
            <CheckCircle2 size={24} />
          </span>
          <div>
            <h1 className="text-xl font-bold font-display text-navy-900">
              Booking confirmed
            </h1>
            <p className="mt-1.5 text-sm text-text-secondary">
              Your parking reservation from {formatDateTime(createdBooking.startTime)} to{' '}
              {formatDateTime(createdBooking.endTime)} is confirmed.
            </p>
            <p className="mt-2 text-sm font-semibold text-navy-900">
              Total: {formatCurrency(createdBooking.totalPrice)} ({createdBooking.durationHours}h)
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/dashboard/bookings')}
            >
              View My Bookings
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setCreatedBooking(null)}
            >
              Book Another Slot
            </Button>
          </div>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
          Book Parking
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Choose a registered vehicle, parking window, and matching active slot.
        </p>
      </div>

      {vehicles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Car}
            title="Register a vehicle first"
            description="You need at least one registered vehicle before you can book a parking slot."
            action={
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus />}
                onClick={() => navigate('/dashboard/vehicles')}
              >
                Add Vehicle
              </Button>
            }
          />
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-5">
            {submitError && (
              <div className="flex items-start gap-2.5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Step 1: Select Vehicle */}
            <Card noPadding>
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Car size={16} className="text-teal-600" />
                  <h2 className="text-sm font-semibold font-display text-text-primary">
                    1. Select Vehicle
                  </h2>
                </div>
              </Card.Header>
              <Card.Body className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vehicles.map((vehicle) => {
                  const selected = vehicle._id === selectedVehicleId
                  return (
                    <button
                      key={vehicle._id}
                      type="button"
                      onClick={() => setVehicleId(vehicle._id)}
                      className={cn(
                        'p-3.5 rounded-md border text-left transition-base cursor-pointer flex items-center justify-between gap-3',
                        selected
                          ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                          : 'border-border bg-white hover:border-border-strong',
                      )}
                    >
                      <div>
                        <p className="text-sm font-semibold text-navy-900">
                          {vehicle.vehicleNumber}
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {formatVehicleType(vehicle.vehicleType)} ·{' '}
                          {formatCurrency(HOURLY_RATES[vehicle.vehicleType] ?? 0)}/hr
                        </p>
                      </div>
                      {vehicle.isDefault && <Badge label="Default" variant="teal" />}
                    </button>
                  )
                })}
              </Card.Body>
            </Card>

            {/* Step 2: Time Window */}
            <Card noPadding>
              <Card.Header>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-teal-600" />
                  <h2 className="text-sm font-semibold font-display text-text-primary">
                    2. Select Parking Window
                  </h2>
                </div>
              </Card.Header>
              <Card.Body className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-start" className="text-sm font-medium text-text-primary">
                    Start time
                  </label>
                  <input
                    id="booking-start"
                    type="datetime-local"
                    value={windowTimes.startTime}
                    onChange={(e) =>
                      setWindowTimes((prev) => ({ ...prev, startTime: e.target.value }))
                    }
                    className="h-9 rounded-md border border-border bg-white px-3 text-sm text-text-primary focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="booking-end" className="text-sm font-medium text-text-primary">
                    End time
                  </label>
                  <input
                    id="booking-end"
                    type="datetime-local"
                    value={windowTimes.endTime}
                    onChange={(e) =>
                      setWindowTimes((prev) => ({ ...prev, endTime: e.target.value }))
                    }
                    className="h-9 rounded-md border border-border bg-white px-3 text-sm text-text-primary focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    required
                  />
                </div>
              </Card.Body>
            </Card>

            {/* Step 3: Select Slot */}
            <Card noPadding>
              <Card.Header>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-teal-600" />
                  <h2 className="text-sm font-semibold font-display text-text-primary">
                    3. Select Active Slot ({formatVehicleType(selectedVehicle?.vehicleType)})
                  </h2>
                </div>
                <Badge label={`${compatibleSlots.length} available`} variant="neutral" />
              </Card.Header>
              <Card.Body>
                {compatibleSlots.length === 0 ? (
                  <EmptyState
                    icon={MapPin}
                    title="No active slots for this vehicle type"
                    description="Try selecting a different vehicle or check back shortly."
                    className="py-5"
                  />
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {compatibleSlots.map((slot) => {
                      const selected = slot._id === activeSlotId
                      return (
                        <button
                          key={slot._id}
                          type="button"
                          onClick={() => setSlotId(slot._id)}
                          className={cn(
                            'p-3 rounded-md border text-left transition-base cursor-pointer',
                            selected
                              ? 'border-teal-500 bg-teal-50/50 ring-1 ring-teal-500'
                              : 'border-border bg-surface-subtle hover:border-border-strong',
                          )}
                        >
                          <p className="text-sm font-semibold font-display text-navy-900">
                            {slot.slotNumber}
                          </p>
                          <p className="text-[11px] text-text-tertiary mt-0.5">
                            Active
                          </p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div>
            <Card noPadding className="sticky top-20">
              <Card.Header>
                <h2 className="text-sm font-semibold font-display text-text-primary">
                  Booking Summary
                </h2>
              </Card.Header>
              <Card.Body className="flex flex-col gap-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-text-tertiary">Vehicle</span>
                  <span className="font-medium text-text-primary">
                    {selectedVehicle?.vehicleNumber ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-text-tertiary">Slot</span>
                  <span className="font-medium text-text-primary">
                    {compatibleSlots.find((s) => s._id === activeSlotId)?.slotNumber ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-text-tertiary">Duration</span>
                  <span className="font-medium text-text-primary">
                    {pricingPreview ? `${pricingPreview.durationHours}h` : '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 pt-3 border-t border-border">
                  <span className="font-medium text-text-primary">Estimated Total</span>
                  <span className="text-base font-bold font-display text-navy-900">
                    {pricingPreview ? formatCurrency(pricingPreview.totalPrice) : '—'}
                  </span>
                </div>
              </Card.Body>
              <Card.Footer>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  disabled={!activeSlotId || !pricingPreview}
                  leftIcon={<CalendarPlus />}
                  className="w-full"
                >
                  Confirm Booking
                </Button>
              </Card.Footer>
            </Card>
          </div>
        </form>
      )}
    </PageContainer>
  )
}
