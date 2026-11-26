import { useCallback, useEffect, useRef, useState } from 'react'
import { Car, Plus, Trash2, Star, AlertCircle } from 'lucide-react'
import {
  addVehicle,
  deleteVehicle,
  getVehicles,
  setDefaultVehicle,
} from '@/services/vehicle.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'
import { formatVehicleType } from '@/utils/parking'

const VEHICLE_NUMBER_REGEX =
  /^([A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}|\d{2}BH\d{4}[A-Z]{1,2})$/

function normalizePlate(value) {
  return value.replace(/[\s-]/g, '').toUpperCase()
}

export function MyVehiclesPage() {
  const [vehicles, setVehicles]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [busyId, setBusyId]             = useState('')
  const [vehicleNumber, setNumber]      = useState('')
  const [vehicleType, setType]          = useState('FOUR_WHEELER')
  const [formError, setFormError]       = useState('')
  const [submitting, setSubmitting]     = useState(false)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false

    getVehicles()
      .then((list) => {
        if (!cancelled) setVehicles(list)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? 'Unable to load vehicles.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      isMountedRef.current = false
    }
  }, [])

  const reloadVehicles = useCallback(async () => {
    const list = await getVehicles()
    if (isMountedRef.current) setVehicles(list)
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const normalized = normalizePlate(vehicleNumber)
    if (!normalized) {
      setFormError('Vehicle number is required.')
      return
    }
    if (!VEHICLE_NUMBER_REGEX.test(normalized)) {
      setFormError('Enter a valid registration number (e.g. KA01AB1234).')
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      await addVehicle({ vehicleNumber: normalized, vehicleType })
      await reloadVehicles()
      if (isMountedRef.current) setNumber('')
    } catch (err) {
      if (isMountedRef.current) {
        setFormError(err.message ?? 'Unable to register vehicle.')
      }
    } finally {
      if (isMountedRef.current) setSubmitting(false)
    }
  }

  const handleSetDefault = async (id) => {
    setBusyId(id)
    setError('')
    try {
      await setDefaultVehicle(id)
      await reloadVehicles()
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message ?? 'Unable to update default vehicle.')
      }
    } finally {
      if (isMountedRef.current) setBusyId('')
    }
  }

  const handleDelete = async (id) => {
    setBusyId(id)
    setError('')
    try {
      await deleteVehicle(id)
      await reloadVehicles()
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message ?? 'Unable to delete vehicle.')
      }
    } finally {
      if (isMountedRef.current) setBusyId('')
    }
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
          My Vehicles
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your registered two-wheelers and four-wheelers for parking reservations.
        </p>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50/70">
          <div className="flex items-start gap-2.5 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registered Vehicles List */}
        <div className="lg:col-span-2">
          <Card noPadding>
            <Card.Header>
              <div>
                <h2 className="text-base font-semibold font-display text-text-primary">
                  Registered Vehicles
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {vehicles.length} vehicle{vehicles.length === 1 ? '' : 's'} linked to your account
                </p>
              </div>
            </Card.Header>

            {loading ? (
              <div className="py-12 flex flex-col items-center gap-2">
                <Spinner size="md" label="Loading vehicles…" />
                <p className="text-xs text-text-tertiary">Loading vehicles…</p>
              </div>
            ) : vehicles.length === 0 ? (
              <EmptyState
                icon={Car}
                title="No vehicles registered yet"
                description="Use the form to add your first two-wheeler or four-wheeler."
                className="py-12"
              />
            ) : (
              <div className="divide-y divide-border">
                {vehicles.map((vehicle) => {
                  const isBusy = busyId === vehicle._id
                  return (
                    <div
                      key={vehicle._id}
                      className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex items-center justify-center size-9 rounded-md bg-navy-50 text-navy-700 border border-navy-200 shrink-0">
                          <Car size={16} strokeWidth={1.75} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-navy-900 tracking-wide">
                              {vehicle.vehicleNumber}
                            </span>
                            {vehicle.isDefault && (
                              <Badge label="Default" variant="teal" />
                            )}
                          </div>
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {formatVehicleType(vehicle.vehicleType)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!vehicle.isDefault && (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Star />}
                            loading={isBusy}
                            disabled={Boolean(busyId)}
                            onClick={() => handleSetDefault(vehicle._id)}
                          >
                            Set default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<Trash2 />}
                          loading={isBusy}
                          disabled={Boolean(busyId)}
                          onClick={() => handleDelete(vehicle._id)}
                          className="text-text-tertiary hover:text-error hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Add Vehicle Form */}
        <div>
          <Card noPadding>
            <Card.Header>
              <div>
                <h2 className="text-base font-semibold font-display text-text-primary">
                  Add Vehicle
                </h2>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Register a new plate number
                </p>
              </div>
            </Card.Header>

            <form onSubmit={handleAdd} noValidate>
              <Card.Body className="flex flex-col gap-4">
                <Input
                  label="Registration number"
                  placeholder="KA01AB1234"
                  value={vehicleNumber}
                  onChange={(e) => {
                    setNumber(e.target.value)
                    if (formError) setFormError('')
                  }}
                  error={formError}
                  disabled={submitting}
                />

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vehicle-type" className="text-sm font-medium text-text-primary">
                    Vehicle type
                  </label>
                  <select
                    id="vehicle-type"
                    value={vehicleType}
                    onChange={(e) => setType(e.target.value)}
                    disabled={submitting}
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
                  loading={submitting}
                  className="w-full"
                >
                  Register Vehicle
                </Button>
              </Card.Footer>
            </form>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
