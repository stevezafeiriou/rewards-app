import { useTranslation } from 'react-i18next'
import { normalizeLocale } from '@/i18n/types'

export function useAppTranslation(namespaces?: string | string[]) {
  const translation = useTranslation(namespaces)
  const normalizedNamespaces = Array.isArray(namespaces) ? namespaces : namespaces ? [namespaces] : []

  function resolveKey(key: string) {
    if (!key) return key
    if (key.includes(':')) return key

    const matchedNamespace = normalizedNamespaces.find((namespace) => key.startsWith(`${namespace}.`))
    if (matchedNamespace) {
      return `${matchedNamespace}:${key.slice(matchedNamespace.length + 1)}`
    }

    if (translation.i18n.exists(key)) {
      return key
    }

    for (const namespace of normalizedNamespaces) {
      const namespacedKey = `${namespace}:${key}`
      if (translation.i18n.exists(namespacedKey)) {
        return namespacedKey
      }
    }

    return normalizedNamespaces.length === 1 ? `${normalizedNamespaces[0]}:${key}` : key
  }

  const wrappedT = ((key: string, ...rest: unknown[]) => {
    return translation.t(resolveKey(key), ...(rest as [never]))
  }) as unknown as typeof translation.t

  return {
    ...translation,
    t: wrappedT,
    locale: normalizeLocale(translation.i18n.resolvedLanguage ?? translation.i18n.language),
  }
}
