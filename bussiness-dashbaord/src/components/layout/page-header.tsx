import type { ReactNode } from 'react'
import { FadeIn } from '@/components/ui/motion'

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <FadeIn className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</p> : null}
        <div className="space-y-1">
          <h1 className="text-[1.55rem] font-extrabold leading-tight text-foreground sm:text-[1.8rem]">{title}</h1>
          {description ? <p className="max-w-3xl text-[13px] leading-5.5 text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </FadeIn>
  )
}
