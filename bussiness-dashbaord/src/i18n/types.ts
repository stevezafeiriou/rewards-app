export const SUPPORTED_LOCALES = ['el', 'en'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: AppLocale = 'el'

export const INTL_LOCALES: Record<AppLocale, string> = {
  el: 'el-GR',
  en: 'en-GB',
}

export function normalizeLocale(value: string | null | undefined): AppLocale {
  if (!value) return DEFAULT_LOCALE
  if (value.toLowerCase().startsWith('en')) return 'en'
  return 'el'
}

export function toIntlLocale(locale: string | null | undefined) {
  return INTL_LOCALES[normalizeLocale(locale)]
}
