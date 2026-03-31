import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import i18n from '@/i18n/config'
import { toIntlLocale } from '@/i18n/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null | undefined, locale?: string, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(toIntlLocale(locale ?? i18n.resolvedLanguage), {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits,
  }).format(amount ?? 0)
}

export function formatDate(date: string | null | undefined, options?: Intl.DateTimeFormatOptions, locale?: string) {
  if (!date) return '—'

  return new Intl.DateTimeFormat(toIntlLocale(locale ?? i18n.resolvedLanguage), {
    dateStyle: 'medium',
    timeStyle: 'short',
    ...options,
  }).format(new Date(date))
}

export function toTitleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
