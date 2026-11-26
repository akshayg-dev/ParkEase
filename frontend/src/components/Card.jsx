import { cn } from '@/utils/format'

/**
 * Card — a surface container with consistent border, background and shadow.
 *
 * Sub-components:
 *   <Card.Header>  — padded top section, often used with a title + action
 *   <Card.Body>    — padded content area
 *   <Card.Footer>  — padded bottom section, right-aligned by default
 *
 * @param {boolean} [noPadding=false]  When true, removes padding from the root card.
 */
export function Card({ children, className, noPadding = false, ...props }) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg shadow-card',
        !noPadding && 'p-5',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'px-5 pt-5 pb-4 flex items-start justify-between gap-4 border-b border-border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Card.Body = function CardBody({ children, className, ...props }) {
  return (
    <div className={cn('px-5 py-4', className)} {...props}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn(
        'px-5 py-4 border-t border-border flex items-center justify-end gap-2',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
