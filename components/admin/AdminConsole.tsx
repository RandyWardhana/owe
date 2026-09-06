"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BillView } from "@/lib/adminDb";

type Tab = "bills" | "backups" | "storage";
type Backup = { key: string; size: number; updated_at: string };
type OweObject = { key: string; size: number; uploaded: string; orphan: boolean };

const money = (n: number, c: string) =>
  `${c ? c + " " : ""}${new Intl.NumberFormat("en-US").format(Math.round(n))}`;

const when = (iso: string) => (iso ? iso.replace("T", " ").slice(0, 16) : "—");

const size = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} kB`);

export default function AdminConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [gateError, setGateError] = useState("");

  const [tab, setTab] = useState<Tab>("bills");
  const [bills, setBills] = useState<BillView[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [objects, setObjects] = useState<OweObject[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [restoreCode, setRestoreCode] = useState("");
  const [lookup, setLookup] = useState("");

  const loadBills = useCallback(async () => {
    const res = await fetch("/api/admin/bills");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const body = (await res.json()) as { bills: BillView[] };
    setBills(body.bills ?? []);
    setAuthed(true);
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (authed !== true) return;
    if (tab === "backups" && !backups.length) {
      fetch("/api/admin/backups")
        .then((r) => r.json())
        .then((b) => setBackups(b.backups ?? []))
        .catch(() => undefined);
    }
    if (tab === "storage" && !objects.length) {
      fetch("/api/admin/objects")
        .then((r) => r.json())
        .then((b) => setObjects(b.objects ?? []))
        .catch(() => undefined);
    }
  }, [authed, tab, backups.length, objects.length]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      setGateError(res.status === 503 ? "Admin is not configured." : "Wrong password.");
      return;
    }
    setPassword("");
    loadBills();
  };

  const signOut = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setBills([]);
    setBackups([]);
    setObjects([]);
  };

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bills;
    return bills.filter(
      (b) =>
        b.id.toLowerCase().includes(q) ||
        b.title.toLowerCase().includes(q) ||
        b.people.some((p) => p.name.toLowerCase().includes(q)),
    );
  }, [bills, query]);

  const toggle = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setNote("");
    setError("");
    try {
      await fn();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const restore = () =>
    run(async () => {
      const res = await fetch("/api/admin/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: picked, code: restoreCode.trim() || undefined }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        code?: string;
        titles?: string[];
        kept?: number;
        error?: string;
      };
      if (!body.ok) {
        setError(body.error || "Restore failed.");
        return;
      }
      setNote(
        `Sync code ${body.code} now carries ${body.titles?.join(", ")}` +
          (body.kept ? ` alongside ${body.kept} bill(s) already in it.` : "."),
      );
      setRestoreCode(body.code ?? "");
      setBackups([]);
    });

  const release = (id: string) =>
    run(async () => {
      const res = await fetch("/api/admin/release", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const body = (await res.json()) as { ok?: boolean };
      if (!body.ok) {
        setError("Could not release that bill.");
        return;
      }
      setNote(`${id} is unclaimed — the next device to open it becomes the owner.`);
      await loadBills();
    });

  const checkCode = () =>
    run(async () => {
      const res = await fetch(`/api/admin/backups?code=${encodeURIComponent(lookup.trim())}`);
      const body = (await res.json()) as { exists: boolean; size: number; updatedAt: string | null };
      setNote(
        body.exists
          ? `That code has a backup: ${size(body.size)}, last written ${when(body.updatedAt ?? "")}.`
          : "No backup stored for that code yet.",
      );
    });

  const dropObject = (key: string) =>
    run(async () => {
      if (!window.confirm(`Delete ${key} from R2? This cannot be undone.`)) return;
      const res = await fetch(`/api/admin/objects?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      const body = (await res.json()) as { ok?: boolean };
      if (!body.ok) {
        setError("Delete failed.");
        return;
      }
      setObjects((cur) => cur.filter((o) => o.key !== key));
      setNote(`Deleted ${key}.`);
    });

  if (authed === null) {
    return (
      <div className="adm__gate">
        <span className="adm__sub">Loading…</span>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="adm__gate">
        <form onSubmit={signIn}>
          <div className="adm__title">owe · admin</div>
          <input
            className="adm__input"
            type="password"
            value={password}
            autoFocus
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="adm__btn adm__btn--go" type="submit">
            Sign in
          </button>
          {gateError ? <div className="adm__note adm__note--bad">{gateError}</div> : null}
        </form>
      </div>
    );
  }

  const orphans = objects.filter((o) => o.orphan).length;

  return (
    <div className="adm">
      <div className="adm__wrap">
        <div className="adm__head">
          <div className="adm__title">owe · admin</div>
          <button className="adm__btn" onClick={signOut}>
            Sign out
          </button>
        </div>

        <div className="adm__tabs" role="tablist">
          {(
            [
              ["bills", `Bills ${bills.length}`],
              ["backups", `Backups ${backups.length || ""}`.trim()],
              ["storage", `Storage ${objects.length || ""}`.trim()],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className="adm__tab"
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {note ? <div className="adm__note">{note}</div> : null}
        {error ? <div className="adm__note adm__note--bad">{error}</div> : null}

        {tab === "bills" ? (
          <div className="adm__panel">
            <div className="adm__bar">
              <input
                className="adm__input"
                value={query}
                placeholder="Search by title, id or person"
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="adm__btn" onClick={loadBills} disabled={busy}>
                Refresh
              </button>
            </div>

            <div className="adm__bar">
              <input
                className="adm__input adm__mono"
                value={restoreCode}
                placeholder="Sync code to restore into — blank makes a new one"
                onChange={(e) => setRestoreCode(e.target.value)}
              />
              <button
                className="adm__btn adm__btn--go"
                onClick={restore}
                disabled={busy || !picked.length}
              >
                Restore {picked.length || ""}
              </button>
            </div>

            <div className="adm__scroll">
              <table className="adm__table">
                <thead>
                  <tr>
                    <th />
                    <th>Bill</th>
                    <th>People</th>
                    <th>Total</th>
                    <th>Proofs</th>
                    <th>Owner</th>
                    <th>Updated</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={picked.includes(b.id)}
                          onChange={() => toggle(b.id)}
                          aria-label={`Select ${b.title}`}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{b.title}</div>
                        <div className="adm__sub adm__mono">{b.id}</div>
                      </td>
                      <td>
                        <div>{b.people.map((p) => p.name).join(", ") || "—"}</div>
                        {b.payer ? <div className="adm__sub">paid by {b.payer}</div> : null}
                        {b.paid.length ? (
                          <div className="adm__sub">{b.paid.length} settled</div>
                        ) : null}
                      </td>
                      <td className="adm__mono" data-label="Total">
                        {b.readable ? money(b.grandTotal, b.currency) : "—"}
                      </td>
                      <td className="adm__mono" data-label="Proofs">
                        {b.proofs || "none"}
                      </td>
                      <td data-label="Owner">
                        {b.owned ? (
                          <span className="adm__tag adm__tag--pos">claimed</span>
                        ) : (
                          <span className="adm__tag">open</span>
                        )}
                      </td>
                      <td className="adm__sub adm__mono" data-label="Updated">
                        {when(b.updatedAt)}
                      </td>
                      <td>
                        {b.owned ? (
                          <button
                            className="adm__btn adm__btn--warn"
                            onClick={() => release(b.id)}
                            disabled={busy}
                          >
                            Release
                          </button>
                        ) : null}
                        {!b.readable ? (
                          <span className="adm__tag adm__tag--warn">unreadable</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!shown.length ? (
                    <tr>
                      <td colSpan={8} className="adm__sub">
                        Nothing matches.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "backups" ? (
          <div className="adm__panel">
            <div className="adm__bar">
              <input
                className="adm__input adm__mono"
                value={lookup}
                placeholder="Check a sync code"
                onChange={(e) => setLookup(e.target.value)}
              />
              <button className="adm__btn" onClick={checkCode} disabled={busy || !lookup.trim()}>
                Check
              </button>
            </div>
            <div className="adm__sub">
              Backups are encrypted with the sync code itself, which the server never stores. The
              list shows only that one exists.
            </div>
            <div className="adm__scroll">
              <table className="adm__table">
                <thead>
                  <tr>
                    <th>Key (sha256 of the code)</th>
                    <th>Size</th>
                    <th>Last sync</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((b) => (
                    <tr key={b.key}>
                      <td className="adm__mono">{b.key}</td>
                      <td className="adm__mono" data-label="Size">{size(b.size)}</td>
                      <td className="adm__sub adm__mono" data-label="Last sync">{when(b.updated_at)}</td>
                    </tr>
                  ))}
                  {!backups.length ? (
                    <tr>
                      <td colSpan={3} className="adm__sub">
                        No backups stored.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {tab === "storage" ? (
          <div className="adm__panel">
            <div className="adm__bar">
              <button
                className="adm__btn"
                onClick={() =>
                  fetch("/api/admin/objects")
                    .then((r) => r.json())
                    .then((b) => setObjects(b.objects ?? []))
                    .catch(() => undefined)
                }
                disabled={busy}
              >
                Refresh
              </button>
              <span className="adm__sub">
                {orphans ? `${orphans} orphan(s) — no bill points at them.` : "No orphans."}
              </span>
            </div>
            <div className="adm__scroll">
              <table className="adm__table">
                <thead>
                  <tr>
                    <th>Object</th>
                    <th>Size</th>
                    <th>Uploaded</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {objects.map((o) => (
                    <tr key={o.key}>
                      <td className="adm__mono">{o.key}</td>
                      <td className="adm__mono" data-label="Size">{size(o.size)}</td>
                      <td className="adm__sub adm__mono" data-label="Uploaded">{when(o.uploaded)}</td>
                      <td>
                        {o.orphan ? (
                          <button
                            className="adm__btn adm__btn--warn"
                            onClick={() => dropObject(o.key)}
                            disabled={busy}
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="adm__tag adm__tag--pos">in use</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!objects.length ? (
                    <tr>
                      <td colSpan={4} className="adm__sub">
                        Bucket is empty.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
