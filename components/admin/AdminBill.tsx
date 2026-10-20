"use client";

import { Fragment, useCallback, useEffect, useState } from "react";

import type { BillDetail } from "@/entities/admin";

import {
  Accounts,
  Avatar,
  Chip,
  CopyButton,
  GiveDialog,
  Gate,
  Notice,
  PhoneIcon,
  SyncId,
  ago,
  knownCodes,
  money,
  proofFileUrl,
  size,
  when,
} from "./ui";
import { BillSkeleton } from "./Skeletons";
import type { AdminBillProps, BillDevice } from "@/entities/props/admin";

export default function AdminBill({ id }: AdminBillProps) {
  const [state, setState] = useState<"loading" | "signed-out" | "missing" | "ready" | "error">("loading");
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [open, setOpen] = useState<number[]>([]);
  const [giving, setGiving] = useState<{ id: string; title: string }[] | null>(null);
  const [devices, setDevices] = useState<BillDevice[]>([]);
  const [indexed, setIndexed] = useState(true);
  const [origin, setOrigin] = useState("");
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setState("loading");
    try {
      const res = await fetch(`/api/admin/bills/${encodeURIComponent(id)}`);
      if (res.status === 401) return setState("signed-out");
      if (res.status === 404) return setState("missing");
      const body = (await res.json()) as { bill: BillDetail; devices?: BillDevice[]; indexed?: boolean };
      setBill(body.bill);
      setDevices(body.devices ?? []);
      setIndexed(Boolean(body.indexed));
      setState("ready");
    } catch {
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCodes(knownCodes());
    load();
  }, [load]);

  if (state === "signed-out") return <Gate onSignedIn={() => load()} />;

  if (state !== "ready" || !bill) {
    return (
      <div className="adm">
        <main className="adm-main">
          <a className="adm-back" href="/admin">
            ‹ All bills
          </a>
          {state === "loading" ? <BillSkeleton /> : null}
          {state === "missing" ? <Notice tone="bad">There&apos;s no bill with the id {id}.</Notice> : null}
          {state === "error" ? <Notice tone="bad">Couldn&apos;t load this bill. Try again.</Notice> : null}
        </main>
      </div>
    );
  }

  const link = `${origin}/s/${bill.id}`;
  const owing = bill.people.filter((person) => !person.isPayer);
  const settled = owing.filter((person) => person.paid).length;
  const proofCount = bill.people.filter((person) => person.proof).length;
  const remove = async () => {
    const receipts = proofCount ? ` and its ${proofCount} receipt${proofCount === 1 ? "" : "s"}` : "";
    if (!window.confirm(`Delete “${bill.title}”${receipts}? The share link stops working for everyone. This can't be undone.`)) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/bills/${encodeURIComponent(bill.id)}`, { method: "DELETE" });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!body.ok) {
        setDeleteError(body.error ?? "Couldn't delete this bill. Try again.");
        setDeleting(false);
        return;
      }
      window.location.href = "/admin";
    } catch {
      setDeleteError("Couldn't delete this bill. Try again.");
      setDeleting(false);
    }
  };
  const toggle = (i: number) => setOpen((cur) => (cur.includes(i) ? cur.filter((index) => index !== i) : [...cur, i]));

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="adm-top__in">
          <a className="adm-brand" href="/admin">
            <span className="adm-brand__mark">owe</span>
            <span className="adm-brand__label">Admin</span>
          </a>
        </div>
      </header>

      <main className="adm-main">
        <a
          className="adm-back"
          href={bill.holder ? `/admin?holder=${encodeURIComponent(bill.holder.key)}` : "/admin"}
        >
          ‹ {bill.holder.name}&apos;s bills
        </a>

        <section className="adm-card adm-billhead">
          <div className="adm-billhead__main">
            <span className="adm-chips">
              {bill.readable ? null : <Chip tone="bad">unreadable</Chip>}
              {bill.owned ? <Chip tone="pos">has an owner</Chip> : <Chip tone="warn">no owner</Chip>}
              {bill.unclaimed ? <Chip tone="warn">{bill.unclaimed} unclaimed</Chip> : null}
            </span>
            <h1>{bill.title}</h1>
            <div className="adm-row adm-row--wrap">
              <span className="adm-mono adm-muted adm-small">{bill.id}</span>
              <CopyButton value={bill.id} label="Copy id" />
            </div>
          </div>
          <div className="adm-billhead__actions">
            <a className="adm-btn adm-btn--ghost" href={`/s/${bill.id}`} target="_blank" rel="noreferrer">
              Open as a guest ↗
            </a>
            <CopyButton value={link} label="Copy share link" />
            <button className="adm-btn adm-btn--primary" onClick={() => setGiving([{ id: bill.id, title: bill.title }])} disabled={!bill.readable}>
              Give to someone
            </button>
            <button className="adm-btn adm-btn--danger" onClick={remove} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete bill"}
            </button>
          </div>
        </section>
        {deleteError ? <Notice tone="bad">{deleteError}</Notice> : null}

        <section className="adm-tiles">
          <div className="adm-tile">
            <span>Total</span>
            <b>{money(bill.grandTotal, bill.currency)}</b>
          </div>
          <div className="adm-tile">
            <span>People</span>
            <b>{bill.people.length}</b>
          </div>
          <div className="adm-tile">
            <span>Paid back</span>
            <b>
              {settled}/{owing.length}
            </b>
          </div>
          <div className="adm-tile">
            <span>Receipts</span>
            <b>{bill.proofs}</b>
          </div>
          <div className="adm-tile">
            <span>Tax &amp; service</span>
            <b>{bill.feeRate ? `${Math.round(bill.feeRate * 1000) / 10}%` : "—"}</b>
          </div>
          <div className="adm-tile">
            <span>Last change</span>
            <b title={when(bill.updatedAt)}>{ago(bill.updatedAt)}</b>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <h2>Account holder</h2>
            <span className="adm-muted adm-small">The person who paid, and where everyone sends money back.</span>
          </div>
          <div className="adm-row adm-row--wrap">
            <Avatar name={bill.holder.name} />
            <b>{bill.holder.name}</b>
            <Accounts accounts={bill.holder.accounts} />
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <h2>On the same phone</h2>
            <span className="adm-muted adm-small">Other bills backed up under the same sync code.</span>
          </div>
          {devices.length ? (
            devices.map((device) => (
              <div key={device.key} className="adm-phone">
                <div className="adm-row adm-row--wrap">
                  <span className="adm-device" aria-hidden="true">
                    <PhoneIcon />
                  </span>
                  <a className="adm-strong" href={`/admin?device=${encodeURIComponent(device.key)}`}>
                    {device.name ?? <SyncId id={device.key} code={codes[device.key]} />}
                  </a>
                  {device.name ? <SyncId id={device.key} code={codes[device.key]} className="adm-muted adm-small" /> : null}
                  <span className="adm-muted adm-small">synced {ago(device.updatedAt)}</span>
                  <button
                    className="adm-btn adm-btn--primary adm-btn--sm adm-phone__give"
                    onClick={() => setGiving(device.bills)}
                  >
                    Give all {device.bills.length} to someone
                  </button>
                </div>
                <div className="adm-chips">
                  {device.bills.map((deviceBill) => (
                    <a
                      key={deviceBill.id}
                      className={`adm-chip ${deviceBill.id === bill.id ? "adm-chip--accent" : ""}`}
                      href={`/admin/bills/${encodeURIComponent(deviceBill.id)}`}
                    >
                      {deviceBill.title}
                    </a>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <span className="adm-muted">
              {indexed
                ? "Not linked to a sync code yet. It links the next time its owner's phone syncs, re-shares it or ticks a payment."
                : "The Worker doesn't record which bills each phone holds yet. Run the migration and redeploy it."}
            </span>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card__head">
            <h2>People</h2>
            <span className="adm-muted adm-small">Tap a row to see what they had.</span>
          </div>
          <div className="adm-tablewrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Person</th>
                  <th className="adm-num">Owes</th>
                  <th>Status</th>
                  <th>Pays to / account</th>
                  <th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {bill.people.map((person) => (
                  <Fragment key={person.index}>
                    <tr className="adm-table__link" onClick={() => toggle(person.index)}>
                      <td>
                        <span className="adm-row">
                          <span className={`adm-caret${open.includes(person.index) ? " on" : ""}`} aria-hidden="true">
                            ›
                          </span>
                          <Avatar name={person.name} />
                          <span>
                            <span className="adm-strong">{person.name}</span>
                            <span className="adm-muted adm-small adm-block">
                              {person.items.length} item{person.items.length === 1 ? "" : "s"}
                              {person.claimed.length ? ` · ${person.claimed.length} claimed` : ""}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="adm-num adm-mono">{money(person.total, bill.currency)}</td>
                      <td>
                        {person.isPayer ? (
                          <Chip tone="accent">paid the bill</Chip>
                        ) : person.paid ? (
                          <Chip tone="pos">paid back</Chip>
                        ) : person.proof ? (
                          <Chip tone="warn">receipt sent, not confirmed</Chip>
                        ) : (
                          <Chip>not paid yet</Chip>
                        )}
                      </td>
                      <td>
                        <Accounts accounts={person.accounts} empty="—" />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {person.proof ? (
                          <a className="adm-thumb" href={proofFileUrl(bill.id, person.index)} target="_blank" rel="noreferrer">
                            {person.proof.contentType.includes("pdf") ? (
                              <span className="adm-shot__pdf">PDF</span>
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={proofFileUrl(bill.id, person.index)} alt={`Receipt from ${person.name}`} loading="lazy" />
                            )}
                          </a>
                        ) : (
                          <span className="adm-muted">—</span>
                        )}
                      </td>
                    </tr>
                    {open.includes(person.index) ? (
                      <tr className="adm-table__sub">
                        <td colSpan={5}>
                          <div className="adm-items">
                            {person.items.map((item, i) => (
                              <div key={i} className="adm-items__row">
                                <span>
                                  {item.qty > 1 ? `${item.qty}× ` : ""}
                                  {item.name}
                                  {item.split && item.split > 1 ? (
                                    <span className="adm-muted"> · shared by {item.split}</span>
                                  ) : null}
                                  {item.units ? <span className="adm-muted"> · had {item.units}</span> : null}
                                </span>
                                <span className="adm-mono">{money(item.share, bill.currency)}</span>
                              </div>
                            ))}
                            {person.claimed.map((item, i) => (
                              <div key={`c${i}`} className="adm-items__row">
                                <span>
                                  {item.name} <Chip tone="accent">claimed</Chip>
                                </span>
                                <span className="adm-mono">{money(item.amount, bill.currency)}</span>
                              </div>
                            ))}
                            {!person.items.length && !person.claimed.length ? (
                              <div className="adm-muted">No items assigned.</div>
                            ) : null}
                            {person.proof ? (
                              <div className="adm-muted adm-small">
                                Receipt uploaded {when(person.proof.uploadedAt)}
                                {person.proof.size ? ` · ${size(person.proof.size)}` : ""}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {bill.claimable.length ? (
          <section className="adm-card">
            <div className="adm-card__head">
              <h2>Items left to claim</h2>
              <span className="adm-muted adm-small">The maker didn&apos;t know who had these; people claim them from the link.</span>
            </div>
            <div className="adm-tablewrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="adm-num">Qty</th>
                    <th className="adm-num">Price</th>
                    <th>Claimed by</th>
                  </tr>
                </thead>
                <tbody>
                  {bill.claimable.map((item) => (
                    <tr key={item.id}>
                      <td className="adm-strong">{item.name}</td>
                      <td className="adm-num">{item.qty}</td>
                      <td className="adm-num adm-mono">{money(item.amount, bill.currency)}</td>
                      <td>{item.claimedBy.length ? item.claimedBy.join(", ") : <Chip tone="warn">nobody yet</Chip>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <details className="adm-card adm-raw">
          <summary>Raw data stored for this bill</summary>
          <pre className="adm-mono">{JSON.stringify(bill.raw, null, 2)}</pre>
        </details>
      </main>

      {giving ? <GiveDialog bills={giving} onClose={() => setGiving(null)} onDone={() => load(true)} /> : null}
    </div>
  );
}
