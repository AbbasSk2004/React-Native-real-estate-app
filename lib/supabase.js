import { createClient } from '@supabase/supabase-js';
import getEnvVars from '../env';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnvVars();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
  }
}); 