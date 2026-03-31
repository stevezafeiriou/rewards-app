import type { OnboardingDraft } from '@/types/app'

const THEME_KEY = 'business-dashboard-theme'
export const LOCALE_KEY = 'business-dashboard-locale'

function onboardingKey(userId: string) {
  return `business-dashboard-onboarding:${userId}`
}

export function readTheme() {
  return localStorage.getItem(THEME_KEY) ?? 'light'
}

export function writeTheme(theme: string) {
  localStorage.setItem(THEME_KEY, theme)
}

export function readLocale() {
  return localStorage.getItem(LOCALE_KEY) ?? 'el'
}

export function writeLocale(locale: string) {
  localStorage.setItem(LOCALE_KEY, locale)
}

export function readOnboardingDraft(userId: string) {
  const raw = localStorage.getItem(onboardingKey(userId))
  if (!raw) return null

  try {
    return JSON.parse(raw) as OnboardingDraft
  } catch {
    return null
  }
}

export function writeOnboardingDraft(userId: string, draft: OnboardingDraft) {
  localStorage.setItem(onboardingKey(userId), JSON.stringify(draft))
}

export function clearOnboardingDraft(userId: string) {
  localStorage.removeItem(onboardingKey(userId))
}

export function readSessionValue<T>(key: string) {
  const raw = sessionStorage.getItem(key)
  if (!raw) return null

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function writeSessionValue(key: string, value: unknown) {
  sessionStorage.setItem(key, JSON.stringify(value))
}

export function clearSessionValue(key: string) {
  sessionStorage.removeItem(key)
}
