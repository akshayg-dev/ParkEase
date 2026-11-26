import { cn } from '@/utils/format'

const VARIANTS = {
  neutral: 'bg-surface-muted text-text-secondary border-border',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  error:   'bg-red-50 text-red-600 border-red-200',
  info:    'bg-sky-50 text-sky-700 border-sky-200',
  teal:    'bg-teal-50 text-teal-700 border-teal-200',
  navy:    'bg-navy-50 text-navy-800 border-navy-200',
}

/**
 * Badge — compact status label.
 *
 * @param {{
 *   label: string,
 *   variant?: 'neutral'|'success'|'warning'|'error'|'info'|'teal'|'navy',
 *   className?: string,
 * }} props
 */
export function Badge({ label, variant = 'neutral', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border whitespace-nowrap',
        VARIANTS[variant] ?? VARIANTS.neutral,
        className,
      )}
    >
      {label}
    </span>
  )
}
