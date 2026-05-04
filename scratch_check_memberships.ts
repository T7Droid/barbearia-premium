import { supabaseAdmin } from './src/lib/supabase';
import * as dotenv from 'dotenv';
dotenv.config();

async function check() {
  if (!supabaseAdmin) {
    console.error('Supabase Admin is not configured.');
    return;
  }
  const { data, error } = await supabaseAdmin
    .from('tenant_memberships')
    .select('tenant_id, role')
    .eq('user_id', 'e77ce333-769a-4f8b-a406-49c40042e4de');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

check();
