import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Cliente do Supabase no navegador. Usa APENAS a chave pública (anon).
 * A service role key nunca pode aparecer no frontend.
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
