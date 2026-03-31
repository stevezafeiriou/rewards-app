import { createClient } from '@supabase/supabase-js'
import { appEnv, assertEnv } from '@/lib/env'
import type { Database } from '@/types/database.types'

assertEnv()

const rawSupabase = createClient<Database>(appEnv.supabaseUrl, appEnv.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// The bundled Database type file is partial, so we keep the client flexible at the boundary
// and enforce correctness in the feature hooks and payload construction instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = rawSupabase
