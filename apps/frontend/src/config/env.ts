export const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || 'http://localhost:3000');
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tbzxajiiiaxwbnaorgyw.supabase.co';
