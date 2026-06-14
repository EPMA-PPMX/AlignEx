/**
 * Exports `supabase` — the real Supabase JS client when no backend API URL is
 * configured (local dev / Bolt preview), or the apiClient proxy when
 * VITE_API_URL is set (production Azure deployment).
 */
import { createClient } from '@supabase/supabase-js';
import { apiClient } from './apiClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const apiUrl = (import.meta.env.VITE_API_URL as string) || '';

export const supabase = apiUrl
  ? (apiClient as unknown as ReturnType<typeof createClient>)
  : createClient(supabaseUrl, supabaseAnonKey);
