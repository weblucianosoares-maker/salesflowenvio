
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCNPJ(cnpj: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('cnpj', cnpj);

  if (error) {
    console.error('Error querying Supabase:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log(`CNPJ ${cnpj} FOUND in the database.`);
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log(`CNPJ ${cnpj} NOT FOUND in the database.`);
  }
}

checkCNPJ('60021483000132');
