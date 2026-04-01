import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type FormFieldProps = {
  label: string
  helper?: string
  error?: string
  children: ReactNode
  className?: string
  compact?: boolean
  required?: boolean
}

export function FormField({
  label,
  helper,
  error,
  children,
  className,
  compact = false,
  required = false,
}: FormFieldProps) {
  return (
    <div className={cn(compact ? 'space-y-1.5' : 'space-y-2', className)}>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {label}
          {required ? <span aria-hidden="true" className="ml-1 text-danger-text">*</span> : null}
        </p>
        {helper ? <p className="text-xs leading-5 text-muted-foreground">{helper}</p> : null}
      </div>
      {children}
      {error ? <p className="text-xs font-medium text-danger-text">{error}</p> : null}
    </div>
  )
}
