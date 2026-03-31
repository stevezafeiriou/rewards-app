import type { ReactNode } from 'react'
import { HiOutlineSparkles } from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { FadeIn } from '@/components/ui/motion'
import { cn } from '@/lib/utils'

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  compact = false,
  className,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
  compact?: boolean
  className?: string
}) {
  return (
    <FadeIn
      className={cn(
        'flex flex-col items-start gap-4 rounded-[1.45rem] border border-border text-left',
        compact
          ? 'bg-transparent p-6 shadow-none'
          : 'bg-[color-mix(in_srgb,var(--card)_88%,transparent)] shadow-soft p-8',
        className,
      )}
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary-weak text-primary">
        {icon ?? <HiOutlineSparkles className="h-5 w-5" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button variant="secondary" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </FadeIn>
  )
}
