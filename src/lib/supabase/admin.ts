if (typeof window !== 'undefined') {
  throw new Error('Supabase admin client cannot be imported or executed in the browser.');
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function getAdminClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Supabase admin client cannot be imported or executed in the browser.');
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
