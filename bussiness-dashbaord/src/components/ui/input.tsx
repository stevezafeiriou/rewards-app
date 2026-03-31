import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  leftIcon?: ReactNode
}

export function Input({ className, error, leftIcon, ...props }: Props) {
  return (
    <div className="relative">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {leftIcon}
        </span>
      ) : null}
      <input
        className={cn(
          'min-h-10 w-full rounded-[0.85rem] border border-border bg-elevated px-3.5 py-2.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition placeholder:text-muted-foreground focus:border-[color-mix(in_srgb,var(--primary)_32%,transparent)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_12%,transparent)] disabled:cursor-not-allowed disabled:border-[color-mix(in_srgb,var(--border)_92%,white)] disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none disabled:placeholder:text-slate-400',
          leftIcon && 'pl-10',
          error && 'border-danger-border focus:border-danger-border focus:ring-[color-mix(in_srgb,var(--danger-text)_16%,transparent)]',
          className,
        )}
        {...props}
      />
    </div>
  )
}
