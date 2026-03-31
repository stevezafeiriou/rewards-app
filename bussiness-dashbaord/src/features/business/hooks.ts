import { useMutation, useQuery } from '@tanstack/react-query'
import { useBusinessBootstrap } from '@/features/business/business-provider'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import type {
  BusinessCategory,
  BusinessDashboardStats,
  MemberLookupResult,
  Offer,
  SubscriptionPlan,
  SupportTicket,
  SupportTicketMessage,
  Transaction,
  TransactionResult,
} from '@/types/app'

export { fetchCurrentBusiness, fetchResolvedBusinessContext } from '@/features/business/business-context'

export function useProfile() {
  return useBusinessBootstrap().profileQuery
}

export function useBusiness() {
  const context = useBusinessContext()

  return {
    ...context,
    data: context.data?.business ?? null,
  }
}

export function useBusinessContext() {
  return useBusinessBootstrap().businessContextQuery
}

export function useBusinessCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<BusinessCategory[]> => {
      const { data, error } = await supabase
        .from('business_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      if (error) throw error
      return data
    },
  })
}

export function useBusinessDashboardStats(businessId?: string) {
  return useQuery({
    queryKey: queryKeys.dashboardStats(businessId),
    enabled: !!businessId,
    staleTime: 30_000,
    queryFn: async (): Promise<BusinessDashboardStats> => {
      const { data, error } = await supabase.rpc('get_business_dashboard_stats', { p_business_id: businessId! })
      if (error) throw error
      return data as BusinessDashboardStats
    },
  })
}

export function useOffers(businessId?: string) {
  return useQuery({
    queryKey: queryKeys.offers(businessId),
    enabled: !!businessId,
    queryFn: async (): Promise<Offer[]> => {
      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useOffer(offerId?: string) {
  return useQuery({
    queryKey: queryKeys.offer(offerId),
    enabled: !!offerId,
    queryFn: async (): Promise<Offer | null> => {
      const { data, error } = await supabase.from('offers').select('*').eq('id', offerId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useTransactions(businessId?: string, limit = 50) {
  return useQuery({
    queryKey: [...queryKeys.transactions(businessId), limit],
    enabled: !!businessId,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    },
  })
}

export function useSubscriptionPlans() {
  return useQuery({
    queryKey: queryKeys.plans,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('plan_type', 'business')
        .eq('is_active', true)
        .order('price_monthly_cents', { ascending: true })
        .order('setup_fee_cents', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

export function useTickets() {
  return useQuery({
    queryKey: queryKeys.tickets,
    queryFn: async (): Promise<SupportTicket[]> => {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

export function useTicket(ticketId?: string) {
  return useQuery({
    queryKey: queryKeys.ticket(ticketId),
    enabled: !!ticketId,
    queryFn: async (): Promise<SupportTicket | null> => {
      const { data, error } = await supabase.from('support_tickets').select('*').eq('id', ticketId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useTicketMessages(ticketId?: string) {
  return useQuery({
    queryKey: queryKeys.ticketMessages(ticketId),
    enabled: !!ticketId,
    queryFn: async (): Promise<SupportTicketMessage[]> => {
      const { data, error } = await supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at')

      if (error) throw error
      return data
    },
  })
}

export function useMemberLookup() {
  return useMutation({
    mutationFn: async (identifier: string): Promise<MemberLookupResult> => {
      const { data, error } = await supabase.rpc('lookup_member', { p_identifier: identifier })
      if (error) throw error
      return data as MemberLookupResult
    },
  })
}

export function useRecordTransaction() {
  return useMutation({
    mutationFn: async (payload: {
      businessId: string
      publicUserId: string
      amountSpent: number
      offerId?: string
      notes?: string
    }): Promise<TransactionResult> => {
      const { data, error } = await supabase.rpc('record_transaction', {
        p_business_id: payload.businessId,
        p_user_public_id: payload.publicUserId,
        p_amount_spent: payload.amountSpent,
        p_identification_method: 'manual_entry',
        p_offer_id: payload.offerId || undefined,
        p_notes: payload.notes || undefined,
      })

      if (error) throw error
      return data as TransactionResult
    },
  })
}
