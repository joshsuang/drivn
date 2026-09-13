import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `${name} is not set in this ${import.meta.env.MODE} build. The app can't start without it — add it to your hosting provider's environment variables (or a local .env file) and rebuild.`,
    )
  }
  return value
}

// Thrown at module load on purpose: without a URL the client is useless, and a
// legible error beats a blank page. The inline hook in index.html renders it.
export const supabase: SupabaseClient = createClient(
  requireEnv('VITE_SUPABASE_URL', url),
  requireEnv('VITE_SUPABASE_ANON_KEY', anonKey),
)
