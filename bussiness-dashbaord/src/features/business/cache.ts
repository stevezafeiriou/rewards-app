import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'

export async function invalidateBusinessContext(queryClient: QueryClient, userId?: string) {
  await Promise.all(
    userId
      ? [
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.business(userId) }),
      ]
      : [
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['business'] }),
      ],
  )
}

export async function invalidateBusinessOperations(queryClient: QueryClient, businessId?: string) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats(businessId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.offers(businessId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.transactions(businessId) }),
  ])
}
