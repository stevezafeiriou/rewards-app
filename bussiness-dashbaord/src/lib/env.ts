const env = import.meta.env

const lemonCheckoutUrls = {
  business_plus: env.VITE_LEMON_BUSINESS_PLUS_CHECKOUT_URL,
  business_pro: env.VITE_LEMON_BUSINESS_PRO_CHECKOUT_URL,
  end_user_plus: env.VITE_LEMON_END_USER_PLUS_CHECKOUT_URL,
  end_user_pro: env.VITE_LEMON_END_USER_PRO_CHECKOUT_URL,
} as const

export const appEnv = {
  supabaseUrl: env.VITE_SUPABASE_URL,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
  appUrl: env.VITE_APP_URL ?? 'http://127.0.0.1:3001',
  googleOAuthEnabled: env.VITE_GOOGLE_OAUTH_ENABLED === 'true',
  lemonBillingPortalUrl: env.VITE_LEMON_BILLING_PORTAL_URL ?? 'https://billing.nostalgie.world',
  lemonCheckoutUrls,
} as const

export function getLemonCheckoutUrl(planCode: string, fallback?: string | null) {
  return lemonCheckoutUrls[planCode as keyof typeof lemonCheckoutUrls] ?? fallback ?? null
}

export function assertEnv() {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.')
  }
}
