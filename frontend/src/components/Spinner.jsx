import { cn } from '@/utils/format'

/**
 * Spinner — minimal accessible loading indicator.
 *
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {string} [label='Loading…']
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
          'rounded-full border-navy-200 border-t-navy-800 animate-spin',
          sizes[size],
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  )
}

/**
 * PageLoader — full-screen centered loading state.
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
