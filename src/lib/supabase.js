import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = isSupabaseConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;

// Annunci dimostrativi: solo se VITE_SHOW_DEMO=true (mai al lancio pubblico)
export const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO === 'true';

// Annunci DI ESEMPIO dichiarati (bollino "ESEMPIO", nessun contatto, fuori dai conteggi):
// accesi di default; per spegnerli metti VITE_SHOW_EXAMPLES=false in .env.production e ripubblica.
// Si nascondono da soli dove ci sono già abbastanza annunci veri (vedi App.jsx).
export const SHOW_EXAMPLES = import.meta.env.VITE_SHOW_EXAMPLES !== 'false';
