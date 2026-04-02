/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL?: string
  readonly VITE_GOOGLE_OAUTH_ENABLED?: string
  readonly VITE_LEMON_BILLING_PORTAL_URL?: string
  readonly VITE_LEMON_BUSINESS_PLUS_CHECKOUT_URL?: string
  readonly VITE_LEMON_BUSINESS_PRO_CHECKOUT_URL?: string
  readonly VITE_LEMON_END_USER_PLUS_CHECKOUT_URL?: string
  readonly VITE_LEMON_END_USER_PRO_CHECKOUT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
