import { cn } from '@/utils/format'

const SYMBOL_SIZES = {
  sm: 28,
  md: 32,
  lg: 40,
}

const WORDMARK_SIZES = {
  sm: 'text-sm',
  md: 'text-[1.0625rem]',
  lg: 'text-xl',
}

/**
 * ParkEaseLogo — scalable vector brand identity for ParkEase.
 *
 * Design concept:
 *   An architectural letter "P" integrated with an active location-pin beacon
 *   inside its counter and a clean parking-stall base bar tucked beneath its arch.
 *
 * @param {{
 *   variant?: 'full'|'compact',
 *   theme?: 'light'|'dark',
 *   size?: 'sm'|'md'|'lg',
 *   subtitle?: string,
 *   className?: string,
 * }} props
 */
export function ParkEaseLogo({
  variant = 'full',
  theme = 'light',
  size = 'md',
  subtitle,
  className,
}) {
  const iconPx = SYMBOL_SIZES[size] ?? SYMBOL_SIZES.md
  const isDark = theme === 'dark'

  const primaryFill = isDark ? '#FFFFFF' : '#142B43'
  const accentFill  = isDark ? '#20C997' : '#087F5B'
  const isCompact   = variant === 'compact'

  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none shrink-0', className)}>
      <svg
        width={iconPx}
        height={iconPx}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role={isCompact ? 'img' : undefined}
        aria-label={isCompact ? 'ParkEase' : undefined}
        aria-hidden={isCompact ? undefined : true}
        className="shrink-0"
      >
        {/* Architectural P letterform (even-odd counter cutout) */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.5 4H19.5C25.0228 4 29.5 8.47715 29.5 14C29.5 19.5228 25.0228 24 19.5 24H11.5V30C11.5 31.1046 10.6046 32 9.5 32H7C5.89543 32 5 31.1046 5 30V6.5C5 5.11929 6.11929 4 7.5 4ZM11.5 9.8V18.2H19.3C21.6196 18.2 23.5 16.3196 23.5 14C23.5 11.6804 21.6196 9.8 19.3 9.8H11.5Z"
          fill={primaryFill}
        />

        {/* Integrated location-pin beacon inside the P bowl */}
        <circle cx="18.2" cy="14" r="2.5" fill={accentFill} />

        {/* Dedicated parking-stall base bar beneath the P arch */}
        <rect x="15.5" y="27.25" width="14" height="4.75" rx="2.375" fill={accentFill} />
      </svg>

      {!isCompact && (
        <span className="flex flex-col">
          <span
            className={cn(
              'font-display font-bold leading-none tracking-tight',
              WORDMARK_SIZES[size] ?? WORDMARK_SIZES.md,
            )}
          >
            <span className={isDark ? 'text-white' : 'text-brand-navy'}>Park</span>
            <span className={isDark ? 'text-emerald-400' : 'text-emerald-600'}>Ease</span>
          </span>
          {subtitle && (
            <span
              className={cn(
                'text-[11px] font-medium leading-none mt-1',
                isDark ? 'text-navy-200' : 'text-text-tertiary',
              )}
            >
              {subtitle}
            </span>
          )}
        </span>
      )}
    </span>
  )
}
