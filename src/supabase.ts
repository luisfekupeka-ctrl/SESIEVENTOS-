import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Auto-fix if user only provided the project ref (e.g. "abcde...") instead of the full URL
const supabaseUrl = rawUrl.includes('.') 
  ? (rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`)
  : (rawUrl ? `https://${rawUrl}.supabase.co` : 'https://placeholder.supabase.co');

if (!rawUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are missing. Some features may not work.');
} else {
  console.log('[Supabase] Initializing with URL:', supabaseUrl);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
