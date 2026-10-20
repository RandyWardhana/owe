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
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function isSyncKey(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function parsePaid(raw: unknown): number[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "number") : [];
  } catch {
    return [];
  }
}

/* Stored as itemId -> person indexes. Older rows hold a bare number, read as a
   one-person set. */
function parseClaims(raw: string | null): Record<string, number[]> {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const isPersonIndex = (value: unknown): value is number =>
      typeof value === "number" && Number.isInteger(value) && value >= 0;

    const out: Record<string, number[]> = {};
    for (const [item, who] of Object.entries(parsed)) {
      const list = Array.isArray(who) ? who.filter(isPersonIndex) : isPersonIndex(who) ? [who] : [];
      const unique = [...new Set(list)].sort((a, b) => a - b);
      if (unique.length) out[item] = unique;
    }
    return out;
  } catch {
    return {};
  }
}

async function getBill(env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT data, paid, claims FROM bills WHERE id = ?")
    .bind(id)
    .first<{ data: string | null; paid: string; claims: string | null }>();

  if (!row) return json({ data: null, paid: [], claims: {} });
  return json({
    data: row.data ?? null,
    paid: parsePaid(row.paid),
    claims: parseClaims(row.claims),
  });
}

/* Not owner-gated: people claim items from the shared link, and claiming only adds
   to your own share, which the maker can undo. One person per request, a toggle
   rather than a replace, so concurrent claims cannot overwrite each other. */
async function putClaim(env: Env, body: Record<string, unknown>): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  const item = typeof body.item === "string" ? body.item.slice(0, 64) : "";
  if (!id || !item) return json({ ok: false }, 400);

  const person =
    typeof body.person === "number" && Number.isInteger(body.person) && body.person >= 0
      ? body.person
      : null;
  // `on` absent adds the person, false removes them; a null person clears the item.
  const on = body.on === undefined ? true : Boolean(body.on);

  const row = await env.DB.prepare("SELECT paid, claims FROM bills WHERE id = ?")
    .bind(id)
    .first<{ paid: string; claims: string | null }>();
  if (!row) return json({ ok: false, error: "no such bill" }, 404);

  const claims = parseClaims(row.claims);
  const settled = parsePaid(row.paid);
  const holders = claims[item] ?? [];

  // A confirmed payer freezes the item: re-splitting would change an amount already paid.
  if (holders.some((who) => settled.includes(who))) {
    return json({ ok: false, error: "already settled", claims }, 409);
  }

  if (person === null) {
    delete claims[item];
  } else {
    const next = on
      ? [...new Set([...holders, person])].sort((a, b) => a - b)
      : holders.filter((who) => who !== person);
    if (next.length) claims[item] = next;
    else delete claims[item];
  }

  await env.DB.prepare("UPDATE bills SET claims = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(claims), new Date().toISOString(), id)
    .run();

  return json({ ok: true, claims });
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

  // Only the creating device may change `paid`. Bills without an owner predate
  // ownership and stay open so old links keep working. Ownership is claimed once,
  // by the write that creates the row.
  const presented = ownerToken ? await sha256Hex(ownerToken) : "";
  if (Array.isArray(body.paid) && ownerHash && presented !== ownerHash) {
    return json({ ok: false, error: "not the owner" }, 403);
  }

  const claiming =
    !current && typeof body.owner_hash === "string" && body.owner_hash
      ? (body.owner_hash as string)
      : null;

  const isOwner = Boolean(claiming) || (Boolean(ownerHash) && presented === ownerHash);
  const syncKey = isOwner && isSyncKey(body.sync_key) ? body.sync_key : null;

  const hasData = typeof body.data === "string";
  const hasPaid = Array.isArray(body.paid);
  const now = new Date().toISOString();
  const data = hasData ? (body.data as string) : null;
  const paid = hasPaid ? JSON.stringify(body.paid) : null;

  // COALESCE so a paid-only write keeps the bill and a data-only write keeps `paid`.
  try {
    await env.DB.prepare(
      `INSERT INTO bills (id, data, paid, updated_at, owner_hash, sync_key)
       VALUES (?1, ?2, COALESCE(?3, '[]'), ?4, ?5, ?6)
       ON CONFLICT(id) DO UPDATE SET
         data       = COALESCE(excluded.data, bills.data),
         paid       = COALESCE(?3, bills.paid),
         updated_at = excluded.updated_at,
         owner_hash = COALESCE(bills.owner_hash, excluded.owner_hash),
         sync_key   = COALESCE(?6, bills.sync_key)`,
    )
      .bind(id, data, paid, now, claiming, syncKey)
      .run();
  } catch {
    await env.DB.prepare(
      `INSERT INTO bills (id, data, paid, updated_at, owner_hash)
       VALUES (?1, ?2, COALESCE(?3, '[]'), ?4, ?5)
       ON CONFLICT(id) DO UPDATE SET
         data       = COALESCE(excluded.data, bills.data),
         paid       = COALESCE(?3, bills.paid),
         updated_at = excluded.updated_at,
         owner_hash = COALESCE(bills.owner_hash, excluded.owner_hash)`,
    )
      .bind(id, data, paid, now, claiming)
      .run();
  }

  return json({ ok: true });
}

