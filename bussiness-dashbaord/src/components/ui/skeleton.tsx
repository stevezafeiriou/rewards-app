import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative overflow-hidden rounded-[1.1rem] bg-[color-mix(in_srgb,var(--surface-2)_84%,white)] dark:bg-[color-mix(in_srgb,var(--surface-2)_92%,black)] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] dark:before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]',
        className,
      )}
      {...props}
    />
  )
}
