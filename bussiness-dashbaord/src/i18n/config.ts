import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { LOCALE_KEY } from '@/lib/storage'
import en from '@/i18n/resources/en'
import el from '@/i18n/resources/el'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/i18n/types'

export const I18N_NAMESPACES = [
  'common',
  'navigation',
  'auth',
  'onboarding',
  'dashboard',
  'offers',
  'customers',
  'profile',
  'settings',
  'support',
  'validation',
] as const

if (!i18n.isInitialized) {
  void i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        el,
        en,
      },
      supportedLngs: [...SUPPORTED_LOCALES],
      fallbackLng: DEFAULT_LOCALE,
      lng: DEFAULT_LOCALE,
      defaultNS: 'common',
      ns: [...I18N_NAMESPACES],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'htmlTag', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: LOCALE_KEY,
      },
      react: {
        useSuspense: false,
      },
      returnNull: false,
      debug: import.meta.env.DEV,
    })
}

export default i18n
