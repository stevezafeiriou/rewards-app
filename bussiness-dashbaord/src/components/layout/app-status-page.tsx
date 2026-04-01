import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

type AppStatusPageProps = {
  code: string
  title: string
  description: string
  primaryAction?: {
    label: string
    to?: string
    onClick?: () => void
  }
  secondaryAction?: {
    label: string
    to: string
  }
  fullscreen?: boolean
}

export function AppStatusPage({
  code,
  title,
  description,
  primaryAction,
  secondaryAction,
  fullscreen = true,
}: AppStatusPageProps) {
  const content = (
    <div className="app-card max-w-xl p-8 text-center sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{code}</p>
      <h1 className="mt-3 text-3xl font-extrabold text-foreground">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
      {(primaryAction || secondaryAction) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {primaryAction ? (
            primaryAction.to ? (
              <Link to={primaryAction.to}>
                <Button>{primaryAction.label}</Button>
              </Link>
            ) : (
              <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>
            )
          ) : null}
          {secondaryAction ? (
            <Link to={secondaryAction.to}>
              <Button variant="outline">{secondaryAction.label}</Button>
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  )

  if (!fullscreen) return content

  return <div className="flex min-h-screen items-center justify-center px-6">{content}</div>
}
