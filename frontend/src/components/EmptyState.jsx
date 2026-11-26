import { cn } from '@/utils/format'

/**
 * EmptyState — deliberate, restrained empty state for cards and pages.
 *
 * @param {{
 *   icon?: React.ComponentType<{ size?: number, strokeWidth?: number, className?: string }>,
 *   title: string,
 *   description?: string,
 *   action?: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-8 px-4',
        className,
      )}
    >
      {Icon && (
        <span className="flex items-center justify-center size-10 rounded-lg bg-surface-muted border border-border text-text-tertiary mb-3">
          <Icon size={18} strokeWidth={1.75} />
        </span>
      )}
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-text-tertiary max-w-xs leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
