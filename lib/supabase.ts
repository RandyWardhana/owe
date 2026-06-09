import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = hasSupabase
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: false },
    })
  : null;
