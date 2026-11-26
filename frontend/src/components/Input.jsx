import { forwardRef } from 'react'
import { cn } from '@/utils/format'

/**
 * Input component.
 *
 * @param {'text'|'email'|'password'|'number'|'search'|'tel'} [type='text']
 * @param {string} [label]
 * @param {string} [hint]
 * @param {string} [error]
 * @param {React.ReactNode} [leftAddon]  Icon/element before the input text
 * @param {React.ReactNode} [rightAddon] Icon/element after the input text
 */
export const Input = forwardRef(function Input(
  {
    type = 'text',
    label,
    hint,
    error,
    leftAddon,
    rightAddon,
    className,
    id,
    disabled,
    ...props
  },
  ref,
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  const inputBase = [
    'w-full h-9 rounded-md border bg-white px-3 text-sm',
    'text-text-primary placeholder:text-text-disabled',
    'transition-base outline-none',
    'focus:ring-2 focus:ring-teal-500 focus:ring-offset-0 focus:border-teal-500',
    error
      ? 'border-error focus:ring-error'
      : 'border-border hover:border-border-strong',
    leftAddon && 'pl-9',
    rightAddon && 'pr-9',
    disabled && 'opacity-50 cursor-not-allowed bg-surface-muted',
  ]

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-primary"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {leftAddon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:size-4 pointer-events-none">
            {leftAddon}
          </span>
        )}

        <input
          ref={ref}
          type={type}
          id={inputId}
          disabled={disabled}
          className={cn(...inputBase)}
          {...props}
        />

        {rightAddon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary [&>svg]:size-4">
            {rightAddon}
          </span>
        )}
      </div>

      {(hint || error) && (
        <p className={cn('text-xs', error ? 'text-error' : 'text-text-tertiary')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
})
