import { cn } from '@/utils/format'

const BUTTON_VARIANTS = {
  primary: {
    base: 'bg-navy-800 text-white border-navy-800',
    interactive: 'hover:bg-navy-700 hover:border-navy-700 active:bg-navy-900',
  },
  emerald: {
    base: 'bg-emerald-600 text-white border-emerald-600',
    interactive: 'hover:bg-emerald-700 hover:border-emerald-700 active:bg-emerald-800',
  },
  secondary: {
    base: 'bg-white text-navy-800 border-border',
    interactive: 'hover:bg-surface-muted hover:border-border-strong active:bg-surface-muted',
  },
  outline: {
    base: 'bg-white text-brand-navy border-navy-200',
    interactive: 'hover:bg-surface-muted hover:border-navy-300 active:bg-navy-50',
  },
  ghost: {
    base: 'bg-transparent text-text-secondary border-transparent',
    interactive: 'hover:bg-surface-muted hover:text-text-primary active:bg-surface-muted',
  },
  danger: {
    base: 'bg-error text-white border-error',
    interactive: 'hover:bg-red-700 hover:border-red-700 active:bg-red-800',
  },
}

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-6 text-sm gap-2',
}

/**
 * Shared class builder for <Button> and action <NavLink> controls
 * so height, padding, radius, typography, and color contrast match everywhere.
 *
 * @param {{
 *   variant?: 'primary'|'emerald'|'secondary'|'outline'|'ghost'|'danger',
 *   size?: 'sm'|'md'|'lg',
 *   disabled?: boolean,
 *   className?: string,
 * }} [options]
 */
export function getButtonClasses({
  variant = 'primary',
  size = 'md',
  disabled = false,
  className,
} = {}) {
  const scheme = BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary

  return cn(
    'inline-flex items-center justify-center',
    'font-medium leading-none select-none whitespace-nowrap',
    'border transition-base rounded-md',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    scheme.base,
    !disabled && scheme.interactive,
    BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
    className,
  )
}
