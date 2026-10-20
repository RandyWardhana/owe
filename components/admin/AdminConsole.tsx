"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { NO_HOLDER } from "@/lib/adminConstants";
import type { AdminDevice, AdminObject, BillSummary } from "@/entities/admin";

import {
  Accounts,
  Avatar,
  Chip,
  GiveDialog,
  Gate,
  Notice,
  PhoneIcon,
  SyncId,
  knownCodes,
  rememberCode,
  ago,
  money,
  size,
  when,
} from "./ui";
import { Receipts } from "./Receipts";
import { ConsoleSkeleton, Skeleton, SkeletonRows } from "./Skeletons";
import type { AdminGroup, AdminPlace, AdminTab, CodeLookup, DeviceGroup, HolderGroup } from "@/entities/props/admin";

const UNLINKED = "unlinked";

function readUrl(): { tab: AdminTab } & AdminPlace {
  if (typeof window === "undefined") return { tab: "bills", holder: null, device: null, group: "code" };
  const params = new URLSearchParams(window.location.search);
  const tab = params.get("tab");
  return {
    tab: tab === "codes" || tab === "receipts" ? tab : "bills",
    holder: params.get("holder"),
    device: params.get("device"),
    group: params.get("group") === "holder" || params.get("holder") ? "holder" : "code",
  };
}

function writeUrl(tab: AdminTab, place: Partial<AdminPlace> = {}) {
  const params = new URLSearchParams();
  if (tab !== "bills") params.set("tab", tab);
  if (place.group === "holder") params.set("group", "holder");
  if (place.holder) params.set("holder", place.holder);
  if (place.device) params.set("device", place.device);
  const query = params.toString();
  window.history.replaceState(null, "", `/admin${query ? `?${query}` : ""}`);
}

