/* Client-side flag only — all Supabase access now goes through the server
   (/api/bill, /api/sync), so the browser never talks to Supabase directly.
   The NEXT_PUBLIC vars stay only to tell the UI whether cloud features are
   available; no Supabase request is ever made from here. */
export const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
