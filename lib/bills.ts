import { supabase } from "./supabase";

const TABLE = "bills";

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

export async function fetchPaid(id: string): Promise<number[] | null> {
  if (!supabase || !isOnline()) return null;
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("paid")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return Array.isArray(data.paid) ? (data.paid as number[]) : [];
  } catch {
    return null;
  }
}

export async function savePaid(id: string, paid: number[]): Promise<void> {
  if (!supabase || !isOnline()) return;
  try {
    await supabase
      .from(TABLE)
      .upsert({ id, paid, updated_at: new Date().toISOString() });
  } catch {
  }
}

export function subscribePaid(
  id: string,
  onChange: (paid: number[]) => void,
): () => void {
  const client = supabase;
  if (!client) return () => {};
  try {
    const channel = client
      .channel(`bill:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `id=eq.${id}` },
        (payload) => {
          const row = payload.new as { paid?: number[] } | null;
          if (row && Array.isArray(row.paid)) onChange(row.paid);
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  } catch {
    return () => {};
  }
}
