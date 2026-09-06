export interface Env {
  DB: D1Database;
  PROOFS: R2Bucket;
  OWE_API_SECRET: string;
}

const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const PROOF_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

const PROOF_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * The name segment of a proof's key.
 *
 * Cosmetic only: what identifies a proof is the (bill_id, person_index) row in
 * D1, which holds the real key. That is what makes it safe to put a name here
 * at all — someone renaming themselves on a later share does not orphan an
 * existing object, because nothing looks proofs up by this path.
 *
 * Everything outside a-z0-9 collapses to a dash, so a name cannot introduce a
 * slash, walk up a directory, or smuggle whitespace into the key.
 */
function nameSegment(raw: string, index: number): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug ? `${index}-${slug}` : String(index);
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

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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

async function putBill(
  env: Env,
  body: Record<string, unknown>,
  ownerToken: string,
): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return json({ ok: false }, 400);

  const current = await env.DB.prepare("SELECT owner_hash FROM bills WHERE id = ?")
    .bind(id)
    .first<{ owner_hash: string | null }>();
  const ownerHash = current?.owner_hash ?? null;

  // Only the creating device may change who has paid. A bill with no owner is
  // one created before ownership existed; it stays open so old links keep
  // working. Ownership is claimed once, on the write that creates the row.
  if (Array.isArray(body.paid) && ownerHash) {
    const presented = ownerToken ? await sha256Hex(ownerToken) : "";
    if (presented !== ownerHash) return json({ ok: false, error: "not the owner" }, 403);
  }

  const claiming =
    !current && typeof body.owner_hash === "string" && body.owner_hash
      ? (body.owner_hash as string)
      : null;

  const hasData = typeof body.data === "string";
  const hasPaid = Array.isArray(body.paid);
  const now = new Date().toISOString();

  // COALESCE so a paid-only write keeps the bill, and a data-only write keeps
  // whoever has already settled. The old upsert sent whole rows and could blank
  // a column that simply was not in this request.
  await env.DB.prepare(
    `INSERT INTO bills (id, data, paid, updated_at, owner_hash)
     VALUES (?1, ?2, COALESCE(?3, '[]'), ?4, ?5)
     ON CONFLICT(id) DO UPDATE SET
       data       = COALESCE(excluded.data, bills.data),
       paid       = COALESCE(?3, bills.paid),
       updated_at = excluded.updated_at,
       owner_hash = COALESCE(bills.owner_hash, excluded.owner_hash)`,
  )
    .bind(
      id,
      hasData ? (body.data as string) : null,
      hasPaid ? JSON.stringify(body.paid) : null,
      now,
      claiming,
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

async function putProof(env: Env, req: Request, url: URL): Promise<Response> {
  const billId = url.searchParams.get("id") ?? "";
  const index = Number(url.searchParams.get("i"));
  if (!billId || !Number.isInteger(index) || index < 0) return json({ ok: false }, 400);

  const type = req.headers.get("content-type") ?? "";
  if (!PROOF_TYPES.has(type)) return json({ ok: false, error: "unsupported type" }, 415);

  const body = await req.arrayBuffer();
  if (!body.byteLength) return json({ ok: false, error: "empty" }, 400);
  if (body.byteLength > MAX_PROOF_BYTES) return json({ ok: false, error: "too large" }, 413);

  // billId / person / file. The person segment makes the bucket browsable --
  // with opaque folders, nobody can tell whose receipt is whose. The filename
  // stays a uuid: a proof is a screenshot of someone's banking app, and the
  // bill id is derived from the bill and therefore predictable, so a guessable
  // path would be the one weak link in front of the object.
  const person = nameSegment(url.searchParams.get("name") ?? "", index);
  const key = `${billId}/${person}/${crypto.randomUUID()}.${PROOF_EXT[type] ?? "bin"}`;
  await env.PROOFS.put(key, body, { httpMetadata: { contentType: type } });

  const previous = await env.DB.prepare(
    "SELECT r2_key FROM proofs WHERE bill_id = ? AND person_index = ?",
  )
    .bind(billId, index)
    .first<{ r2_key: string }>();

  await env.DB.prepare(
    `INSERT INTO proofs (bill_id, person_index, r2_key, content_type, size, uploaded_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(bill_id, person_index) DO UPDATE SET
       r2_key = excluded.r2_key, content_type = excluded.content_type,
       size = excluded.size, uploaded_at = excluded.uploaded_at`,
  )
    .bind(billId, index, key, type, body.byteLength, new Date().toISOString())
    .run();

  // Replacing a proof drops the old object rather than orphaning it in R2.
  if (previous?.r2_key) await env.PROOFS.delete(previous.r2_key);

  return json({ ok: true });
}

async function listProofs(env: Env, billId: string): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT person_index, uploaded_at FROM proofs WHERE bill_id = ? ORDER BY person_index",
  )
    .bind(billId)
    .all<{ person_index: number; uploaded_at: string }>();

  return json({
    proofs: (results ?? []).map((r) => ({
      index: r.person_index,
      uploadedAt: r.uploaded_at,
    })),
  });
}

