import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'app-btn inline-flex items-center justify-center gap-2 whitespace-nowrap border text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_22%,transparent)] disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-primary px-4 py-2.5 text-white shadow-[0_10px_22px_color-mix(in_srgb,var(--primary)_22%,transparent)] hover:-translate-y-0.5 hover:bg-primary-strong',
        secondary: 'border-transparent bg-primary-weak px-4 py-2.5 text-primary hover:-translate-y-0.5 hover:bg-[color-mix(in_srgb,var(--primary)_16%,white)]',
        ghost: 'border-transparent bg-transparent px-3 py-2 text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        outline: 'border-border bg-elevated px-4 py-2.5 text-foreground hover:-translate-y-0.5 hover:bg-surface-2',
        danger: 'border-danger-border bg-danger-bg px-4 py-2.5 text-danger-text hover:-translate-y-0.5 hover:opacity-90',
      },
      size: {
        sm: 'min-h-8 px-3 text-[13px]',
        md: 'min-h-9 px-4 text-sm',
        lg: 'min-h-10 px-5 text-[15px]',
      },
      full: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    leftIcon?: ReactNode
    rightIcon?: ReactNode
    loading?: boolean
    loadingText?: ReactNode
  }

export function Button({
  className,
  variant,
  size,
  full,
  leftIcon,
  rightIcon,
  loading = false,
  loadingText,
  children,
  disabled,
  ...props
}: Props) {
  return (
    <button className={cn(buttonVariants({ variant, size, full, className }))} disabled={disabled || loading} {...props}>
      {loading ? <Spinner className="h-4 w-4 shrink-0 border-2 border-current/20 border-t-current" /> : leftIcon}
      <span>{loading ? (loadingText ?? children) : children}</span>
      {!loading ? rightIcon : null}
    </button>
  )
}
