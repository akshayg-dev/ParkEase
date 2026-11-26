import { cn } from '@/utils/format'

/**
 * Spinner — minimal accessible loading indicator.
 *
 * Uses ParkEase brand colors:
 *   track  → navy-100  (#dce6f0)
 *   accent → emerald-600 (#087f5b)
 *
 * Respects `prefers-reduced-motion` via Tailwind's motion-reduce variant.
 *
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {string}         [label='Loading…']
 * @param {string}         [className]
 */
export function Spinner({ size = 'md', label = 'Loading…', className }) {
  const sizes = {
    sm: 'size-4 border-2',
    md: 'size-6 border-2',
    lg: 'size-10 border-[3px]',
  }

  return (
    <span role="status" aria-label={label} className={cn('inline-flex', className)}>
      <span
        className={cn(
          'rounded-full border-navy-100 border-t-emerald-600 animate-spin motion-reduce:animate-none',
          sizes[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/**
 * PageLoader — full-screen centered loading state.
 * Used in route guards and top-level async boundaries.
 */
export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-1 items-center justify-center min-h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" label={label} />
        <p className="text-sm text-text-tertiary">{label}</p>
      </div>
    </div>
  )
}
