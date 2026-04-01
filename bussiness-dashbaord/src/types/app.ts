import type { Database, Json } from '@/types/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Business = Database['public']['Tables']['businesses']['Row']
export type BusinessCategory = Database['public']['Tables']['business_categories']['Row']
export type Offer = Database['public']['Tables']['offers']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type SupportTicket = Database['public']['Tables']['support_tickets']['Row']
export type SupportTicketMessage = Database['public']['Tables']['support_ticket_messages']['Row']
export type SubscriptionPlan = Database['public']['Tables']['subscription_plans']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']

export type SubscriptionStatus = Database['public']['Enums']['subscription_status']
export type OfferType = Database['public']['Enums']['offer_type']
export type OfferStatus = Database['public']['Enums']['offer_status']
export type IdentificationMethod = Database['public']['Enums']['identification_method']
export type TicketPriority = Database['public']['Enums']['ticket_priority']
export type TicketStatus = Database['public']['Enums']['ticket_status']

export interface BusinessDashboardStats {
  total_transactions: number
  total_revenue: number
  total_rewards_given: number
  unique_customers: number
  transactions_today: number
  revenue_today: number
  transactions_this_month: number
  revenue_this_month: number
  active_offers: number
}

export interface MemberLookupResult {
  user_id: string
  public_user_id: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  subscription_plan: 'free' | 'paid'
  is_active: boolean
}

export interface TransactionResult {
  transaction_id: string
  rewards_earned: number
  user_name: string
}

export interface OnboardingDraft {
  businessId?: string
  name?: string
  description?: string
  categoryId?: string
  subcategory?: string
  address_line1?: string
  address_line2?: string
  city?: string
  postal_code?: string
  region?: string
  country?: string
  google_business_url?: string | null
  phone?: string
  email?: string
  website?: string
  social_facebook?: string
  social_instagram?: string
  profile_image_url?: string | null
  cover_image_url?: string | null
  operating_hours?: Json | null
}

export interface ResolvedBusinessContext {
  business: Business | null
  staffRole: 'owner' | 'manager' | 'staff' | null
  source: 'business_staff' | 'owner_fallback' | null
}

export interface AppBootstrapState {
  profile: Profile | null
  resolvedBusiness: Business | null
  staffRole: ResolvedBusinessContext['staffRole']
  businessSource: ResolvedBusinessContext['source']
  effectiveRole: Profile['role'] | null
  canBypassBilling: boolean
}

export type BusinessOperatingHours = Record<
  'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday',
  {
    closed: boolean
    open: string
    close: string
  }
>

export interface ApiError {
  message: string
  details?: Json
}

export interface SearchOfferResult {
  id: string
  title: string
  status: Offer['status']
}

export interface SearchTicketResult {
  id: string
  subject: string
  status: SupportTicket['status']
  updated_at: string
}

export interface GlobalSearchResults {
  member: MemberLookupResult | null
  offers: SearchOfferResult[]
  tickets: SearchTicketResult[]
}