async function fingerprint(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

const owing = (bill: BillSummary) =>
  bill.holder.key === NO_HOLDER ? bill.names.length : Math.max(bill.names.length - 1, 0);

const billHref = (id: string) => `/admin/bills/${encodeURIComponent(id)}`;

export default function AdminConsole() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tab, setTabState] = useState<AdminTab>("bills");
  const [holderKey, setHolderKey] = useState<string | null>(null);
  const [deviceKey, setDeviceKey] = useState<string | null>(null);
  const [group, setGroup] = useState<AdminGroup>("code");
  const [indexed, setIndexed] = useState(true);
  const [findCode, setFindCode] = useState("");
  const [findError, setFindError] = useState("");

  const [bills, setBills] = useState<BillSummary[]>([]);
  const [backups, setBackups] = useState<AdminDevice[] | null>(null);
  const [objects, setObjects] = useState<AdminObject[] | null>(null);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [giving, setGiving] = useState<{ id: string; title: string }[] | null>(null);

  const [code, setCode] = useState("");
  const [lookup, setLookup] = useState<CodeLookup | null>(null);
  const [looking, setLooking] = useState(false);
  const [reclaim, setReclaim] = useState<{ busy: boolean; message: string; tone: "pos" | "bad" } | null>(null);

  const [error, setError] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [droppingBackups, setDroppingBackups] = useState(false);

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/bills");
      if (res.status === 401) {
        setAuthed(false);
        return;
      }
      const body = (await res.json()) as { bills: BillSummary[] };
      setBills(body.bills ?? []);
      setAuthed(true);
    } catch {
      setError("Couldn't load bills.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadBackups = useCallback(async () => {
    const res = await fetch("/api/admin/backups");
    const body = (await res.json()) as { backups?: AdminDevice[]; indexed?: boolean };
    setBackups(body.backups ?? []);
    setIndexed(Boolean(body.indexed));
  }, []);

  const loadObjects = useCallback(async () => {
    const res = await fetch("/api/admin/objects");
    const body = (await res.json()) as { objects?: AdminObject[] };
    setObjects(body.objects ?? []);
  }, []);

  useEffect(() => {
    setCodes(knownCodes());
    const initial = readUrl();
    setTabState(initial.tab);
    setHolderKey(initial.holder);
    setDeviceKey(initial.device);
    setGroup(initial.group);
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (authed !== true) return;
    if (backups === null) loadBackups().catch(() => setBackups([]));
    if (objects === null) loadObjects().catch(() => setObjects([]));
  }, [authed, backups, objects, loadBackups, loadObjects]);

  const setTab = (next: AdminTab) => {
    setTabState(next);
    setHolderKey(null);
    setDeviceKey(null);
    setPicked([]);
    writeUrl(next, { group });
  };

  const openHolder = (key: string | null) => {
    setHolderKey(key);
    setDeviceKey(null);
    setPicked([]);
    writeUrl("bills", { group: "holder", holder: key });
  };

  const openDevice = (key: string | null) => {
    setDeviceKey(key);
    setHolderKey(null);
    setPicked([]);
    writeUrl("bills", { group: "code", device: key });
  };

  const switchGroup = (next: AdminGroup) => {
    setGroup(next);
    setHolderKey(null);
    setDeviceKey(null);
    setPicked([]);
    writeUrl("bills", { group: next });
  };

  const jumpToCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setFindError("");
    const value = findCode.trim();
    if (!value) return;
    const key = await fingerprint(value);
    if ((backups ?? []).some((backup) => backup.key === key)) {
      setCodes(rememberCode(key, value));
      setFindCode("");
      openDevice(key);
    } else {
      setFindError("No backup under that code. The phone may never have synced, or the code has a typo.");
    }
  };

  const signOut = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setAuthed(false);
    setBills([]);
    setBackups(null);
    setObjects(null);
  };

  const holders = useMemo<HolderGroup[]>(() => {
    const map = new Map<string, HolderGroup>();
    bills.forEach((bill) => {
      const group =
        map.get(bill.holder.key) ??
        ({ key: bill.holder.key, name: bill.holder.name, accounts: bill.holder.accounts, bills: [], totals: {}, last: "" } as HolderGroup);
      group.bills.push(bill);
      if (bill.readable) group.totals[bill.currency] = (group.totals[bill.currency] ?? 0) + bill.grandTotal;
      if (bill.updatedAt > group.last) group.last = bill.updatedAt;
      map.set(bill.holder.key, group);
    });
    return [...map.values()].sort((a, b) => (a.last < b.last ? 1 : -1));
  }, [bills]);

  const billById = useMemo(() => new Map(bills.map((bill) => [bill.id, bill])), [bills]);

  const devices = useMemo<DeviceGroup[]>(() => {
    const backupByKey = new Map((backups ?? []).map((backup) => [backup.key, backup]));
    const groups = new Map<string, BillSummary[]>();
    const add = (key: string, bill: BillSummary) => {
      const own = groups.get(key) ?? [];
      if (!own.includes(bill)) own.push(bill);
      groups.set(key, own);
    };
    bills.forEach((bill) => {
      if (bill.syncKey) add(bill.syncKey, bill);
    });
    (backups ?? []).forEach((backup) =>
      backup.billIds.forEach((id) => {
        const bill = billById.get(id);
        if (bill && !bill.syncKey) add(backup.key, bill);
      }),
    );
    const linked = new Set([...groups.values()].flat().map((bill) => bill.id));
    const latest = (own: BillSummary[]) =>
      own.reduce((newest, bill) => (bill.updatedAt > newest ? bill.updatedAt : newest), "");
    const list: DeviceGroup[] = [...groups.entries()]
      .map(([key, own]) => {
        const backup = backupByKey.get(key);
        return {
          key,
          updatedAt: backup?.updatedAt ?? latest(own),
          size: backup?.size ?? 0,
          bills: own,
          name: backup?.name ?? null,
        };
      })
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const rest = bills.filter((bill) => !linked.has(bill.id));
    if (rest.length) {
      list.push({ key: UNLINKED, updatedAt: latest(rest), size: 0, bills: rest, name: null });
    }
    return list;
  }, [backups, bills, billById]);

  const searchHits = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return bills.filter(
      (bill) =>
        bill.id.toLowerCase().includes(term) ||
        bill.title.toLowerCase().includes(term) ||
        bill.holder.name.toLowerCase().includes(term) ||
        bill.holder.accounts.some((account) => account.value.toLowerCase().includes(term)) ||
        bill.names.some((name) => name.toLowerCase().includes(term)),
    );
  }, [bills, query]);

  const holder = holderKey ? holders.find((holderGroup) => holderGroup.key === holderKey) ?? null : null;
  const device = deviceKey ? devices.find((deviceGroup) => deviceGroup.key === deviceKey) ?? null : null;
  const listing = !holder && !device;

  const dropBackups = async (keys: string[]) => {
    if (!keys.length) return;
    const one = keys.length === 1;
    const label = one ? (backups?.find((backup) => backup.key === keys[0])?.name ?? codes[keys[0]] ?? "this backup") : `${keys.length} backups`;
    if (
      !window.confirm(
        `Delete ${one ? `the backup for ${label}` : label} from the server? Bills stay as they are, and a phone still using ${one ? "that code" : "those codes"} uploads a fresh backup on its next sync.`,
      )
    )
      return;
    setDroppingBackups(true);
    const results = await Promise.all(
      keys.map(async (key) => {
        try {
          const res = await fetch(`/api/admin/backups?key=${encodeURIComponent(key)}`, { method: "DELETE" });
          const body = (await res.json()) as { ok?: boolean; error?: string };
          return body.ok ? { key } : { key, error: body.error ?? "Couldn't delete that backup." };
        } catch {
          return { key, error: "Couldn't delete that backup." };
        }
      }),
    );
    setDroppingBackups(false);
    const failed = results.filter((result) => "error" in result);
    if (failed.length) setError((failed[0] as { error: string }).error);
    const gone = new Set(results.filter((result) => !("error" in result)).map((result) => result.key));
    setBackups((cur) => (cur ?? []).filter((backup) => !gone.has(backup.key)));
  };

  const clearLookup = () => {
    setCode("");
    setLookup(null);
    setReclaim(null);
  };

  const runLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLooking(true);
    setLookup(null);
    setReclaim(null);
    try {
      const res = await fetch(`/api/admin/backups?code=${encodeURIComponent(code.trim())}`);
      const found = (await res.json()) as CodeLookup;
      setLookup(found);
      if (found.readable) setCodes(rememberCode(await fingerprint(code.trim()), code.trim()));
      if (found.linked) loadBackups().catch(() => undefined);
    } catch {
      setError("Lookup failed.");
    } finally {
      setLooking(false);
    }
  };

  const deleteBill = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/bills/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? "Couldn't delete that bill.");
        return false;
      }
    } catch {
      setError("Couldn't delete that bill.");
      return false;
    }
    setBills((cur) => cur.filter((bill) => bill.id !== id));
    setObjects((cur) => (cur ?? []).filter((file) => file.billId !== id));
    setPicked((cur) => cur.filter((pickedId) => pickedId !== id));
    return true;
  };

  const deleteObjects = async (keys: string[]) => {
    const results = await Promise.all(
      keys.map(async (key) => {
        const res = await fetch(`/api/admin/objects?key=${encodeURIComponent(key)}`, { method: "DELETE" });
        return ((await res.json()) as { ok?: boolean }).ok ? key : null;
      }),
    );
    const gone = new Set(results.filter((key): key is string => Boolean(key)));
    if (gone.size < keys.length) setError(`Couldn't delete ${keys.length - gone.size} file(s).`);
    setObjects((cur) => (cur ?? []).filter((file) => !gone.has(file.key)));
  };

  if (authed === null) return <ConsoleSkeleton />;

  if (!authed) return <Gate onSignedIn={loadBills} />;

  const togglePick = (id: string) =>
    setPicked((cur) => (cur.includes(id) ? cur.filter((pickedId) => pickedId !== id) : [...cur, id]));

  const deletePicked = async (list: BillSummary[]) => {
    const targets = list.filter((bill) => picked.includes(bill.id));
    if (!targets.length) return;
    const receipts = targets.reduce((total, bill) => total + bill.proofs, 0);
    const names = targets
      .slice(0, 3)
      .map((bill) => `“${bill.title}”`)
      .join(", ");
    const more = targets.length > 3 ? ` and ${targets.length - 3} more` : "";
    const files = receipts ? `, with ${receipts} receipt${receipts === 1 ? "" : "s"}` : "";
    if (
      !window.confirm(
        `Delete ${names}${more}${files}? Their share links stop working for everyone. This can't be undone.`,
      )
    )
      return;
    setBulkDeleting(true);
    const done = await Promise.all(targets.map((bill) => deleteBill(bill.id)));
    setBulkDeleting(false);
    const failed = done.filter((ok) => !ok).length;
    if (failed) setError(`Couldn't delete ${failed} of ${targets.length} bills.`);
  };

  const pickActions = (list: BillSummary[]) => {
    const count = list.filter((bill) => picked.includes(bill.id)).length;
    return (
      <div className="adm-row">
        <button
          className="adm-btn adm-btn--danger adm-btn--sm"
          disabled={!count || bulkDeleting}
          onClick={() => deletePicked(list)}
        >
          {bulkDeleting ? "Deleting…" : `Delete ${count || ""}`}
        </button>
        <button
          className="adm-btn adm-btn--primary adm-btn--sm"
          disabled={!count || bulkDeleting}
          onClick={() =>
            setGiving(
              list.filter((bill) => picked.includes(bill.id)).map((bill) => ({ id: bill.id, title: bill.title })),
            )
          }
        >
          Give {count || ""} to someone
        </button>
      </div>
    );
  };

  const billTable = (list: BillSummary[], selectable: boolean) => (
    <div className="adm-tablewrap">
      <table className="adm-table">
        <thead>
          <tr>
            {selectable ? (
              <th className="adm-table__check">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={list.length > 0 && list.every((bill) => picked.includes(bill.id))}
                  onChange={(e) => setPicked(e.target.checked ? list.map((bill) => bill.id) : [])}
                />
              </th>
            ) : null}
            <th>Bill</th>
            {selectable ? null : <th>Holder</th>}
            <th>People</th>
            <th className="adm-num">Total</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {list.map((bill) => (
            <tr key={bill.id} className="adm-table__link" onClick={() => (window.location.href = billHref(bill.id))}>
              {selectable ? (
                <td className="adm-table__check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={picked.includes(bill.id)}
                    onChange={() => togglePick(bill.id)}
                    aria-label={`Select ${bill.title}`}
                  />
                </td>
              ) : null}
              <td>
                <a className="adm-strong" href={billHref(bill.id)} onClick={(e) => e.stopPropagation()}>
                  {bill.title}
                </a>
                <div className="adm-muted adm-mono adm-small">{bill.id}</div>
              </td>
              {selectable ? null : <td>{bill.holder.name}</td>}
              <td>
                <span className="adm-clamp">{bill.names.join(", ") || "—"}</span>
              </td>
              <td className="adm-num adm-mono">{bill.readable ? money(bill.grandTotal, bill.currency) : "—"}</td>
              <td>
                <span className="adm-chips">
                  {!bill.readable ? <Chip tone="bad">unreadable</Chip> : null}
                  {bill.readable ? (
                    <Chip tone={bill.paidCount >= owing(bill) && owing(bill) > 0 ? "pos" : "neutral"}>
                      {bill.paidCount}/{owing(bill)} paid
                    </Chip>
                  ) : null}
                  {bill.proofs ? <Chip tone="accent">{bill.proofs} receipt{bill.proofs > 1 ? "s" : ""}</Chip> : null}
                  {bill.unclaimed ? <Chip tone="warn">{bill.unclaimed} unclaimed</Chip> : null}
                  {bill.owned ? null : <Chip tone="warn">no owner</Chip>}
                </span>
              </td>
              <td className="adm-muted adm-small" title={when(bill.updatedAt)}>
                {ago(bill.updatedAt)}
              </td>
            </tr>
          ))}
          {!list.length ? (
            <tr>
              <td colSpan={7} className="adm-empty">
                Nothing here.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-top__in">
          <a className="adm-brand" href="/admin">
            <span className="adm-brand__mark">owe</span>
            <span className="adm-brand__label">Admin</span>
          </a>
          <nav className="adm-tabs" role="tablist">
            {(
              [
                ["bills", "Bills", bills.length],
                ["codes", "Sync codes", backups?.length ?? null],
                ["receipts", "Receipts", objects?.length ?? null],
              ] as [AdminTab, string, number | null][]
            ).map(([key, label, count]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className="adm-tab"
                onClick={() => setTab(key)}
              >
                {label}
                {count !== null ? <span className="adm-tab__count">{count}</span> : null}
              </button>
            ))}
          </nav>
          <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="adm-main">
        {error ? (
          <Notice tone="bad">
            {error}{" "}
            <button className="adm-link" onClick={() => setError("")}>
              Dismiss
            </button>
          </Notice>
        ) : null}

        {tab === "bills" && listing ? (
          <>
            <section className="adm-hero">
              <div>
                <h1>Bills</h1>
                <p className="adm-muted">
                  {group === "code"
                    ? "Grouped by sync code: every bill that came from the same phone. When someone asks for their bills back, find their phone here and give the bills to their new code."
                    : "Grouped by account holder: the person who paid and gets paid back. Open someone to see all their bills."}
                </p>
              </div>
              <div className="adm-stats">
                <div className="adm-stat">
                  <b>{bills.length}</b>
                  <span>shared bills</span>
                </div>
                <div className="adm-stat">
                  <b>{devices.filter((deviceGroup) => deviceGroup.key !== UNLINKED).length}</b>
                  <span>sync codes</span>
                </div>
                <div className="adm-stat">
                  <b>{holders.length}</b>
                  <span>holders</span>
                </div>
                <div className="adm-stat">
                  <b>{bills.reduce((total, bill) => total + bill.proofs, 0)}</b>
                  <span>receipts</span>
                </div>
              </div>
            </section>

            <div className="adm-toolbar">
              <input
                className="adm-input adm-input--search"
                value={query}
                placeholder="Search a bill, person, account number or id"
                onChange={(e) => setQuery(e.target.value)}
              />
              <button className="adm-btn adm-btn--ghost" onClick={loadBills} disabled={loading}>
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {!searchHits ? (
              <div className="adm-toolbar">
                <div className="adm-seg">
                  <button className={`adm-seg__btn${group === "code" ? " on" : ""}`} onClick={() => switchGroup("code")}>
                    By sync code
                  </button>
                  <button
                    className={`adm-seg__btn${group === "holder" ? " on" : ""}`}
                    onClick={() => switchGroup("holder")}
                  >
                    By account holder
                  </button>
                </div>
                {group === "code" ? (
                  <form className="adm-find" onSubmit={jumpToCode}>
                    <input
                      className="adm-input adm-mono"
                      value={findCode}
                      placeholder="Have their sync code? Paste it to jump there"
                      onChange={(e) => setFindCode(e.target.value)}
                    />
                    <button className="adm-btn" disabled={!findCode.trim()}>
                      Find
                    </button>
                  </form>
                ) : null}
              </div>
            ) : null}
            {findError && group === "code" && !searchHits ? <Notice tone="bad">{findError}</Notice> : null}
            {group === "code" && !searchHits && backups !== null && !indexed ? (
              <Notice>
                The Worker doesn&apos;t record which bills each phone holds yet. Run the migration and redeploy it,
                then every phone shows up here the next time it syncs.
              </Notice>
            ) : null}

            {searchHits ? (
              <section className="adm-card">
                <div className="adm-card__head">
                  <h2>
                    {searchHits.length} result{searchHits.length === 1 ? "" : "s"}
                  </h2>
                </div>
                {billTable(searchHits, false)}
              </section>
            ) : group === "code" ? (
              <section className="adm-holders">
                {devices.map((deviceGroup) => (
                  <button key={deviceGroup.key} className="adm-holder" onClick={() => openDevice(deviceGroup.key)}>
                    <span className={`adm-device${deviceGroup.key === UNLINKED ? " adm-device--none" : ""}`} aria-hidden="true">
                      {deviceGroup.key === UNLINKED ? "?" : <PhoneIcon />}
                    </span>
                    <span className="adm-holder__main">
                      <span className="adm-holder__name">
                        {deviceGroup.key === UNLINKED ? (
                          "Not linked to a sync code yet"
                        ) : deviceGroup.name ? (
                          deviceGroup.name
                        ) : (
                          <SyncId id={deviceGroup.key} code={codes[deviceGroup.key]} />
                        )}
                      </span>
                      <span className="adm-muted adm-small">
                        {deviceGroup.key === UNLINKED ? (
                          "Shared before bills carried a sync code. They link when the owner's phone next syncs, re-shares or ticks a payment."
                        ) : (
                          <>
                            {deviceGroup.name ? <SyncId id={deviceGroup.key} code={codes[deviceGroup.key]} /> : "No name set in Settings"}
                            {codes[deviceGroup.key] ? "" : " · open its code under Sync codes to show it here"}
                          </>
                        )}
                      </span>
                      <span className="adm-clamp adm-small">
                        {deviceGroup.bills
                          .slice(0, 4)
                          .map((bill) => bill.title)
                          .join(" · ")}
                        {deviceGroup.bills.length > 4 ? ` · +${deviceGroup.bills.length - 4}` : ""}
                      </span>
                    </span>
                    <span className="adm-holder__meta">
                      <b>
                        {deviceGroup.bills.length} bill{deviceGroup.bills.length === 1 ? "" : "s"}
                      </b>
                      <span className="adm-muted adm-small">
                        {deviceGroup.key === UNLINKED ? "" : `synced ${ago(deviceGroup.updatedAt)}`}
                      </span>
                    </span>
                    <span className="adm-holder__chev" aria-hidden="true">
                      ›
                    </span>
                  </button>
                ))}
                {!devices.length ? <div className="adm-card adm-empty">No shared bills yet.</div> : null}
              </section>
            ) : (
              <section className="adm-holders">
                {holders.map((holderGroup) => (
                  <button key={holderGroup.key} className="adm-holder" onClick={() => openHolder(holderGroup.key)}>
                    <Avatar name={holderGroup.name} />
                    <span className="adm-holder__main">
                      <span className="adm-holder__name">{holderGroup.name}</span>
                      <Accounts accounts={holderGroup.accounts} />
                    </span>
                    <span className="adm-holder__meta">
                      <b>
                        {holderGroup.bills.length} bill{holderGroup.bills.length === 1 ? "" : "s"}
                      </b>
                      <span className="adm-muted adm-small">
                        {Object.entries(holderGroup.totals)
                          .map(([currency, total]) => money(total, currency))
                          .join(" · ") || "—"}
                      </span>
                      <span className="adm-muted adm-small">{ago(holderGroup.last)}</span>
                    </span>
                    <span className="adm-holder__chev" aria-hidden="true">
                      ›
                    </span>
                  </button>
                ))}
                {!holders.length ? <div className="adm-card adm-empty">No shared bills yet.</div> : null}
              </section>
            )}
          </>
        ) : null}

        {tab === "bills" && holder ? (
          <>
            <button className="adm-back" onClick={() => openHolder(null)}>
              ‹ All holders
            </button>
            <section className="adm-card adm-profile">
              <Avatar name={holder.name} large />
              <div className="adm-profile__main">
                <h1>{holder.name}</h1>
                <Accounts accounts={holder.accounts} />
              </div>
              <div className="adm-stats">
                <div className="adm-stat">
                  <b>{holder.bills.length}</b>
                  <span>bills</span>
                </div>
                {Object.entries(holder.totals).map(([currency, total]) => (
                  <div className="adm-stat" key={currency}>
                    <b>{money(total, currency)}</b>
                    <span>total</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="adm-card">
              <div className="adm-card__head">
                <h2>Their bills</h2>
                {pickActions(holder.bills)}
              </div>
              {billTable(holder.bills, true)}
            </section>
          </>
        ) : null}

        {tab === "bills" && device ? (
          <>
            <button className="adm-back" onClick={() => openDevice(null)}>
              ‹ All sync codes
            </button>
            <section className="adm-card adm-profile">
              <span className={`adm-device adm-device--lg${device.key === UNLINKED ? " adm-device--none" : ""}`} aria-hidden="true">
                {device.key === UNLINKED ? "?" : <PhoneIcon size={30} />}
              </span>
              <div className="adm-profile__main">
                <h1>
                  {device.key === UNLINKED ? (
                    "Not linked to a sync code yet"
                  ) : device.name ? (
                    device.name
                  ) : (
                    <SyncId id={device.key} code={codes[device.key]} />
                  )}
                </h1>
                {device.key === UNLINKED ? (
                  <span className="adm-muted">
                    These were shared before bills carried their owner&apos;s sync code. Each one links itself the next
                    time the owner&apos;s phone syncs, re-shares it or ticks a payment. Bills with no owner never link,
                    because nothing proves whose they are. Paste a sync code under Sync codes to link its bills now.
                  </span>
                ) : (
                  <span className="adm-muted adm-small">
                    {device.name ? "" : "No name set in Settings · "}
                    {codes[device.key] ? "Sync code" : "Fingerprint"} <SyncId id={device.key} code={codes[device.key]} /> ·
                    last synced {when(device.updatedAt)} · {size(device.size)}
                  </span>
                )}
              </div>
              <div className="adm-stats">
                <div className="adm-stat">
                  <b>{device.bills.length}</b>
                  <span>shared bills</span>
                </div>
              </div>
            </section>
            <section className="adm-card">
              <div className="adm-card__head">
                <h2>Bills from this phone</h2>
                {pickActions(device.bills)}
              </div>
              {billTable(device.bills, true)}
            </section>
          </>
        ) : null}

        {tab === "codes" ? (
          <>
            <section className="adm-hero">
              <div>
                <h1>Sync codes</h1>
                <p className="adm-muted">
                  Every phone backs up its bills under a sync code (Settings → Sync across devices). The backup is
                  locked with that code, so the server can only open it when you paste the code here.
                </p>
              </div>
              <div className="adm-stats">
                <div className="adm-stat">
                  <b>{backups ? backups.length : <Skeleton width={36} height={22} radius={6} />}</b>
                  <span>phones backing up</span>
                </div>
              </div>
            </section>

            <section className="adm-card">
              <div className="adm-card__head">
                <h2>Look inside a sync code</h2>
              </div>
              <form className="adm-toolbar" onSubmit={runLookup}>
                <input
                  className="adm-input adm-mono"
                  value={code}
                  readOnly={looking}
                  placeholder="Paste the sync code someone sent you"
                  onChange={(e) => {
                    setCode(e.target.value);
                    setLookup(null);
                    setReclaim(null);
                  }}
                />
                <button className="adm-btn adm-btn--primary" disabled={looking || !code.trim()}>
                  {looking ? "Opening…" : "Open"}
                </button>
                {code || lookup ? (
                  <button type="button" className="adm-btn adm-btn--ghost" disabled={looking} onClick={clearLookup}>
                    Clear
                  </button>
                ) : null}
              </form>

              {lookup && !lookup.exists ? (
                <Notice>No backup under that code yet. The phone may never have synced, or the code has a typo.</Notice>
              ) : null}
              {lookup?.exists && !lookup.readable ? (
                <Notice tone="bad">There&apos;s a backup, but this code doesn&apos;t unlock it.</Notice>
              ) : null}
              {lookup?.summary ? (
                <div className="adm-stack">
                  {(() => {
                    const lost = lookup.summary.bills.filter(
                      (bill) => bill.owner && bill.shareId && billById.get(bill.shareId) && !billById.get(bill.shareId)?.owned,
                    );
                    if (!lost.length) return null;
                    return (
                      <Notice tone="bad">
                        <b>
                          {lost.length} bill{lost.length === 1 ? "" : "s"} lost {lost.length === 1 ? "its" : "their"} owner
                          on the server
                        </b>{" "}
                        ({lost.map((bill) => bill.title).join(", ")}). This phone still holds the owner key, but the server
                        forgot it, usually because the bill was released or shared before ownership existed. Until
                        it&apos;s fixed, anyone with the link can tick people off as paid.
                        <div style={{ marginTop: 10 }}>
                          <button
                            className="adm-btn adm-btn--primary adm-btn--sm"
                            disabled={reclaim?.busy}
                            onClick={async () => {
                              setReclaim({ busy: true, message: "", tone: "pos" });
                              try {
                                const res = await fetch("/api/admin/reclaim", {
                                  method: "POST",
                                  headers: { "content-type": "application/json" },
                                  body: JSON.stringify({ code: code.trim() }),
                                });
                                const body = (await res.json()) as {
                                  ok?: boolean;
                                  fixed?: number;
                                  workerOutdated?: boolean;
                                  error?: string;
                                };
                                if (!body.ok) {
                                  setReclaim({ busy: false, message: body.error ?? "Didn't work.", tone: "bad" });
                                } else if (body.workerOutdated) {
                                  setReclaim({
                                    busy: false,
                                    tone: "bad",
                                    message: "The Worker needs redeploying first (npx wrangler deploy in worker/).",
                                  });
                                } else {
                                  setReclaim({
                                    busy: false,
                                    tone: "pos",
                                    message: `Done: this phone owns ${body.fixed} more bill${body.fixed === 1 ? "" : "s"} again.`,
                                  });
                                  loadBills();
                                }
                              } catch {
                                setReclaim({ busy: false, message: "Something went wrong. Try again.", tone: "bad" });
                              }
                            }}
                          >
                            {reclaim?.busy ? "Fixing…" : "Give ownership back to this phone"}
                          </button>
                        </div>
                      </Notice>
                    );
                  })()}
                  {reclaim?.message ? <Notice tone={reclaim.tone}>{reclaim.message}</Notice> : null}
                  <button
                    className="adm-btn adm-btn--sm adm-btn--ghost"
                    style={{ justifySelf: "start" }}
                    onClick={async () => {
                      const key = await fingerprint(code.trim());
                      setTabState("bills");
                      openDevice(key);
                    }}
                  >
                    See this phone&apos;s shared bills ›
                  </button>
                  <p className="adm-muted adm-small">
                    Sync code <span className="adm-mono adm-key adm-strong">{code.trim()}</span> ·{" "}
                    {lookup.summary.name ? (
                      <>
                        Name set on the phone: <b>{lookup.summary.name}</b> ·{" "}
                      </>
                    ) : (
                      "No name set on the phone · "
                    )}
                    Last synced {when(lookup.updatedAt)} · {size(lookup.size ?? 0)} · {lookup.summary.contacts} saved
                    contact{lookup.summary.contacts === 1 ? "" : "s"} · {lookup.summary.deleted} deleted bill
                    {lookup.summary.deleted === 1 ? "" : "s"}
                  </p>
                  <div className="adm-tablewrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Bill on that phone</th>
                          <th>People</th>
                          <th className="adm-num">Total</th>
                          <th>Status</th>
                          <th>Changed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lookup.summary.bills.map((bill) => {
                          const shared = bill.shareId ? billById.get(bill.shareId) : undefined;
                          return (
                            <tr key={bill.id}>
                              <td>
                                {shared ? (
                                  <a className="adm-strong" href={billHref(shared.id)}>
                                    {bill.title}
                                  </a>
                                ) : (
                                  <span className="adm-strong">{bill.title}</span>
                                )}
                              </td>
                              <td>{bill.people}</td>
                              <td className="adm-num adm-mono">{money(bill.total, bill.currency)}</td>
                              <td>
                                <span className="adm-chips">
                                  {shared ? <Chip tone="accent">shared</Chip> : <Chip>only on phone</Chip>}
                                  {shared && bill.owner && shared.owned ? <Chip tone="pos">owner</Chip> : null}
                                  {shared && bill.owner && !shared.owned ? <Chip tone="warn">server lost its owner</Chip> : null}
                                  {shared && !bill.owner ? <Chip>someone else&apos;s bill</Chip> : null}
                                </span>
                              </td>
                              <td className="adm-muted adm-small">{ago(bill.updatedAt)}</td>
                            </tr>
                          );
                        })}
                        {!lookup.summary.bills.length ? (
                          <tr>
                            <td colSpan={5} className="adm-empty">
                              This backup has no bills.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="adm-card">
              <div className="adm-card__head">
                <h2>Recent backups</h2>
                {(backups?.length ?? 0) > 1 ? (
                  <button
                    className="adm-btn adm-btn--danger adm-btn--sm"
                    disabled={droppingBackups}
                    onClick={() => dropBackups((backups ?? []).slice(1).map((backup) => backup.key))}
                  >
                    {droppingBackups ? "Deleting…" : `Keep only the newest · delete ${(backups?.length ?? 1) - 1}`}
                  </button>
                ) : null}
              </div>
              <span className="adm-muted adm-small">
                The server only keeps a fingerprint. Codes you open here are remembered in this browser. Deleting a
                backup only removes the server copy: bills stay, and a phone still using that code uploads a fresh one
                on its next sync.
              </span>
              <div className="adm-tablewrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sync code</th>
                      <th className="adm-num">Shared bills</th>
                      <th className="adm-num">Size</th>
                      <th>Last sync</th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {backups === null ? (
                      <tr>
                        <td colSpan={6}>
                          <SkeletonRows rows={4} />
                        </td>
                      </tr>
                    ) : null}
                    {(backups ?? []).map((backup) => (
                      <tr key={backup.key} className="adm-table__link" onClick={() => { setTabState("bills"); openDevice(backup.key); }}>
                        <td className={backup.name ? "adm-strong" : "adm-muted"}>{backup.name ?? "—"}</td>
                        <td className="adm-small">
                          <SyncId id={backup.key} code={codes[backup.key]} className={codes[backup.key] ? "adm-strong" : "adm-muted"} />
                        </td>
                        <td className="adm-num">{backup.billIds.length || "—"}</td>
                        <td className="adm-num adm-mono">{size(backup.size)}</td>
                        <td className="adm-muted adm-small" title={when(backup.updatedAt)}>
                          {ago(backup.updatedAt)}
                        </td>
                        <td className="adm-num" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="adm-btn adm-btn--ghost adm-btn--sm"
                            disabled={droppingBackups}
                            onClick={() => dropBackups([backup.key])}
                            aria-label={`Delete the backup for ${backup.name ?? codes[backup.key] ?? backup.key}`}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {backups && !backups.length ? (
                      <tr>
                        <td colSpan={6} className="adm-empty">
                          No backups yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}

        {tab === "receipts" ? (
          <Receipts
            objects={objects}
            billById={billById}
            billHref={billHref}
            onRefresh={() => loadObjects()}
            onDelete={deleteObjects}
            onDeleteBill={deleteBill}
          />
        ) : null}
      </main>

      {giving ? <GiveDialog bills={giving} onClose={() => setGiving(null)} onDone={() => setPicked([])} /> : null}
    </div>
  );
}
