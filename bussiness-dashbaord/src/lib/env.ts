const env = import.meta.env

export const appEnv = {
  supabaseUrl: env.VITE_SUPABASE_URL,
  supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
  appUrl: env.VITE_APP_URL ?? 'http://127.0.0.1:3001',
  googleOAuthEnabled: env.VITE_GOOGLE_OAUTH_ENABLED === 'true',
} as const

export function assertEnv() {
  if (!appEnv.supabaseUrl || !appEnv.supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables.')
  }
}
