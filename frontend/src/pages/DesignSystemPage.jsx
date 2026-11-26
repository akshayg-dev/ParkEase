import {
  MapPin,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Plus,
  Eye,
} from 'lucide-react'

import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Card } from '@/components/Card'
import { ParkEaseLogo } from '@/components/ParkEaseLogo'
import { Spinner, PageLoader } from '@/components/Spinner'
import { PageContainer } from '@/components/PageContainer'

/* ------------------------------------------------------------------ */
/*  Local helper: Section header                                        */
/* ------------------------------------------------------------------ */
function Section({ title, description, children }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="pb-4 border-b border-border">
        <h2 className="text-lg font-semibold text-text-primary font-display">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-text-tertiary">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/*  Badge                                                               */
/* ------------------------------------------------------------------ */
function Badge({ label, variant = 'neutral' }) {
  const styles = {
    neutral: 'bg-surface-muted text-text-secondary border-border',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    error:   'bg-red-50 text-red-600 border-red-200',
    info:    'bg-sky-50 text-sky-700 border-sky-200',
    teal:    'bg-teal-50 text-teal-700 border-teal-200',
    navy:    'bg-navy-50 text-navy-800 border-navy-200',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[variant]}`}
    >
      {label}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  Colour swatch row                                                   */
/* ------------------------------------------------------------------ */
function SwatchRow({ label, shades }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
        {label}
      </span>
      <div className="flex gap-1">
        {shades.map(({ bg, name }) => (
          <div key={name} className="flex flex-col items-center gap-1">
            <div
              className="size-8 rounded border border-black/5"
              style={{ background: bg }}
              title={name}
            />
            <span className="text-[10px] text-text-disabled">{name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Stat card — preview of what a real metric card might look like     */
/* ------------------------------------------------------------------ */
function StatCard({ label, value, sublabel, icon: Icon, trend }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
            {label}
          </span>
          <span className="text-2xl font-bold font-display text-text-primary">
            {value}
          </span>
          {sublabel && (
            <span className="text-xs text-text-tertiary">{sublabel}</span>
          )}
        </div>
        <span className="flex items-center justify-center size-9 rounded-md bg-navy-50 text-navy-700">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
          <CheckCircle2 size={13} className="text-success shrink-0" />
          <span className="text-xs text-text-secondary">{trend}</span>
        </div>
      )}
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export function DesignSystemPage() {
  return (
    <PageContainer>
      {/* Page header */}
      <div className="mb-10">
        <div className="mb-3">
          <ParkEaseLogo
            variant="full"
            subtitle="Design System — Phase 1 Foundation"
            size="lg"
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="px-4 py-2.5 rounded-md border border-border bg-white">
            <ParkEaseLogo variant="compact" theme="light" size="md" />
          </div>
          <div className="px-4 py-2.5 rounded-md bg-navy-900">
            <ParkEaseLogo variant="full" theme="dark" size="sm" />
          </div>
          <div className="px-4 py-2.5 rounded-md bg-navy-900">
            <ParkEaseLogo variant="compact" theme="dark" size="md" />
          </div>
        </div>

        <p className="text-sm text-text-secondary max-w-xl text-balance">
          This page demonstrates the design tokens, components, and layout
          patterns that form the foundation of the ParkEase application. It will
          be replaced by the real dashboard in a later phase.
        </p>
      </div>

      <div className="flex flex-col gap-14">

        {/* ── Colour palette ───────────────────────────────────────── */}
        <Section
          title="Colour palette"
          description="Core brand and semantic tokens. Defined as CSS variables via @theme."
        >
          <div className="flex flex-col gap-5">
            <SwatchRow
              label="Navy (Primary)"
              shades={[
                { bg: 'var(--color-navy-50)',  name: '50' },
                { bg: 'var(--color-navy-100)', name: '100' },
                { bg: 'var(--color-navy-200)', name: '200' },
                { bg: 'var(--color-navy-300)', name: '300' },
                { bg: 'var(--color-navy-400)', name: '400' },
                { bg: 'var(--color-navy-500)', name: '500' },
                { bg: 'var(--color-navy-600)', name: '600' },
                { bg: 'var(--color-navy-700)', name: '700' },
                { bg: 'var(--color-navy-800)', name: '800' },
                { bg: 'var(--color-navy-900)', name: '900' },
                { bg: 'var(--color-navy-950)', name: '950' },
              ]}
            />
            <SwatchRow
              label="Teal (Accent)"
              shades={[
                { bg: 'var(--color-teal-50)',  name: '50' },
                { bg: 'var(--color-teal-100)', name: '100' },
                { bg: 'var(--color-teal-200)', name: '200' },
                { bg: 'var(--color-teal-300)', name: '300' },
                { bg: 'var(--color-teal-400)', name: '400' },
                { bg: 'var(--color-teal-500)', name: '500' },
                { bg: 'var(--color-teal-600)', name: '600' },
                { bg: 'var(--color-teal-700)', name: '700' },
                { bg: 'var(--color-teal-800)', name: '800' },
                { bg: 'var(--color-teal-900)', name: '900' },
              ]}
            />
            <SwatchRow
              label="Surfaces & borders"
              shades={[
                { bg: 'var(--color-surface)',        name: 'surface' },
                { bg: 'var(--color-surface-subtle)', name: 'subtle' },
                { bg: 'var(--color-surface-muted)',  name: 'muted' },
                { bg: 'var(--color-border)',         name: 'border' },
                { bg: 'var(--color-border-strong)',  name: 'strong' },
              ]}
            />
            <SwatchRow
              label="Semantic"
              shades={[
                { bg: 'var(--color-success)', name: 'success' },
                { bg: 'var(--color-warning)', name: 'warning' },
                { bg: 'var(--color-error)',   name: 'error' },
                { bg: 'var(--color-info)',    name: 'info' },
              ]}
            />
          </div>
        </Section>

        {/* ── Typography ───────────────────────────────────────────── */}
        <Section
          title="Typography"
          description="Manrope for headings (font-display), Inter for body (font-sans)."
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-disabled">h1 — 36px / Manrope 600</span>
              <h1>Manage your parking facility</h1>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-disabled">h2 — 28px / Manrope 600</span>
              <h2>Occupancy overview</h2>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-disabled">h3 — 22px / Manrope 600</span>
              <h3>Section heading</h3>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-disabled">h4 — 18px / Manrope 600</span>
              <h4>Card title</h4>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-disabled">body — 15px / Inter 400</span>
              <p className="text-text-secondary">
                ParkEase gives facility managers real-time visibility into slot
                utilisation, revenue, and customer activity — all from a single,
                unified dashboard.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-disabled">label / caption — 12px / Inter 500</span>
              <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                Total vehicles today
              </p>
            </div>
          </div>
        </Section>

        {/* ── Badges ───────────────────────────────────────────────── */}
        <Section title="Badges" description="Status labels used throughout the UI.">
          <div className="flex flex-wrap gap-2">
            <Badge label="Neutral"   variant="neutral" />
            <Badge label="Available" variant="success" />
            <Badge label="Occupied"  variant="error" />
            <Badge label="Reserved"  variant="warning" />
            <Badge label="Info"      variant="info" />
            <Badge label="Teal"      variant="teal" />
            <Badge label="Navy"      variant="navy" />
          </div>
        </Section>

        {/* ── Buttons ──────────────────────────────────────────────── */}
        <Section
          title="Buttons"
          description="Consistent variants × three sizes. All include focus-visible rings."
        >
          <div className="flex flex-col gap-6">
            {/* Variants */}
            <div>
              <p className="text-xs text-text-disabled mb-3">Variants (md size)</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary">Primary</Button>
                <Button variant="emerald">Emerald</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="primary" disabled>Disabled</Button>
                <Button variant="primary" loading>Loading</Button>
              </div>
            </div>
            {/* Sizes */}
            <div>
              <p className="text-xs text-text-disabled mb-3">Sizes</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
            {/* With icons */}
            <div>
              <p className="text-xs text-text-disabled mb-3">With icons</p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" leftIcon={<Plus />}>Add slot</Button>
                <Button variant="secondary" rightIcon={<ArrowRight />}>See report</Button>
                <Button variant="ghost" leftIcon={<Eye />}>Preview</Button>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Inputs ───────────────────────────────────────────────── */}
        <Section title="Inputs" description="Text inputs with label, hint, error and icon slots.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
            <Input label="Vehicle number" placeholder="KA 01 AB 1234" />
            <Input
              label="Search slots"
              placeholder="Search…"
              leftAddon={<Search />}
            />
            <Input
              label="Email"
              type="email"
              placeholder="admin@parkease.in"
              hint="Used for account notifications."
            />
            <Input
              label="Invalid field"
              placeholder="Something wrong"
              error="This field is required."
            />
            <Input label="Disabled input" placeholder="Cannot edit" disabled />
          </div>
        </Section>

        {/* ── Cards ────────────────────────────────────────────────── */}
        <Section title="Cards" description="Surface containers with optional sub-components.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Plain card */}
            <Card>
              <h4 className="font-semibold text-text-primary mb-1">Plain card</h4>
              <p className="text-sm text-text-secondary">
                A basic surface with default padding. Good for simple content
                blocks.
              </p>
            </Card>

            {/* Card with header / body / footer */}
            <Card noPadding>
              <Card.Header>
                <div>
                  <h4 className="font-semibold text-text-primary">Structured card</h4>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    With header, body and footer
                  </p>
                </div>
                <Badge label="Active" variant="success" />
              </Card.Header>
              <Card.Body>
                <p className="text-sm text-text-secondary">
                  Card.Header, Card.Body and Card.Footer divide the surface
                  with consistent padding and dividers.
                </p>
              </Card.Body>
              <Card.Footer>
                <Button variant="ghost" size="sm">Cancel</Button>
                <Button size="sm">Confirm</Button>
              </Card.Footer>
            </Card>
          </div>
        </Section>

        {/* ── Stat cards (preview) ─────────────────────────────────── */}
        <Section
          title="Metric cards (preview)"
          description="A glimpse of how data cards will look in the dashboard."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total slots"
              value="240"
              sublabel="Across all zones"
              icon={MapPin}
              trend="Synced 2 min ago"
            />
            <StatCard
              label="Occupied"
              value="184"
              sublabel="76.7% occupancy"
              icon={CheckCircle2}
              trend="12 more than yesterday"
            />
            <StatCard
              label="Available"
              value="56"
              sublabel="Floors B1 – B3"
              icon={Info}
            />
            <StatCard
              label="Alerts"
              value="3"
              sublabel="Require attention"
              icon={AlertTriangle}
            />
          </div>
        </Section>

        {/* ── Loading states ───────────────────────────────────────── */}
        <Section title="Loading indicators" description="Spinner sizes and the page-level loader.">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-6">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
            <Card className="max-w-sm">
              <PageLoader label="Fetching occupancy data…" />
            </Card>
          </div>
        </Section>

        {/* ── Inline alerts (design system note) ───────────────────── */}
        <Section title="Alert rows" description="Contextual inline messages.">
          <div className="flex flex-col gap-3 max-w-xl">
            {[
              { icon: CheckCircle2, color: 'text-success', bg: 'bg-green-50 border-green-200', label: 'Slot A-12 reserved successfully.' },
              { icon: AlertTriangle, color: 'text-warning', bg: 'bg-amber-50 border-amber-200', label: 'Floor B2 is nearing capacity (90%).' },
              { icon: XCircle, color: 'text-error', bg: 'bg-red-50 border-red-200', label: 'Payment gateway connection failed.' },
              { icon: Info, color: 'text-info', bg: 'bg-sky-50 border-sky-200', label: 'Maintenance window scheduled for Sunday 02:00 AM.' },
            ].map(({ icon: Icon, color, bg, label }) => (
              <div
                key={label}
                className={`flex items-start gap-3 px-4 py-3 rounded-md border text-sm ${bg}`}
              >
                <Icon size={16} className={`${color} mt-0.5 shrink-0`} />
                <span className="text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* Footer note */}
      <div className="mt-16 pt-6 border-t border-border text-center">
        <p className="text-xs text-text-disabled">
          ParkEase — Phase 1 Foundation · Design system ready for
          feature development
        </p>
      </div>
    </PageContainer>
  )
}
