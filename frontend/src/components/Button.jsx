import { getButtonClasses } from '@/utils/buttonStyles'

/**
 * Button component with variants and sizes.
 *
 * @param {'primary'|'emerald'|'secondary'|'outline'|'ghost'|'danger'} [variant='primary']
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

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={getButtonClasses({
        variant,
        size,
        disabled: isDisabled,
        className,
      })}
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
