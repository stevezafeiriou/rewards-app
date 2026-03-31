import { cn } from '@/lib/utils'

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode
  tone?: 'neutral' | 'primary' | 'warning' | 'danger' | 'success'
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-surface-2 text-muted-foreground',
        tone === 'primary' && 'bg-primary-weak text-primary',
        tone === 'warning' && 'bg-warning-bg text-warning-text ring-1 ring-inset ring-warning-border',
        tone === 'danger' && 'bg-danger-bg text-danger-text ring-1 ring-inset ring-danger-border',
        tone === 'success' && 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
        className,
      )}
    >
      {children}
    </span>
  )
}
