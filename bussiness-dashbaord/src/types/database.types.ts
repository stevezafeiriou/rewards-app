export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          badge_type: string
          created_at: string
          criteria_type: string
          criteria_value: number
          description: string | null
          display_order: number
          icon_url: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          badge_type?: string
          created_at?: string
          criteria_type: string
          criteria_value?: number
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          badge_type?: string
          created_at?: string
          criteria_type?: string
          criteria_value?: number
          description?: string | null
          display_order?: number
          icon_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
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
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
        }
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
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          staff_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_staff_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_active_marketplace_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          google_business_url: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          lemon_squeezy_customer_id: string | null
          lemon_squeezy_subscription_id: string | null
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
          subscription_status: Database["public"]["Enums"]["subscription_status"]
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
          google_business_url?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          lemon_squeezy_customer_id?: string | null
          lemon_squeezy_subscription_id?: string | null
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
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          category_id?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          google_business_url?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          lemon_squeezy_customer_id?: string | null
          lemon_squeezy_subscription_id?: string | null
          name?: string
          onboarding_completed?: boolean
          one_time_fee_paid?: boolean
          operating_hours?: Json | null
          owner_id?: string
          phone?: string | null
          postal_code?: string | null
          profile_image_url?: string | null
          region?: string | null
          slug?: string
          social_facebook?: string | null
          social_instagram?: string | null
          subcategory?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "business_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      end_user_profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          id: string
          lemon_squeezy_customer_id: string | null
          lemon_squeezy_subscription_id: string | null
          onboarding_completed: boolean
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_region: string | null
          subscription_ends_at: string | null
          subscription_plan: Database["public"]["Enums"]["user_subscription_plan"]
          subscription_started_at: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          total_rewards_points: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          id: string
          lemon_squeezy_customer_id?: string | null
          lemon_squeezy_subscription_id?: string | null
          onboarding_completed?: boolean
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["user_subscription_plan"]
          subscription_started_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          total_rewards_points?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          id?: string
          lemon_squeezy_customer_id?: string | null
          lemon_squeezy_subscription_id?: string | null
          onboarding_completed?: boolean
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["user_subscription_plan"]
          subscription_started_at?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          total_rewards_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "end_user_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lemon_squeezy_webhook_events: {
        Row: {
          event_id: string
          event_name: string
          payload: Json
          processed_at: string
          resource_id: string | null
        }
        Insert: {
          event_id: string
          event_name: string
          payload: Json
          processed_at?: string
          resource_id?: string | null
        }
        Update: {
          event_id?: string
          event_name?: string
          payload?: Json
          processed_at?: string
          resource_id?: string | null
        }
        Relationships: []
      }
      membership_cards: {
        Row: {
          activated_at: string | null
          card_number: string
          created_at: string
          delivered_at: string | null
          disabled_at: string | null
          id: string
          notes: string | null
          replacement_for: string | null
          shipped_at: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_region: string | null
          status: Database["public"]["Enums"]["card_status"]
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          card_number: string
          created_at?: string
          delivered_at?: string | null
          disabled_at?: string | null
          id?: string
          notes?: string | null
          replacement_for?: string | null
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          card_number?: string
          created_at?: string
          delivered_at?: string | null
          disabled_at?: string | null
          id?: string
          notes?: string | null
          replacement_for?: string | null
          shipped_at?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_region?: string | null
          status?: Database["public"]["Enums"]["card_status"]
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_cards_replacement_for_fkey"
            columns: ["replacement_for"]
            isOneToOne: false
            referencedRelation: "membership_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          offer_type: Database["public"]["Enums"]["offer_type"]
          requires_paid_membership: boolean
          starts_at: string
          status: Database["public"]["Enums"]["offer_status"]
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
          offer_type?: Database["public"]["Enums"]["offer_type"]
          requires_paid_membership?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["offer_status"]
          terms_conditions?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          business_id?: string
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
          offer_type?: Database["public"]["Enums"]["offer_type"]
          requires_paid_membership?: boolean
          starts_at?: string
          status?: Database["public"]["Enums"]["offer_status"]
          terms_conditions?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_active_marketplace_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          role: Database["public"]["Enums"]["user_role"]
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
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          phone?: string | null
          public_user_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          entry_type: Database["public"]["Enums"]["reward_entry_type"]
          id: string
          points: number
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          entry_type: Database["public"]["Enums"]["reward_entry_type"]
          id?: string
          points: number
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          entry_type?: Database["public"]["Enums"]["reward_entry_type"]
          id?: string
          points?: number
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_active_marketplace_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          lemon_squeezy_product_id?: string
          lemon_squeezy_variant_id?: string
          name?: string
          plan_type?: string
          price_monthly_cents?: number
          setup_fee_cents?: number
          updated_at?: string
        }
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
        Update: {
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          metadata: Json
          priority: Database["public"]["Enums"]["ticket_priority"]
          status: Database["public"]["Enums"]["ticket_status"]
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
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          metadata?: Json
          priority?: Database["public"]["Enums"]["ticket_priority"]
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_spent: number
          business_id: string
          card_id: string | null
          created_at: string
          id: string
          identification_method: Database["public"]["Enums"]["identification_method"]
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
          identification_method: Database["public"]["Enums"]["identification_method"]
          notes?: string | null
          offer_id?: string | null
          rewards_earned?: number
          staff_id?: string | null
          user_id: string
        }
        Update: {
          amount_spent?: number
          business_id?: string
          card_id?: string | null
          created_at?: string
          id?: string
          identification_method?: Database["public"]["Enums"]["identification_method"]
          notes?: string | null
          offer_id?: string | null
          rewards_earned?: number
          staff_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_active_marketplace_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "membership_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_favorites: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          offer_id: string | null
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          offer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "v_active_marketplace_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_billing_updates: boolean
          email_product_updates: boolean
          email_support_updates: boolean
          in_app_billing_updates: boolean
          in_app_product_updates: boolean
          in_app_support_updates: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_billing_updates?: boolean
          email_product_updates?: boolean
          email_support_updates?: boolean
          in_app_billing_updates?: boolean
          in_app_product_updates?: boolean
          in_app_support_updates?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_billing_updates?: boolean
          email_product_updates?: boolean
          email_support_updates?: boolean
          in_app_billing_updates?: boolean
          in_app_product_updates?: boolean
          in_app_support_updates?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_active_marketplace_businesses: {
        Row: {
          active_offers_count: number | null
          category_icon: string | null
          category_name: string | null
          category_slug: string | null
          city: string | null
          cover_image_url: string | null
          description: string | null
          google_business_url: string | null
          id: string | null
          name: string | null
          profile_image_url: string | null
          region: string | null
          slug: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_and_award_badges: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      create_membership_card: { Args: { p_user_id: string }; Returns: string }
      current_user_has_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      ensure_profile_for_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      generate_business_slug: { Args: { p_name: string }; Returns: string }
      generate_unique_public_id: { Args: never; Returns: string }
      get_admin_dashboard_stats: { Args: never; Returns: Json }
      get_business_dashboard_stats: {
        Args: { p_business_id: string }
        Returns: Json
      }
      get_marketplace_offers: {
        Args: {
          p_category_slug?: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_user_id?: string
        }
        Returns: {
          business_category_name: string
          business_id: string
          business_name: string
          business_profile_image: string
          business_slug: string
          description: string
          discount_value: number
          expires_at: string
          image_url: string
          is_favorited: boolean
          offer_id: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          requires_paid_membership: boolean
          starts_at: string
          title: string
        }[]
      }
      get_user_rewards_summary: { Args: { p_user_id: string }; Returns: Json }
      is_business_owner: { Args: { p_business_id: string }; Returns: boolean }
      is_business_staff_member: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      lookup_member: { Args: { p_identifier: string }; Returns: Json }
      owns_support_ticket: { Args: { p_ticket_id: string }; Returns: boolean }
      record_transaction: {
        Args: {
          p_amount_spent: number
          p_business_id: string
          p_identification_method: Database["public"]["Enums"]["identification_method"]
          p_notes?: string
          p_offer_id?: string
          p_user_public_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      card_status:
        | "pending_production"
        | "printed"
        | "shipped"
        | "active"
        | "replaced"
        | "disabled"
      identification_method: "qr_scan" | "barcode_scan" | "manual_entry" | "nfc"
      offer_status: "draft" | "active" | "paused" | "expired" | "archived"
      offer_type:
        | "percentage_discount"
        | "fixed_discount"
        | "free_item"
        | "buy_one_get_one"
        | "custom"
      reward_entry_type: "earned" | "redeemed" | "expired" | "adjustment"
      subscription_status:
        | "none"
        | "active"
        | "past_due"
        | "paused"
        | "cancelled"
        | "expired"
      ticket_priority: "low" | "medium" | "high"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      user_role: "end_user" | "business" | "admin"
      user_subscription_plan: "free" | "paid"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      card_status: [
        "pending_production",
        "printed",
        "shipped",
        "active",
        "replaced",
        "disabled",
      ],
      identification_method: ["qr_scan", "barcode_scan", "manual_entry", "nfc"],
      offer_status: ["draft", "active", "paused", "expired", "archived"],
      offer_type: [
        "percentage_discount",
        "fixed_discount",
        "free_item",
        "buy_one_get_one",
        "custom",
      ],
      reward_entry_type: ["earned", "redeemed", "expired", "adjustment"],
      subscription_status: [
        "none",
        "active",
        "past_due",
        "paused",
        "cancelled",
        "expired",
      ],
      ticket_priority: ["low", "medium", "high"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      user_role: ["end_user", "business", "admin"],
      user_subscription_plan: ["free", "paid"],
    },
  },
} as const

