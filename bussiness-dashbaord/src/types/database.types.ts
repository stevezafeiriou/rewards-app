export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          phone: string | null
          public_user_id: string | null
          role: Database['public']['Enums']['user_role']
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          public_user_id?: string | null
          role: Database['public']['Enums']['user_role']
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      businesses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          category_id: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          latitude: number | null
          lemon_squeezy_customer_id: string | null
          lemon_squeezy_subscription_id: string | null
          longitude: number | null
          name: string
          onboarding_completed: boolean
          one_time_fee_paid: boolean
          operating_hours: Json | null
          owner_id: string
          phone: string | null
          postal_code: string | null
          profile_image_url: string | null
          region: string | null
          slug: string
          social_facebook: string | null
          social_instagram: string | null
          subcategory: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          subscription_status: Database['public']['Enums']['subscription_status']
          updated_at: string
          website: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          category_id?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          latitude?: number | null
          lemon_squeezy_customer_id?: string | null
          lemon_squeezy_subscription_id?: string | null
          longitude?: number | null
          name: string
          onboarding_completed?: boolean
          one_time_fee_paid?: boolean
          operating_hours?: Json | null
          owner_id: string
          phone?: string | null
          postal_code?: string | null
          profile_image_url?: string | null
          region?: string | null
          slug: string
          social_facebook?: string | null
          social_instagram?: string | null
          subcategory?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: Database['public']['Enums']['subscription_status']
          updated_at?: string
          website?: string | null
        }
        Update: Partial<Database['public']['Tables']['businesses']['Insert']>
        Relationships: []
      }
      business_staff: {
        Row: {
          business_id: string
          created_at: string
          id: string
          is_active: boolean
          staff_role: string
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          staff_role?: string
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['business_staff']['Insert']>
        Relationships: []
      }
      business_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
        }
        Update: Partial<Database['public']['Tables']['business_categories']['Insert']>
        Relationships: []
      }
      offers: {
        Row: {
          business_id: string
          created_at: string
          current_redemptions: number
          description: string | null
          discount_value: number | null
          expires_at: string | null
          id: string
          image_url: string | null
          is_featured: boolean
          max_redemptions: number | null
          min_purchase_amount: number | null
          offer_type: Database['public']['Enums']['offer_type']
          requires_paid_membership: boolean
          starts_at: string
          status: Database['public']['Enums']['offer_status']
          terms_conditions: string | null
          title: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          current_redemptions?: number
          description?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean
          max_redemptions?: number | null
          min_purchase_amount?: number | null
          offer_type?: Database['public']['Enums']['offer_type']
          requires_paid_membership?: boolean
          starts_at?: string
          status?: Database['public']['Enums']['offer_status']
          terms_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['offers']['Insert']>
        Relationships: []
      }
      transactions: {
        Row: {
          amount_spent: number
          business_id: string
          card_id: string | null
          created_at: string
          id: string
          identification_method: Database['public']['Enums']['identification_method']
          notes: string | null
          offer_id: string | null
          rewards_earned: number
          staff_id: string | null
          user_id: string
        }
        Insert: {
          amount_spent: number
          business_id: string
          card_id?: string | null
          created_at?: string
          id?: string
          identification_method: Database['public']['Enums']['identification_method']
          notes?: string | null
          offer_id?: string | null
          rewards_earned?: number
          staff_id?: string | null
          user_id: string
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          metadata: Json
          priority: Database['public']['Enums']['ticket_priority']
          status: Database['public']['Enums']['ticket_status']
          subject: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          metadata?: Json
          priority?: Database['public']['Enums']['ticket_priority']
          status?: Database['public']['Enums']['ticket_status']
          subject: string
          type?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['support_tickets']['Insert']>
        Relationships: []
      }
      support_ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: Partial<Database['public']['Tables']['support_ticket_messages']['Insert']>
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          lemon_squeezy_product_id: string
          lemon_squeezy_variant_id: string
          name: string
          plan_type: string
          price_monthly_cents: number
          setup_fee_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          lemon_squeezy_product_id: string
          lemon_squeezy_variant_id: string
          name: string
          plan_type: string
          price_monthly_cents: number
          setup_fee_cents?: number
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['subscription_plans']['Insert']>
        Relationships: []
      }
    }
    Functions: {
      ensure_profile_for_role: {
        Args: { p_role: Database['public']['Enums']['user_role'] }
        Returns: undefined
      }
      generate_business_slug: {
        Args: { p_name: string }
        Returns: string
      }
      get_business_dashboard_stats: {
        Args: { p_business_id: string }
        Returns: Json
      }
      lookup_member: {
        Args: { p_identifier: string }
        Returns: Json
      }
      record_transaction: {
        Args: {
          p_amount_spent: number
          p_business_id: string
          p_identification_method: Database['public']['Enums']['identification_method']
          p_notes?: string
          p_offer_id?: string
          p_user_public_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      identification_method: 'qr_scan' | 'barcode_scan' | 'manual_entry' | 'nfc'
      offer_status: 'draft' | 'active' | 'paused' | 'expired' | 'archived'
      offer_type: 'percentage_discount' | 'fixed_discount' | 'free_item' | 'buy_one_get_one' | 'custom'
      subscription_status: 'none' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'expired'
      ticket_priority: 'low' | 'medium' | 'high'
      ticket_status: 'open' | 'in_progress' | 'resolved' | 'closed'
      user_role: 'end_user' | 'business' | 'admin'
    }
  }
}
