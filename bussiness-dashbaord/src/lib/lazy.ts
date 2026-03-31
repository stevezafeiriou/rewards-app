import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

export function lazyRoute<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  key: TKey,
): LazyExoticComponent<ComponentType<object>> {
  return lazy(async () => {
    const module = await loader()
    return { default: module[key] as ComponentType<object> }
  })
}
