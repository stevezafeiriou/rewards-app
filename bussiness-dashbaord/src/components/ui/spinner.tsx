import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('inline-flex h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary', className)}
    />
  )
}