/* Owner only: the share link is public, so anyone could otherwise erase a split
   they merely received. */
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

  return json({ ok: true, ...(await eraseBill(env, id)) });
}

/* R2 objects go before the rows: an orphaned object is invisible, while an
   orphaned row can still be cleaned up by the next delete. */
async function eraseBill(env: Env, id: string): Promise<{ proofs: number; files: number }> {
  const { results } = await env.DB.prepare("SELECT r2_key FROM proofs WHERE bill_id = ?")
    .bind(id)
    .all<{ r2_key: string }>();

  const keys = new Set((results ?? []).map((row) => row.r2_key));
  let cursor: string | undefined;
  do {
    const page = await env.PROOFS.list({ prefix: `${id}/`, cursor });
    page.objects.forEach((object) => keys.add(object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  if (keys.size) await env.PROOFS.delete([...keys]);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM proofs WHERE bill_id = ?").bind(id),
    env.DB.prepare("DELETE FROM bills WHERE id = ?").bind(id),
  ]);

  return { proofs: (results ?? []).length, files: keys.size };
}

async function getUserBills(env: Env, key: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT data FROM user_bills WHERE key = ?")
    .bind(key)
    .first<{ data: string | null }>();

  return json({ data: row?.data ?? null });
}

async function linkOwnedBills(env: Env, key: string, value: unknown): Promise<void> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const pairs = Object.entries(value as Record<string, unknown>)
    .filter(
      (pair): pair is [string, string] =>
        pair[0].length > 0 && pair[0].length <= 64 && typeof pair[1] === "string" && pair[1].length > 0,
    )
    .slice(0, 1000);
  if (!pairs.length) return;
  const statements = await Promise.all(
    pairs.map(async ([id, token]) =>
      env.DB.prepare(
        "UPDATE bills SET sync_key = ?1 WHERE id = ?2 AND owner_hash = ?3 AND sync_key IS NOT ?1",
      ).bind(key, id, await sha256Hex(token)),
    ),
  );
  try {
    await env.DB.batch(statements);
  } catch {
    /* sync_key not migrated yet */
  }
}

function billIdsOf(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value
    .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 64)
    .slice(0, 1000);
  return [...new Set(ids)];
}

async function putUserBills(env: Env, body: Record<string, unknown>): Promise<Response> {
  const key = typeof body.key === "string" ? body.key : "";
  const data = typeof body.data === "string" ? body.data : "";
  if (!key || !data) return json({ ok: false }, 400);
  const now = new Date().toISOString();
  const billIds = billIdsOf(body.bills);

  try {
    await env.DB.prepare(
      `INSERT INTO user_bills (key, data, updated_at, bill_ids)
       VALUES (?1, ?2, ?3, COALESCE(?4, '[]'))
       ON CONFLICT(key) DO UPDATE SET
         data       = excluded.data,
         updated_at = excluded.updated_at,
         bill_ids   = COALESCE(?4, user_bills.bill_ids)`,
    )
      .bind(key, data, now, billIds ? JSON.stringify(billIds) : null)
      .run();
  } catch {
    await env.DB.prepare(
      `INSERT INTO user_bills (key, data, updated_at)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET
         data       = excluded.data,
         updated_at = excluded.updated_at`,
    )
      .bind(key, data, now)
      .run();
  }

  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 40) || null;
    try {
      await env.DB.prepare("UPDATE user_bills SET name = ? WHERE key = ?").bind(name, key).run();
    } catch {
      /* name not migrated yet */
    }
  }

  if (isSyncKey(key)) await linkOwnedBills(env, key, body.owned);

  return json({ ok: true });
}

