import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,   // URL do Supabase
  import.meta.env.VITE_SUPABASE_ANON_KEY // Chave pública (anon)
);
