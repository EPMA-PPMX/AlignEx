/**
 * Re-exports the backend API client as `supabase` so all existing imports
 * (`import { supabase } from '../lib/supabase'`) continue to work unchanged.
 *
 * The apiClient implements the same fluent interface as the Supabase JS client
 * but routes every query through the backend /api/query endpoint instead of
 * calling Supabase PostgREST directly.
 */
export { apiClient as supabase } from './apiClient';
