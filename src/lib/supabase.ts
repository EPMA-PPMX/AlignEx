import { createClient } from '@supabase/supabase-js';
import { from } from './api-client';

//const supabaseAnonKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoYmFydnhpbHFubndqbWRxeG9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njk3NDMsImV4cCI6MjA3NzI0NTc0M30.ZXgtWx6qRZ4UChWxlf6CRODlEUTki5p-EGmTpsBfX1Q"
//const supabaseUrl = "https://qhbarvxilqnnwjmdqxog.supabase.co"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;


// Storage-only client — all DB queries route through the backend /api/query endpoint
const _storageClient = createClient(supabaseUrl, supabaseAnonKey);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = {
  from,
  storage: _storageClient.storage,
};

// This is updated code
