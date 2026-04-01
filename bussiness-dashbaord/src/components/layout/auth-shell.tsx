import type { ReactNode } from 'react'
import { AppFooter } from '@/components/layout/app-footer'
import { useAppTranslation } from '@/i18n/use-app-translation'

export function AuthShell({
  title,
  description,
  asideTitle,
  asideDescription,
  children,
}: {
  title: string
  description: string
  asideTitle: string
  asideDescription: string
  children: ReactNode
}) {
  const { t } = useAppTranslation(['auth', 'common'])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1360px] flex-col px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 items-center">
          <div className="app-card grid min-h-[74vh] w-full overflow-hidden lg:grid-cols-[1.02fr_0.98fr]">
            <aside className="relative hidden overflow-hidden bg-sidebar p-7 text-white lg:flex lg:flex-col lg:justify-between">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(138,132,255,0.32),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(125,211,252,0.16),transparent_32%)]" />
              <div className="relative z-10 inline-flex w-fit rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-white/80">
                {t('auth.shell.product')}
              </div>
              <div className="relative z-10 max-w-md space-y-3">
                <p className="text-[13px] font-medium text-white/60">{t('auth.shell.eyebrow')}</p>
                <h2 className="text-4xl font-extrabold leading-[1.05] text-white xl:text-[2.8rem]">{asideTitle}</h2>
                <p className="text-sm leading-6 text-white/72">{asideDescription}</p>
              </div>
            </aside>

            <div className="flex items-center justify-center bg-elevated px-6 py-8 sm:px-9">
              <div className="w-full max-w-md space-y-6">
                <div className="space-y-1.5 text-center">
                  <h1 className="text-[2rem] font-extrabold leading-tight text-foreground sm:text-[2.2rem]">{title}</h1>
                  <p className="text-[13px] leading-6 text-muted-foreground">{description}</p>
                </div>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}
