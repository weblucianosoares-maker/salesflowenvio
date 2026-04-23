import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function run() {
  console.log('--- Checking Columns in "leads" ---');
  try {
    const { data: d1, error: e1 } = await supabase.from('leads').select('*').limit(1);
    if (e1) console.error('Error fetching leads:', e1);
    if (d1 && d1.length > 0) {
      console.log('Columns in leads:', Object.keys(d1[0]));
    } else {
      console.log('leads table is empty');
    }
  } catch (e) { console.error(e); }

  console.log('--- Checking if other tables exist ---');
  const tables = ['leads_data', 'contatos', 'contacts', 'empresas', 'companies'];
  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (!error) {
        console.log(`Table "${t}" exists! Columns:`, Object.keys(data?.[0] || {}));
      }
    } catch (e) {}
  }
}

run();
