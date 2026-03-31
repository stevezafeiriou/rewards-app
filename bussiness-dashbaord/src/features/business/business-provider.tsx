/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/auth-provider'
import { fetchResolvedBusinessContext } from '@/features/business/business-context'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type { AppBootstrapState, Profile, ResolvedBusinessContext } from '@/types/app'

type BusinessBootstrapContextValue = {
  profileQuery: UseQueryResult<Profile | null, Error>
  businessContextQuery: UseQueryResult<ResolvedBusinessContext, Error>
  state: AppBootstrapState
}

const BusinessBootstrapContext = createContext<BusinessBootstrapContextValue | null>(null)

export function BusinessBootstrapProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).maybeSingle()
      if (error) throw error
      if (data) return data

      const { error: ensureError } = await supabase.rpc('ensure_profile_for_role', { p_role: 'business' })
      if (ensureError) throw ensureError

      const { data: ensuredProfile, error: ensuredError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()

      if (ensuredError) throw ensuredError
      return ensuredProfile
    },
  })

  const businessContextQuery = useQuery({
    queryKey: queryKeys.business(user?.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    queryFn: async (): Promise<ResolvedBusinessContext> => fetchResolvedBusinessContext(user!.id),
  })

  const value = useMemo(
    () => ({
      profileQuery,
      businessContextQuery,
      state: {
        profile: profileQuery.data ?? null,
        resolvedBusiness: businessContextQuery.data?.business ?? null,
        staffRole: businessContextQuery.data?.staffRole ?? null,
        businessSource: businessContextQuery.data?.source ?? null,
        effectiveRole: profileQuery.data?.role ?? null,
        canBypassBilling: profileQuery.data?.role === 'admin',
      },
    }),
    [businessContextQuery, profileQuery],
  )

  return <BusinessBootstrapContext.Provider value={value}>{children}</BusinessBootstrapContext.Provider>
}

export function useBusinessBootstrap() {
  const context = useContext(BusinessBootstrapContext)
  if (!context) {
    throw new Error('useBusinessBootstrap must be used within BusinessBootstrapProvider')
  }

  return context
}

export function useAppBootstrapState() {
  return useBusinessBootstrap().state
}
