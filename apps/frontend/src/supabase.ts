import { createClient } from '@supabase/supabase-js';

const isProd = import.meta.env.PROD;
const supabaseUrl = isProd 
  ? 'https://tbzxajiiiaxwbnaorgyw.supabase.co' 
  : (import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321');
const supabaseAnonKey = isProd 
  ? 'sb_publishable_HYzGh9cHkZvSE87ZoqUA1A_mXEC4vqh' 
  : (import.meta.env.VITE_SUPABASE_ANON_KEY || 'dummy');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
