import i18n from '@/i18n/config'
import { useAppTranslation } from '@/i18n/use-app-translation'
import type { AppLocale } from '@/i18n/types'
import { cn } from '@/lib/utils'
import { writeLocale } from '@/lib/storage'

const LOCALES: AppLocale[] = ['el', 'en']

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const { locale, t } = useAppTranslation('common')

  async function handleChange(nextLocale: AppLocale) {
    writeLocale(nextLocale)
    await i18n.changeLanguage(nextLocale)
  }

  return (
    <div
      aria-label={t('common.language.label')}
      className={cn(
        compact
          ? 'inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-elevated/92 p-0.5'
          : 'inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-elevated/92 p-0.5 shadow-soft backdrop-blur-sm',
        className,
      )}
      role="group"
    >
      {LOCALES.map((item) => (
        <button
          aria-pressed={locale === item}
          key={item}
          className={cn(
            compact
              ? 'min-w-8 rounded-full px-2 py-1 text-[11px] font-semibold tracking-[0.03em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_28%,transparent)]'
              : 'min-w-9 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--primary)_28%,transparent)]',
            locale === item ? 'bg-primary text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--primary)_20%,transparent)]' : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
          )}
          onClick={() => void handleChange(item)}
          title={item === 'el' ? t('common.language.greek') : t('common.language.english')}
          type="button"
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
