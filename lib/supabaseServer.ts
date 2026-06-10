import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const serverHasSupabase = Boolean(url && key);

let client: SupabaseClient | null = null;

export function supabaseServer(): SupabaseClient | null {
  if (!serverHasSupabase) return null;
  if (!client) {
    client = createClient(url as string, key as string, {
      auth: { persistSession: false },
    });
  }
  return client;
}

export async function getBillData(id: string): Promise<string | null> {
  const c = supabaseServer();
  if (!c) return null;
  try {
    const { data, error } = await c
      .from("bills")
      .select("data")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return (data.data as string) ?? null;
  } catch {
    return null;
  }
}