async function getProof(env: Env, url: URL): Promise<Response> {
  const billId = url.searchParams.get("id") ?? "";
  const index = Number(url.searchParams.get("i"));
  if (!billId || !Number.isInteger(index)) return json({ error: "bad request" }, 400);

  // Readable by anyone holding the share link, deliberately: settling up is a
  // group conversation, and a receipt only one person can see does not settle
  // an argument about whether it was sent. The link is already the boundary for
  // the bill itself, so proofs now match it. What still guards the file is the
  // uuid in its key -- bill ids are derived from the bill and guessable, object
  // keys are not.

  const row = await env.DB.prepare(
    "SELECT r2_key, content_type FROM proofs WHERE bill_id = ? AND person_index = ?",
  )
    .bind(billId, index)
    .first<{ r2_key: string; content_type: string }>();
  if (!row) return json({ error: "not found" }, 404);

  const object = await env.PROOFS.get(row.r2_key);
  if (!object) return json({ error: "not found" }, 404);

  return new Response(object.body, {
    headers: { "content-type": row.content_type, "cache-control": "private, max-age=60" },
  });
}

/**
 * Remove a proof.
 *
 * Before the payer accepts it, whoever holds the link may take it down — the
 * same trust as uploading, and someone who attached the wrong screenshot should
 * not have to ask permission to fix it. Once the line is marked paid the proof
 * is the receipt for a settled debt, so only the bill's owner can remove it.
 */
async function deleteProof(env: Env, url: URL, ownerToken: string): Promise<Response> {
  const billId = url.searchParams.get("id") ?? "";
  const index = Number(url.searchParams.get("i"));
  if (!billId || !Number.isInteger(index) || index < 0) return json({ ok: false }, 400);

  const bill = await env.DB.prepare("SELECT paid, owner_hash FROM bills WHERE id = ?")
    .bind(billId)
    .first<{ paid: string; owner_hash: string | null }>();
  if (!bill) return json({ ok: false, error: "not found" }, 404);

  if (parsePaid(bill.paid).includes(index)) {
    const presented = ownerToken ? await sha256Hex(ownerToken) : "";
    if (!bill.owner_hash || presented !== bill.owner_hash) {
      return json({ ok: false, error: "already confirmed" }, 403);
    }
  }

  const row = await env.DB.prepare(
    "SELECT r2_key FROM proofs WHERE bill_id = ? AND person_index = ?",
  )
    .bind(billId, index)
    .first<{ r2_key: string }>();
  if (!row) return json({ ok: false, error: "not found" }, 404);

  await env.PROOFS.delete(row.r2_key);
  await env.DB.prepare("DELETE FROM proofs WHERE bill_id = ? AND person_index = ?")
    .bind(billId, index)
    .run();

  return json({ ok: true });
}

/**
 * Delete a bill and everything hanging off it.
 *
 * Owner only: the share link is public, so anyone could otherwise erase a split
 * they merely received. Removes the R2 objects before the rows, because an
 * orphaned object is invisible -- nothing references it and no listing in the
 * app will ever show it again -- whereas an orphaned row is at worst a broken
 * thumbnail that the next delete can still clean up.
 */
async function deleteBill(env: Env, url: URL, ownerToken: string): Promise<Response> {
  const id = url.searchParams.get("id") ?? "";
  if (!id) return json({ ok: false }, 400);

  const bill = await env.DB.prepare("SELECT owner_hash FROM bills WHERE id = ?")
    .bind(id)
    .first<{ owner_hash: string | null }>();
  if (!bill) return json({ ok: true, alreadyGone: true });

  const presented = ownerToken ? await sha256Hex(ownerToken) : "";
  if (!bill.owner_hash || presented !== bill.owner_hash) {
    return json({ ok: false, error: "not the owner" }, 403);
  }

  const { results } = await env.DB.prepare("SELECT r2_key FROM proofs WHERE bill_id = ?")
    .bind(id)
    .all<{ r2_key: string }>();

  for (const row of results ?? []) await env.PROOFS.delete(row.r2_key);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM proofs WHERE bill_id = ?").bind(id),
    env.DB.prepare("DELETE FROM bills WHERE id = ?").bind(id),
  ]);

  return json({ ok: true, proofs: (results ?? []).length });
}

