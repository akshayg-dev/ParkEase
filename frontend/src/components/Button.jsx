import { cn } from '@/utils/format'

/**
 * Button component with variants and sizes.
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'} [variant='primary']
 * @param {'sm'|'md'|'lg'} [size='md']
 * @param {boolean} [loading=false]
 * @param {boolean} [disabled=false]
 * @param {React.ReactNode} [leftIcon]
 * @param {React.ReactNode} [rightIcon]
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  children,
  className,
  type = 'button',
  ...props
}) {
  const isDisabled = disabled || loading

  const base = [
    'inline-flex items-center justify-center gap-2',
    'font-medium leading-none select-none',
    'border transition-base rounded-md',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-teal-500',
    isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
  ]

  const variants = {
    primary: [
      'bg-navy-800 text-white border-navy-800',
      !isDisabled && 'hover:bg-navy-700 hover:border-navy-700 active:bg-navy-900',
    ],
    secondary: [
      'bg-white text-navy-800 border-border',
      !isDisabled && 'hover:bg-surface-muted hover:border-border-strong active:bg-surface-muted',
    ],
    ghost: [
      'bg-transparent text-text-secondary border-transparent',
      !isDisabled && 'hover:bg-surface-muted hover:text-text-primary active:bg-surface-muted',
    ],
    danger: [
      'bg-error text-white border-error',
      !isDisabled && 'hover:bg-red-700 hover:border-red-700 active:bg-red-800',
    ],
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-sm',
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(...base, ...variants[variant], sizes[size], className)}
      {...props}
    >
      {loading ? (
        <span className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      ) : leftIcon ? (
        <span className="shrink-0 [&>svg]:size-4">{leftIcon}</span>
      ) : null}
      {children}
      {rightIcon && !loading && (
        <span className="shrink-0 [&>svg]:size-4">{rightIcon}</span>
      )}
    </button>
  )
}
