"use client";

import { useEffect, useMemo, useState } from "react";

import type { AdminObject } from "@/entities/admin";
import { Chip, ago, fileUrl, money, size, when } from "./ui";
import { SlipsSkeleton, Skeleton } from "./Skeletons";
import type { ReceiptPhotoProps, ReceiptSlip, ReceiptSlot, ReceiptsProps, ReceiptsView } from "@/entities/props/admin";

const tilt = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return ((hash % 9) - 4) * 0.75;
};

const isPdf = (file: AdminObject) => (file.contentType ?? file.key).includes("pdf");

export function Receipts({
  objects,
  billById,
  billHref,
  onRefresh,
  onDelete,
  onDeleteBill,
}: ReceiptsProps) {
  const [view, setView] = useState<ReceiptsView>("board");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<{ slip: string; key: string } | null>(null);
  const [sweeping, setSweeping] = useState(false);
  const [binning, setBinning] = useState<string | null>(null);

  const used = useMemo(() => (objects ?? []).filter((file) => !file.orphan), [objects]);
  const lost = useMemo(() => (objects ?? []).filter((file) => file.orphan), [objects]);

  const slips = useMemo<ReceiptSlip[]>(() => {
    const byBill = new Map<string, AdminObject[]>();
    used.forEach((file) => {
      const id = file.billId ?? "?";
      byBill.set(id, [...(byBill.get(id) ?? []), file]);
    });
    return [...byBill.entries()]
      .map(([id, files]) => {
        const bill = billById.get(id);
        const byPerson = new Map(files.map((file) => [file.personIndex, file]));
        const named: ReceiptSlot[] = (bill?.readable ? bill.names : [])
          .map((name, index) => ({
            index,
            name,
            file: byPerson.get(index) ?? null,
            paid: Boolean(bill?.paid.includes(index)),
          }))
          .filter((slot) => slot.index !== bill?.payer);
        const covered = new Set(named.filter((slot) => slot.file).map((slot) => slot.file!.key));
        const loose: ReceiptSlot[] = files
          .filter((file) => !covered.has(file.key))
          .map((file, i) => ({
            index: file.personIndex ?? -1 - i,
            name: file.personIndex !== null ? `Person ${file.personIndex + 1}` : "Someone",
            file,
            paid: file.personIndex !== null && Boolean(bill?.paid.includes(file.personIndex)),
          }));
        const slots = [...named, ...loose];
        const latest = files.reduce((newest, file) => (file.uploaded > newest ? file.uploaded : newest), "");
        return { id, bill, files, slots, latest };
      })
      .sort((a, b) => (a.latest < b.latest ? 1 : -1));
  }, [used, billById]);

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return slips;
    return slips.filter(
      (slip) =>
        (slip.bill?.title ?? slip.id).toLowerCase().includes(term) ||
        slip.slots.some((slot) => slot.file && slot.name.toLowerCase().includes(term)),
    );
  }, [slips, query]);

  const openSlip = open ? (slips.find((slip) => slip.id === open.slip) ?? null) : null;
  const reel = useMemo(() => (openSlip ? openSlip.slots.filter((slot) => slot.file) : []), [openSlip]);
  const at = reel.findIndex((slot) => slot.file?.key === open?.key);
  const current = at >= 0 ? reel[at] : null;

  useEffect(() => {
    if (!open || !reel.length) return;
    const step = (by: number) => {
      const next = reel[(at + by + reel.length) % reel.length];
      if (next?.file) setOpen({ slip: open.slip, key: next.file.key });
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, reel, at]);

  const lostBytes = lost.reduce((total, file) => total + file.size, 0);
  const totalBytes = (objects ?? []).reduce((total, file) => total + file.size, 0);

  const binBill = async (slip: ReceiptSlip) => {
    const title = slip.bill?.title ?? slip.id;
    const fileCount = slip.files.length;
    if (
      !window.confirm(
        `Delete “${title}” and its ${fileCount} receipt${fileCount === 1 ? "" : "s"}? The share link stops working for everyone. This can't be undone.`,
      )
    )
      return;
    setBinning(slip.id);
    try {
      await onDeleteBill(slip.id);
    } finally {
      setBinning(null);
    }
  };

  const sweep = async () => {
    if (!lost.length) return;
    if (!window.confirm(`Delete all ${lost.length} unused file${lost.length === 1 ? "" : "s"}? This can't be undone.`))
      return;
    setSweeping(true);
    try {
      await onDelete(lost.map((file) => file.key));
    } finally {
      setSweeping(false);
    }
  };

  return (
    <>
      <section className="adm-hero">
        <div>
          <h1>Receipts</h1>
          <p className="adm-muted">
            Every &ldquo;I&apos;ve paid!&rdquo; with the screenshot to prove it, pinned to the bill it settles.
          </p>
        </div>
        <div className="adm-stats">
          <div className="adm-stat">
            <b>{objects ? used.length : <Skeleton width={36} height={22} radius={6} />}</b>
            <span>
              on {slips.length} bill{slips.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="adm-stat">
            <b>{objects ? size(totalBytes) : <Skeleton width={70} height={22} radius={6} />}</b>
            <span>in storage</span>
          </div>
        </div>
      </section>

      <div className="adm-toolbar">
        <div className="adm-seg">
          <button className={`adm-seg__btn${view === "board" ? " on" : ""}`} onClick={() => setView("board")}>
            Board
          </button>
          <button className={`adm-seg__btn${view === "lost" ? " on" : ""}`} onClick={() => setView("lost")}>
            Lost &amp; found{lost.length ? ` · ${lost.length}` : ""}
          </button>
        </div>
        {view === "board" ? (
          <input
            className="adm-input adm-input--search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a bill or a person"
            aria-label="Find a bill or a person"
          />
        ) : null}
        <button className="adm-btn adm-btn--ghost" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {view === "board" ? (
        <section className="rcp-board">
          {objects === null ? <SlipsSkeleton /> : null}
          {shown.map((slip) => {
            const sent = slip.slots.filter((slot) => slot.file).length;
            const settled = slip.slots.filter((slot) => slot.paid).length;
            const readable = Boolean(slip.bill?.readable);
            const done = readable && slip.slots.length > 0 && settled === slip.slots.length;
            return (
              <article
                key={slip.id}
                className={`rcp-slip${done ? " rcp-slip--done" : ""}${binning === slip.id ? " rcp-slip--going" : ""}`}
              >
                {done ? (
                  <span className="rcp-stamp" aria-hidden="true">
                    settled
                  </span>
                ) : null}
                <header className="rcp-slip__head">
                  {slip.bill ? (
                    <a className="rcp-slip__title" href={billHref(slip.id)}>
                      {slip.bill.title}
                    </a>
                  ) : (
                    <span className="rcp-slip__title adm-mono">{slip.id}</span>
                  )}
                  <span className="rcp-slip__meta">
                    {slip.bill?.readable ? `${money(slip.bill.grandTotal, slip.bill.currency)} · ` : ""}
                    last receipt {ago(slip.latest)}
                  </span>
                  <button
                    className="rcp-slip__bin"
                    onClick={() => binBill(slip)}
                    disabled={binning !== null}
                    aria-label={`Delete ${slip.bill?.title ?? "this bill"} and its receipts`}
                    title="Delete bill and receipts"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                    </svg>
                  </button>
                </header>
                {readable ? (
                  <div className="rcp-tally" aria-label={`${sent} receipts, ${settled} of ${slip.slots.length} paid`}>
                    <span className="rcp-tally__bar">
                      <span
                        style={{
                          width: `${slip.slots.length ? (settled / slip.slots.length) * 100 : 0}%`,
                        }}
                      />
                    </span>
                    <span>
                      {settled}/{slip.slots.length} paid
                    </span>
                  </div>
                ) : null}
                <div className="rcp-line">
                  {slip.slots.map((slot) =>
                    slot.file ? (
                      <button
                        key={slot.index}
                        className="rcp-polaroid"
                        style={
                          {
                            "--tilt": `${tilt(slot.file.key)}deg`,
                          } as React.CSSProperties
                        }
                        onClick={() => setOpen({ slip: slip.id, key: slot.file!.key })}
                      >
                        <span className="rcp-polaroid__img">
                          <Photo file={slot.file} alt={`Receipt from ${slot.name}`} />
                        </span>
                        <span className="rcp-polaroid__name">{slot.name}</span>
                        {slot.paid ? (
                          <span className="rcp-tick" aria-label="confirmed">
                            ✓
                          </span>
                        ) : null}
                      </button>
                    ) : (
                      <span
                        key={slot.index}
                        className={`rcp-empty${slot.paid ? " rcp-empty--paid" : ""}`}
                        title={slot.paid ? `${slot.name} paid without a receipt` : `Waiting on ${slot.name}`}
                      >
                        <span className="rcp-empty__mark" aria-hidden="true">
                          {slot.paid ? "✓" : "?"}
                        </span>
                        <span className="rcp-polaroid__name">{slot.name}</span>
                      </span>
                    ),
                  )}
                </div>
              </article>
            );
          })}
          {objects && !shown.length ? (
            <div className="adm-card adm-empty">{query ? "Nothing matches that." : "No receipts yet."}</div>
          ) : null}
        </section>
      ) : (
        <section className="rcp-bin">
          <div className="rcp-bin__head">
            <div>
              <h2>Lost &amp; found</h2>
              <span className="adm-muted adm-small">
                Files no bill points at any more: replaced screenshots, deleted bills. Nobody will miss them.
              </span>
            </div>
            <button className="adm-btn adm-btn--danger" disabled={!lost.length || sweeping} onClick={sweep}>
              {sweeping ? "Sweeping…" : lost.length ? `Sweep ${lost.length} · ${size(lostBytes)}` : "All clean"}
            </button>
          </div>
          {lost.length ? (
            <div className="rcp-pile">
              {lost.map((file) => (
                <a
                  key={file.key}
                  className="rcp-scrap"
                  href={fileUrl(file.key)}
                  target="_blank"
                  rel="noreferrer"
                  style={{ "--tilt": `${tilt(file.key) * 2}deg` } as React.CSSProperties}
                  title={`${size(file.size)} · ${when(file.uploaded)}`}
                >
                  <Photo file={file} alt="Unused receipt" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rcp-clean">Nothing lying around. Tidy.</div>
          )}
        </section>
      )}

      {openSlip && current?.file ? (
        <div className="rcp-light" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <figure className="rcp-light__card" onClick={(e) => e.stopPropagation()}>
            <a className="rcp-light__img" href={fileUrl(current.file.key)} target="_blank" rel="noreferrer">
              <Photo file={current.file} alt={`Receipt from ${current.name}`} />
            </a>
            <figcaption className="rcp-light__cap">
              <div>
                <b>{current.name}</b>
                <span className="adm-muted adm-small">
                  {openSlip.bill?.title ?? openSlip.id} · {when(current.file.uploaded)} · {size(current.file.size)}
                </span>
              </div>
              {current.paid ? <Chip tone="pos">confirmed</Chip> : <Chip tone="warn">not confirmed yet</Chip>}
            </figcaption>
            {reel.length > 1 ? (
              <div className="rcp-light__nav">
                <button
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                  onClick={() =>
                    setOpen({
                      slip: openSlip.id,
                      key: reel[(at - 1 + reel.length) % reel.length].file!.key,
                    })
                  }
                  aria-label="Previous receipt"
                >
                  ‹
                </button>
                <span className="adm-muted adm-small">
                  {at + 1} / {reel.length}
                </span>
                <button
                  className="adm-btn adm-btn--ghost adm-btn--sm"
                  onClick={() =>
                    setOpen({
                      slip: openSlip.id,
                      key: reel[(at + 1) % reel.length].file!.key,
                    })
                  }
                  aria-label="Next receipt"
                >
                  ›
                </button>
              </div>
            ) : null}
            <button className="rcp-light__close" onClick={() => setOpen(null)} aria-label="Close">
              ✕
            </button>
          </figure>
        </div>
      ) : null}
    </>
  );
}

function Photo({ file, alt }: ReceiptPhotoProps) {
  return isPdf(file) ? (
    <span className="rcp-pdf">PDF</span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fileUrl(file.key)} alt={alt} loading="lazy" />
  );
}
