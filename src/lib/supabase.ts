import { createClient } from '@supabase/supabase-js';
import { from } from './api-client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Storage-only client — all DB queries route through the backend /api/query endpoint
const _storageClient = createClient(supabaseUrl, supabaseAnonKey);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = {
  from,
  storage: _storageClient.storage,
};
