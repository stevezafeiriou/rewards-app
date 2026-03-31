import type { ReactNode, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string
  leftIcon?: ReactNode
}

export function Textarea({ className, error, leftIcon, ...props }: Props) {
  return (
    <div className="relative">
      {leftIcon ? (
        <span className="pointer-events-none absolute left-3 top-3 text-muted-foreground">
          {leftIcon}
        </span>
      ) : null}
      <textarea
        className={cn(
          'min-h-28 w-full rounded-[0.85rem] border border-border bg-elevated px-3.5 py-2.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition placeholder:text-muted-foreground focus:border-[color-mix(in_srgb,var(--primary)_32%,transparent)] focus:ring-3 focus:ring-[color-mix(in_srgb,var(--primary)_12%,transparent)]',
          leftIcon && 'pl-10',
          error && 'border-danger-border',
          className,
        )}
        {...props}
      />
    </div>
  )
}
