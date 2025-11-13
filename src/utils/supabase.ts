import { createClient } from '@supabase/supabase-js';
import { env } from './env';

if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
  throw new Error('Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_KEY environment variables.');
}

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);