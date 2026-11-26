import { cn } from '@/utils/format'

/**
 * PageContainer — consistent max-width wrapper for page content.
 *
 * @param {'sm'|'md'|'lg'|'xl'|'full'} [maxWidth='xl']
 * @param {boolean} [padded=true]
 */
export function PageContainer({
  children,
  maxWidth = 'xl',
  padded = true,
  className,
  ...props
}) {
  const widths = {
    sm:   'max-w-2xl',
    md:   'max-w-4xl',
    lg:   'max-w-5xl',
    xl:   'max-w-7xl',
    full: 'max-w-none',
  }

  return (
    <div
      className={cn(
        'w-full mx-auto',
        widths[maxWidth],
        padded && 'px-4 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
