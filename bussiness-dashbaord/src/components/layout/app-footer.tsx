import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useAppTranslation } from '@/i18n/use-app-translation'

export function AppFooter() {
  const { t } = useAppTranslation('common')

  return (
    <footer className="sticky bottom-0 z-10 mt-auto flex w-full flex-col gap-3 border-t border-border/70 px-3 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">
          © 2025{' '}
          <a className="transition-colors hover:text-foreground" href="https://saphirelabs.com" target="_blank" rel="noreferrer">
            Saphire Labs
          </a>
          . All rights reserved. Licensed to{' '}
          <a className="transition-colors hover:text-foreground" href="https://emsek.gr" target="_blank" rel="noreferrer">
            EMSEK
          </a>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link className="transition-colors hover:text-foreground" to="/support">
          {t('common.footer.support')}
        </Link>
        <a className="transition-colors hover:text-foreground" href="#">
          {t('common.footer.terms')}
        </a>
        <LanguageSwitcher compact className="self-start sm:self-auto" />
      </div>
    </footer>
  )
}
