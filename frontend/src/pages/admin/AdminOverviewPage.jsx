import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MapPin,
  CheckCircle2,
  Wrench,
  Car,
  CalendarCheck,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getAdminDashboardStats } from '@/services/admin.service'
import { PageContainer } from '@/components/PageContainer'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { EmptyState } from '@/components/EmptyState'

function MetricCard({ label, value, detail, icon: Icon, iconTone = 'navy' }) {
  const toneClasses = {
    navy: 'bg-navy-50 text-navy-700 border-navy-200',
    teal: 'bg-teal-50 text-teal-600 border-teal-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  }

  return (
    <Card className="flex flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            {label}
          </p>
          <p className="mt-1.5 text-2xl font-bold font-display text-navy-900">
            {value}
          </p>
        </div>
        <span
          className={`flex items-center justify-center size-9 rounded-md border shrink-0 ${toneClasses[iconTone] ?? toneClasses.navy}`}
        >
          <Icon size={17} strokeWidth={1.75} />
        </span>
      </div>
      {detail && (
        <p className="text-xs text-text-tertiary pt-2.5 border-t border-border">
          {detail}
        </p>
      )}
    </Card>
  )
}

/**
 * AdminOverviewPage — real facility statistics from GET /api/admin/dashboard.
 */
export function AdminOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false

    getAdminDashboardStats()
      .then((data) => {
        if (cancelled) return
        setStats(data ?? null)
        setError('')
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? 'Unable to load dashboard statistics.')
        }
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
      const data = await getAdminDashboardStats()
      if (!isMountedRef.current) return
      setStats(data ?? null)
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err.message ?? 'Unable to refresh dashboard statistics.')
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  const firstName = user?.name?.trim().split(/\s+/)[0] || 'Admin'

  return (
    <PageContainer className="flex flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy-900 tracking-tight">
            Facility Overview
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Welcome back, {firstName}. Live slot inventory, bookings, and occupancy across ParkEase.
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
            leftIcon={<MapPin />}
            onClick={() => navigate('/admin/slots')}
          >
            Manage Slots
          </Button>
        </div>
      </div>

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

      {/* ── Loading / Empty / Stats ─────────────────────────────────── */}
      {loading ? (
        <Card className="py-14 flex flex-col items-center gap-3">
          <Spinner size="lg" label="Loading admin statistics…" />
          <p className="text-sm text-text-tertiary">Loading facility statistics…</p>
        </Card>
      ) : !stats ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="No dashboard statistics available"
            description="Facility statistics could not be retrieved right now."
            action={
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RefreshCw />}
                onClick={handleRefresh}
              >
                Retry
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Top KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Slots"
              value={stats.slots.total}
              detail={`${stats.slots.fourWheeler} four-wheeler · ${stats.slots.twoWheeler} two-wheeler`}
              icon={MapPin}
              iconTone="navy"
            />
            <MetricCard
              label="Active Slots"
              value={stats.slots.active}
              detail={`${stats.slots.maintenance} in maintenance`}
              icon={CheckCircle2}
              iconTone="teal"
            />
            <MetricCard
              label="Currently Parked"
              value={stats.occupancy.currentlyParked}
              detail="Checked-in active sessions"
              icon={Car}
              iconTone="teal"
            />
            <MetricCard
              label="Bookings Today"
              value={stats.bookings.createdToday}
              detail={`${stats.bookings.confirmed} confirmed overall`}
              icon={CalendarCheck}
              iconTone="navy"
            />
          </div>

          {/* Breakdown Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Slot Inventory Breakdown */}
            <Card noPadding>
              <Card.Header>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center size-8 rounded-md bg-teal-50 text-teal-600 border border-teal-200">
                    <Wrench size={16} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold font-display text-text-primary">
                      Parking Slot Breakdown
                    </h2>
                    <p className="text-xs text-text-tertiary">
                      Capacity by status and vehicle category
                    </p>
                  </div>
                </div>
                <Link
                  to="/admin/slots"
                  className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700 transition-base"
                >
                  <span>Manage</span>
                  <ArrowRight size={13} />
                </Link>
              </Card.Header>

              <div className="divide-y divide-border text-sm">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Active slots</span>
                  <Badge label={String(stats.slots.active)} variant="teal" />
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Maintenance slots</span>
                  <Badge label={String(stats.slots.maintenance)} variant="warning" />
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Four-wheeler slots</span>
                  <span className="font-semibold text-navy-900">{stats.slots.fourWheeler}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Two-wheeler slots</span>
                  <span className="font-semibold text-navy-900">{stats.slots.twoWheeler}</span>
                </div>
              </div>
            </Card>

            {/* Booking Status Breakdown */}
            <Card noPadding>
              <Card.Header>
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center size-8 rounded-md bg-navy-50 text-navy-700 border border-navy-200">
                    <CalendarCheck size={16} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h2 className="text-sm font-semibold font-display text-text-primary">
                      Booking Summary
                    </h2>
                    <p className="text-xs text-text-tertiary">
                      Facility reservations by lifecycle state
                    </p>
                  </div>
                </div>
              </Card.Header>

              <div className="divide-y divide-border text-sm">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Confirmed bookings</span>
                  <Badge label={String(stats.bookings.confirmed)} variant="navy" />
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Completed bookings</span>
                  <Badge label={String(stats.bookings.completed)} variant="success" />
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Cancelled bookings</span>
                  <Badge label={String(stats.bookings.cancelled)} variant="neutral" />
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <span className="text-text-secondary">Created today (UTC)</span>
                  <span className="font-semibold text-navy-900">{stats.bookings.createdToday}</span>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </PageContainer>
  )
}
