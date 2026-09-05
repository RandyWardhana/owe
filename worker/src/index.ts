export interface Env {
  DB: D1Database;
  OWE_API_SECRET: string;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function authorized(req: Request, env: Env): boolean {
  const provided = req.headers.get("x-owe-secret") ?? "";
  const expected = env.OWE_API_SECRET ?? "";
  if (!expected || provided.length !== expected.length) return false;

  let differing = 0;
  for (let i = 0; i < expected.length; i += 1) {
    differing |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return differing === 0;
}

function parsePaid(raw: unknown): number[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
  } catch {
    return [];
  }
}

async function getBill(env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT data, paid FROM bills WHERE id = ?")
    .bind(id)
    .first<{ data: string | null; paid: string }>();

  if (!row) return json({ data: null, paid: [] });
  return json({ data: row.data ?? null, paid: parsePaid(row.paid) });
}

async function putBill(env: Env, body: Record<string, unknown>): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return json({ ok: false }, 400);

  const hasData = typeof body.data === "string";
  const hasPaid = Array.isArray(body.paid);
  const now = new Date().toISOString();

  // COALESCE so a paid-only write keeps the bill, and a data-only write keeps
  // whoever has already settled. The old upsert sent whole rows and could blank
  // a column that simply was not in this request.
  await env.DB.prepare(
    `INSERT INTO bills (id, data, paid, updated_at)
     VALUES (?1, ?2, COALESCE(?3, '[]'), ?4)
     ON CONFLICT(id) DO UPDATE SET
       data       = COALESCE(excluded.data, bills.data),
       paid       = COALESCE(?3, bills.paid),
       updated_at = excluded.updated_at`,
  )
    .bind(
      id,
      hasData ? (body.data as string) : null,
      hasPaid ? JSON.stringify(body.paid) : null,
      now,
    )
    .run();

  return json({ ok: true });
}

async function getUserBills(env: Env, key: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT data FROM user_bills WHERE key = ?")
    .bind(key)
    .first<{ data: string | null }>();

  return json({ data: row?.data ?? null });
}

async function putUserBills(env: Env, body: Record<string, unknown>): Promise<Response> {
  const key = typeof body.key === "string" ? body.key : "";
  const data = typeof body.data === "string" ? body.data : "";
  if (!key || !data) return json({ ok: false }, 400);

  await env.DB.prepare(
    `INSERT INTO user_bills (key, data, updated_at)
     VALUES (?1, ?2, ?3)
     ON CONFLICT(key) DO UPDATE SET
       data       = excluded.data,
       updated_at = excluded.updated_at`,
  )
    .bind(key, data, new Date().toISOString())
    .run();

  return json({ ok: true });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (!authorized(req, env)) return json({ error: "unauthorized" }, 401);

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, "");

    try {
      if (req.method === "GET" && path === "/bill") {
        const id = url.searchParams.get("id");
        return id ? await getBill(env, id) : json({ data: null, paid: [] });
      }

      if (req.method === "POST" && path === "/bill") {
        return await putBill(env, await req.json());
      }

      if (req.method === "GET" && path === "/sync") {
        const key = url.searchParams.get("key");
        return key ? await getUserBills(env, key) : json({ data: null });
      }

      if (req.method === "POST" && path === "/sync") {
        return await putUserBills(env, await req.json());
      }

      return json({ error: "not found" }, 404);
    } catch {
      return json({ ok: false, error: "server error" }, 500);
    }
  },
};
