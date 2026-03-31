import { supabase } from '@/lib/supabase'
import type { Business, ResolvedBusinessContext } from '@/types/app'

export async function fetchResolvedBusinessContext(userId: string): Promise<ResolvedBusinessContext> {
  const { data: membership, error: membershipError } = await supabase
    .from('business_staff')
    .select('business_id, staff_role, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (membershipError) throw membershipError

  if (membership?.business_id) {
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', membership.business_id)
      .maybeSingle()

    if (businessError) throw businessError
    if (business) {
      return {
        business,
        staffRole: membership.staff_role as ResolvedBusinessContext['staffRole'],
        source: 'business_staff',
      }
    }
  }

  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return {
    business: data,
    staffRole: data ? 'owner' : null,
    source: data ? 'owner_fallback' : null,
  }
}

export async function fetchCurrentBusiness(userId: string): Promise<Business | null> {
  const context = await fetchResolvedBusinessContext(userId)
  return context.business
}
