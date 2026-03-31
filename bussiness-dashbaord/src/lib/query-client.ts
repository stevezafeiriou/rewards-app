import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 2 * 60_000,
      gcTime: 30 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
})
