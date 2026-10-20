"use client";

import { useState, type ReactNode } from "react";

import type { AdminAccount } from "@/lib/adminTypes";

export const money = (n: number, currency: string) =>
  `${currency ? currency + " " : ""}${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(n)}`;

export const when = (value: string | number | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const ago = (value: string | number | null | undefined) => {
  if (!value) return "—";
  const ms = Date.now() - new Date(value).getTime();
  if (Number.isNaN(ms)) return "—";
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return when(value);
};

export const size = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`;

export const fileUrl = (key: string) => `/api/admin/objects/file?key=${encodeURIComponent(key)}`;

export const proofFileUrl = (billId: string, index: number) =>
  `/api/admin/objects/file?id=${encodeURIComponent(billId)}&i=${index}`;

const CODES_KEY = "owe.admin.codes";

export function knownCodes(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(CODES_KEY) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function rememberCode(key: string, code: string): Record<string, string> {
  const next = { ...knownCodes(), [key]: code };
  try {
    localStorage.setItem(CODES_KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the code shows for this visit only */
  }
  return next;
}

export function SyncId({ id, code, className = "" }: { id: string; code?: string; className?: string }) {
  return (
    <span className={`adm-mono adm-key${className ? ` ${className}` : ""}`} title={code ? "Sync code" : "Fingerprint"}>
      {code ?? id}
    </span>
  );
}

export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "pos" | "warn" | "bad" | "accent";
  children: ReactNode;
}) {
  return <span className={`adm-chip adm-chip--${tone}`}>{children}</span>;
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  let hue = 0;
  for (let i = 0; i < name.length; i++) hue = (hue * 31 + name.charCodeAt(i)) % 360;
  return (
    <span
      className={`adm-avatar${large ? " adm-avatar--lg" : ""}`}
      style={{ "--hue": hue } as React.CSSProperties}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function PhoneIcon({ size: px = 20 }: { size?: number }) {
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2" width="12" height="20" rx="3" />
      <path d="M11 18h2" />
    </svg>
  );
}

export function Accounts({ accounts, empty = "No payment details" }: { accounts: AdminAccount[]; empty?: string }) {
  if (!accounts.length) return <span className="adm-muted">{empty}</span>;
  return (
    <span className="adm-accounts">
      {accounts.map((a, i) => (
        <span key={i} className="adm-account">
          <b>{a.label}</b>
          <span className="adm-mono">{a.value}</span>
        </span>
      ))}
    </span>
  );
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="adm-btn adm-btn--ghost adm-btn--sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1400);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "bad" | "pos"; children: ReactNode }) {
  return <div className={`adm-notice adm-notice--${tone}`}>{children}</div>;
}

export function Gate({ onSignedIn }: { onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.status === 503 ? "Admin is not configured." : "Wrong password.");
      return;
    }
    setPassword("");
    onSignedIn();
  };

  return (
    <div className="adm-gate">
      <form className="adm-gate__card" onSubmit={submit}>
        <div className="adm-brand">
          <span className="adm-brand__mark">owe</span>
          <span className="adm-brand__label">Admin</span>
        </div>
        <p className="adm-muted">Look up shared bills, hand them back to people who lost them, and check receipts.</p>
        <input
          className="adm-input"
          type="password"
          value={password}
          autoFocus
          placeholder="Admin password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="adm-btn adm-btn--primary" type="submit" disabled={busy || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error ? <Notice tone="bad">{error}</Notice> : null}
      </form>
    </div>
  );
}

type GiveResult = {
  ok?: boolean;
  code?: string;
  created?: boolean;
  titles?: string[];
  kept?: number;
  owned?: number;
  ownerFailed?: boolean;
  error?: string;
};

export function GiveDialog({
  bills,
  onClose,
  onDone,
}: {
  bills: { id: string; title: string }[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const [code, setCode] = useState("");
  const [makeOwner, setMakeOwner] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GiveResult | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/give", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: bills.map((b) => b.id), code: code.trim() || undefined, makeOwner }),
      });
      const body = (await res.json()) as GiveResult;
      setResult(body);
      if (body.ok) onDone?.();
    } catch {
      setResult({ ok: false, error: "Something went wrong. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="adm-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="adm-modal__head">
          <h2>Give {bills.length === 1 ? "this bill" : `${bills.length} bills`} to someone</h2>
          <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {result?.ok ? (
          <div className="adm-stack">
            <Notice tone="pos">
              {result.titles?.length === 1 ? `“${result.titles[0]}” is` : `${result.titles?.length} bills are`} now
              in this sync code{result.kept ? `, next to the ${result.kept} bill(s) already there` : ""}.
              {result.owned ? " They're also the owner now, so they can confirm payments." : ""}
            </Notice>
            {result.ownerFailed ? (
              <Notice tone="bad">
                Couldn&apos;t make them the owner. The Worker probably needs redeploying (
                <code>npx wrangler deploy</code> in <code>worker/</code>).
              </Notice>
            ) : null}
            <div className="adm-codebox">
              <span className="adm-mono">{result.code}</span>
              <CopyButton value={result.code ?? ""} />
            </div>
            <ol className="adm-steps">
              <li>Send them the sync code above.</li>
              <li>
                In owe they open <b>Settings → Sync across devices → Use a code from elsewhere</b>.
              </li>
              <li>They paste the code and tap Restore. The bills appear in their history.</li>
            </ol>
            <button className="adm-btn adm-btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form className="adm-stack" onSubmit={submit}>
            <p className="adm-muted">
              Puts a copy of the bill into someone&apos;s sync code, so it shows up in their owe history. Use it when
              someone lost their phone or cleared the app.
            </p>
            <ul className="adm-picklist">
              {bills.map((b) => (
                <li key={b.id}>{b.title}</li>
              ))}
            </ul>
            <label className="adm-field">
              <span>Their sync code</span>
              <input
                className="adm-input adm-mono"
                value={code}
                placeholder="Paste their code, or leave empty to make a new one"
                onChange={(e) => setCode(e.target.value)}
              />
              <small className="adm-muted">
                They find it in Settings → Sync across devices → Your sync code. Bills already in that code are kept.
              </small>
            </label>
            <label className="adm-check">
              <input type="checkbox" checked={makeOwner} onChange={(e) => setMakeOwner(e.target.checked)} />
              <span>
                <b>Make them the owner</b>
                <small className="adm-muted">
                  Only the owner can tick people off as paid. The device that owned it before loses that.
                </small>
              </span>
            </label>
            {result && !result.ok ? <Notice tone="bad">{result.error}</Notice> : null}
            <div className="adm-row adm-row--end">
              <button type="button" className="adm-btn adm-btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="adm-btn adm-btn--primary" disabled={busy}>
                {busy ? "Working…" : code.trim() ? "Add to their code" : "Create a code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
