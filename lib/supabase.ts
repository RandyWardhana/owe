import type { SupabaseClient } from "@supabase/supabase-js";

/* The Supabase client is created lazily via a dynamic import, so the library
   (~60 kB) never lands in the initial bundle — it loads only when something
   actually needs the network (sharing a bill or opening a short link). When
   the env vars are absent, everything no-ops and the app stays local-only.
   No auth — the bill id in the link is the only key. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!hasSupabase) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(url as string, anonKey as string, {
        auth: { persistSession: false },
      }),
    );
  }
  return clientPromise;
}