/* Cosmetic: proofs are found by their (bill_id, person_index) row, never by this
   path, so a rename cannot orphan an object. Anything outside a-z0-9 becomes a
   dash, so a name cannot add a slash, `..` or whitespace to the key. */
function nameSegment(raw: string, index: number): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug ? `${index}-${slug}` : String(index);
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

  // Key is billId/person/uuid. The person segment keeps the bucket browsable; the
  // uuid must stay, because bill ids are predictable and a proof is a banking screenshot.
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
    proofs: (results ?? []).map((row) => ({
      index: row.person_index,
      uploadedAt: row.uploaded_at,
    })),
  });
}

async function getProof(env: Env, url: URL): Promise<Response> {
  const billId = url.searchParams.get("id") ?? "";
  const index = Number(url.searchParams.get("i"));
  if (!billId || !Number.isInteger(index)) return json({ error: "bad request" }, 400);

  // Readable by any share-link holder on purpose: settling up is a group matter and
  // the link already guards the bill. The uuid in the object key guards the file,
  // since bill ids are guessable.
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

/* Until the line is marked paid, any link holder may remove a proof (the same trust
   as uploading). After that it is the receipt for a settled debt, so only the owner can. */
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

/* Admin routes use the same shared secret and are reachable only through owe's
   password-gated /admin. Device backups are encrypted with the sync code, which the
   server never sees, so they can be listed but not read. */
async function adminBills(env: Env): Promise<Response> {
  const query = (syncKey: string) =>
    env.DB.prepare(
      `SELECT b.id, b.data, b.paid, b.updated_at,
              b.claims,
              b.owner_hash IS NOT NULL AS owned,${syncKey}
              (SELECT COUNT(*) FROM proofs p WHERE p.bill_id = b.id) AS proofs
         FROM bills b ORDER BY b.updated_at DESC LIMIT 500`,
    ).all();
  try {
    const { results } = await query(" b.sync_key,");
    return json({ bills: results ?? [] });
  } catch {
    const { results } = await query("");
    return json({ bills: results ?? [] });
  }
}

async function adminBackups(env: Env): Promise<Response> {
  const columns = ["bill_ids, name", "bill_ids", ""];
  for (const extra of columns) {
    try {
      const { results } = await env.DB.prepare(
        `SELECT key, length(data) AS size, updated_at${extra ? `, ${extra}` : ""}
           FROM user_bills ORDER BY updated_at DESC LIMIT 500`,
      ).all();
      return json({ backups: results ?? [], indexed: extra !== "" });
    } catch {
      /* fall back to the columns this database has */
    }
  }
  return json({ backups: [], indexed: false });
}

async function adminBackup(env: Env, key: string): Promise<Response> {
  const row = await env.DB.prepare("SELECT data, updated_at FROM user_bills WHERE key = ?")
    .bind(key)
    .first<{ data: string; updated_at: string }>();
  return json({ backup: row ?? null });
}

async function adminIndexBackup(env: Env, key: string, body: Record<string, unknown>): Promise<Response> {
  const billIds = billIdsOf(body.bills);
  if (!key || !billIds) return json({ ok: false }, 400);
  const { meta } = await env.DB.prepare("UPDATE user_bills SET bill_ids = ? WHERE key = ?")
    .bind(JSON.stringify(billIds), key)
    .run();
  return json({ ok: true, changed: meta?.changes ?? 0 });
}

async function adminDeleteBackup(env: Env, key: string): Promise<Response> {
  if (!key) return json({ ok: false }, 400);
  const { meta } = await env.DB.prepare("DELETE FROM user_bills WHERE key = ?").bind(key).run();
  return json({ ok: true, changed: meta?.changes ?? 0 });
}

async function adminBill(env: Env, id: string): Promise<Response> {
  if (!id) return json({ bill: null }, 400);
  const read = (syncKey: string) =>
    env.DB.prepare(
      `SELECT id, data, paid, claims, updated_at, owner_hash IS NOT NULL AS owned${syncKey}
         FROM bills WHERE id = ?`,
    )
      .bind(id)
      .first();
  const bill = await read(", sync_key").catch(() => read(""));
  if (!bill) return json({ bill: null });
  const { results } = await env.DB.prepare(
    `SELECT person_index, r2_key, content_type, size, uploaded_at
       FROM proofs WHERE bill_id = ? ORDER BY person_index`,
  )
    .bind(id)
    .all();
  return json({ bill, proofs: results ?? [] });
}

async function adminSetOwner(env: Env, id: string, body: Record<string, unknown>): Promise<Response> {
  const ownerHash = typeof body.owner_hash === "string" ? body.owner_hash : "";
  if (!id || !/^[0-9a-f]{64}$/.test(ownerHash)) return json({ ok: false }, 400);
  if (isSyncKey(body.sync_key)) {
    try {
      const { meta } = await env.DB.prepare("UPDATE bills SET owner_hash = ?, sync_key = ? WHERE id = ?")
        .bind(ownerHash, body.sync_key, id)
        .run();
      return json({ ok: true, changed: meta?.changes ?? 0 });
    } catch {
      /* sync_key not migrated yet */
    }
  }
  const { meta } = await env.DB.prepare("UPDATE bills SET owner_hash = ? WHERE id = ?")
    .bind(ownerHash, id)
    .run();
  return json({ ok: true, changed: meta?.changes ?? 0 });
}

async function adminDeleteBill(env: Env, id: string): Promise<Response> {
  if (!id) return json({ ok: false }, 400);
  const bill = await env.DB.prepare("SELECT id FROM bills WHERE id = ?").bind(id).first();
  if (!bill) return json({ ok: true, alreadyGone: true, proofs: 0, files: 0 });
  return json({ ok: true, ...(await eraseBill(env, id)) });
}

async function adminObjects(env: Env, prefix: string): Promise<Response> {
  const objects: { key: string; size: number; uploaded: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.PROOFS.list({ prefix: prefix || undefined, cursor, limit: 1000 });
    page.objects.forEach((object) =>
      objects.push({ key: object.key, size: object.size, uploaded: object.uploaded.toISOString() }),
    );
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  const { results } = await env.DB.prepare(
    "SELECT r2_key, bill_id, person_index, content_type FROM proofs",
  ).all<{ r2_key: string; bill_id: string; person_index: number; content_type: string }>();
  const referenced = new Map((results ?? []).map((proof) => [proof.r2_key, proof]));

  return json({
    objects: objects.map((object) => {
      const row = referenced.get(object.key);
      return {
        ...object,
        orphan: !row,
        bill_id: row?.bill_id ?? null,
        person_index: row?.person_index ?? null,
        content_type: row?.content_type ?? null,
      };
    }),
  });
}

async function adminGetObject(env: Env, key: string): Promise<Response> {
  if (!key) return json({ error: "bad request" }, 400);
  const object = await env.PROOFS.get(key);
  if (!object) return json({ error: "not found" }, 404);
  return new Response(object.body, {
    headers: {
      "content-type": object.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, max-age=300",
    },
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
        return id ? await getBill(env, id) : json({ data: null, paid: [], claims: {} });
      }

      if (req.method === "POST" && path === "/claim") {
        return await putClaim(env, await req.json());
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
        if (req.method === "POST" && path === "/admin/backup-bills") {
          return await adminIndexBackup(env, url.searchParams.get("key") ?? "", await req.json());
        }
        if (req.method === "GET" && path === "/admin/objects") {
          return await adminObjects(env, url.searchParams.get("prefix") ?? "");
        }
        if (req.method === "GET" && path === "/admin/bill") {
          return await adminBill(env, url.searchParams.get("id") ?? "");
        }
        if (req.method === "POST" && path === "/admin/owner") {
          return await adminSetOwner(env, url.searchParams.get("id") ?? "", await req.json());
        }
        if (req.method === "GET" && path === "/admin/object") {
          return await adminGetObject(env, url.searchParams.get("key") ?? "");
        }
        if (req.method === "DELETE" && path === "/admin/backup") {
          return await adminDeleteBackup(env, url.searchParams.get("key") ?? "");
        }
        if (req.method === "DELETE" && path === "/admin/bill") {
          return await adminDeleteBill(env, url.searchParams.get("id") ?? "");
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
