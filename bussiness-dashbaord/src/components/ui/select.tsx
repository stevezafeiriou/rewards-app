import type { ReactNode, SelectHTMLAttributes } from 'react'
import { HiMiniChevronDown } from 'react-icons/hi2'
import { cn } from '@/lib/utils'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  error?: string
  leftIcon?: ReactNode
}

export function Select({ className, error, children, leftIcon, ...props }: Props) {
  return (
    <div className="relative">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {leftIcon}
        </span>
      ) : null}
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        <HiMiniChevronDown className="size-4" />
      </span>
      <select
        className={cn(
          'min-h-10 w-full appearance-none rounded-[0.85rem] border border-border bg-elevated px-3.5 py-2.5 pr-10 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition focus:border-[color-mix(in_srgb,var(--primary)_32%,transparent)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_12%,transparent)]',
          leftIcon && 'pl-10',
          error && 'border-danger-border',
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