/* ---- Admin ------------------------------------------------------------- *
 * Read-mostly views for recovering a bill someone has lost. Gated by the same
 * shared secret as everything else, and reachable only through owe's /admin
 * routes, which sit behind their own password. Nothing here can read a device
 * backup: those are encrypted with the sync code itself, which the server never
 * sees. Listing them is all that is possible.
 * ------------------------------------------------------------------------ */

async function adminBills(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    `SELECT b.id, b.data, b.paid, b.updated_at,
            b.owner_hash IS NOT NULL AS owned,
            (SELECT COUNT(*) FROM proofs p WHERE p.bill_id = b.id) AS proofs
       FROM bills b ORDER BY b.updated_at DESC LIMIT 500`,
  ).all();
  return json({ bills: results ?? [] });
}

async function adminBackups(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    "SELECT key, length(data) AS size, updated_at FROM user_bills ORDER BY updated_at DESC LIMIT 500",
  ).all();
  return json({ backups: results ?? [] });
}

async function adminBackup(env: Env, key: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT data, updated_at FROM user_bills WHERE key = ?")
    .bind(key)
    .first<{ data: string; updated_at: string }>();
  return json({ backup: row ?? null });
}

/**
 * Release an ownership claim.
 *
 * The token behind owner_hash lives in one browser's localStorage. Lose that —
 * clear site data, change domain, change phone — and the bill can never be
 * changed again by anyone, because only the hash is stored. Clearing it reopens
 * the bill so the next share re-claims it.
 */
async function adminRelease(env: Env, id: string): Promise<Response> {
  if (!id) return json({ ok: false }, 400);
  const { meta } = await env.DB.prepare(
    "UPDATE bills SET owner_hash = NULL WHERE id = ? AND owner_hash IS NOT NULL",
  )
    .bind(id)
    .run();
  return json({ ok: true, changed: meta?.changes ?? 0 });
}

async function adminObjects(env: Env, prefix: string): Promise<Response> {
  const objects: { key: string; size: number; uploaded: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.PROOFS.list({ prefix: prefix || undefined, cursor, limit: 1000 });
    page.objects.forEach((o) =>
      objects.push({ key: o.key, size: o.size, uploaded: o.uploaded.toISOString() }),
    );
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const { results } = await env.DB.prepare("SELECT r2_key FROM proofs").all<{ r2_key: string }>();
  const referenced = new Set((results ?? []).map((r) => r.r2_key));

  return json({
    objects: objects.map((o) => ({ ...o, orphan: !referenced.has(o.key) })),
  });
}

async function adminDeleteObject(env: Env, key: string): Promise<Response> {
  if (!key) return json({ ok: false }, 400);
  await env.PROOFS.delete(key);
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
        return await putBill(env, await req.json(), req.headers.get("x-owe-owner") ?? "");
      }

      if (req.method === "GET" && path === "/sync") {
        const key = url.searchParams.get("key");
        return key ? await getUserBills(env, key) : json({ data: null });
      }

      if (req.method === "POST" && path === "/sync") {
        return await putUserBills(env, await req.json());
      }

      if (req.method === "POST" && path === "/proof") {
        return await putProof(env, req, url);
      }

      if (req.method === "GET" && path === "/proof") {
        return await getProof(env, url);
      }

      if (path.startsWith("/admin/")) {
        if (req.method === "GET" && path === "/admin/bills") return await adminBills(env);
        if (req.method === "GET" && path === "/admin/backups") return await adminBackups(env);
        if (req.method === "GET" && path === "/admin/backup") {
          return await adminBackup(env, url.searchParams.get("key") ?? "");
        }
        if (req.method === "GET" && path === "/admin/objects") {
          return await adminObjects(env, url.searchParams.get("prefix") ?? "");
        }
        if (req.method === "POST" && path === "/admin/release") {
          return await adminRelease(env, url.searchParams.get("id") ?? "");
        }
        if (req.method === "DELETE" && path === "/admin/object") {
          return await adminDeleteObject(env, url.searchParams.get("key") ?? "");
        }
        return json({ error: "not found" }, 404);
      }

      if (req.method === "DELETE" && path === "/bill") {
        return await deleteBill(env, url, req.headers.get("x-owe-owner") ?? "");
      }

      if (req.method === "DELETE" && path === "/proof") {
        return await deleteProof(env, url, req.headers.get("x-owe-owner") ?? "");
      }

      if (req.method === "GET" && path === "/proofs") {
        const id = url.searchParams.get("id");
        return id ? await listProofs(env, id) : json({ proofs: [] });
      }

      return json({ error: "not found" }, 404);
    } catch {
      return json({ ok: false, error: "server error" }, 500);
    }
  },
};
