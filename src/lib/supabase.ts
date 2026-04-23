import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'ERRO: Credenciais do Supabase não encontradas! ' +
    'Certifique-se de configurar VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env (local) ' +
    'ou nas configurações de ambiente (Vercel).'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

