import { CURRENCIES } from "./currency";
import type { ScanResult } from "./types";

const NOISE =
  /(sub\s*total|total|tax|gst|vat|ppn|pb\s?1|service|charge|biaya|cash|change|kembali|balance|visa|master|debit|credit|kredit|qris|gopay|ovo|dana|card|tip|round|amount|due|bayar|tunai|nontunai|qty|item|thank|terima|www|http|tel|telp|receipt|invoice|struk|table|meja|server|kasir|cashier|date|tgl|time|order|pajak|jumlah|diskon|discount|potongan|npwp|dine\s*in|take\s*away|queue|collected|bill\s*name|sales\s*type|tender|other)/i;

function parsePrice(s: string, dec: number): number | null {
  let t = s.replace(/[^\d.,]/g, "");
  if (!t) return null;
  const hasDot = t.includes(".");
  const hasComma = t.includes(",");

  if (hasDot && hasComma) {
    if (t.lastIndexOf(",") > t.lastIndexOf("."))
      t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(/,/g, "");
  } else if (hasDot || hasComma) {
    const sep = hasDot ? "." : ",";
    const groups = t.split(sep);
    const last = groups[groups.length - 1];
    if (dec > 0 && groups.length === 2 && last.length <= 2) {
      t = t.replace(sep, ".");
    } else {
      t = groups.join("");
    }
  }

  const n = parseFloat(t);
  return isFinite(n) ? n : null;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .slice(0, 40);
}

const TOTALS =
  /^(sub\s*t|total|tax|ppn|gst|vat|tender|change|kembali|tunai|nontunai|grand|bayar|jumlah|amount|balance|service|biaya|diskon|discount|potongan|round)\b/i;

function isSeparator(line: string): boolean {
  const s = line.replace(/\s/g, "");
  return s.length >= 5 && /^[-=_.~—–•*]+$/.test(s);
}

export function parseReceiptText(text: string, currency = "USD") {
  const dec = (CURRENCIES[currency] || CURRENCIES.USD).dec;
  const maxPrice = dec === 0 ? 100_000_000 : 100_000;
  const lines = text
    .split("\n")
    .map((l) => l.replace(/(\d)[.,]\s+(\d)/g, "$1.$2").trim())
    .filter(Boolean);

  const META =
    /date|tgl|order|customer|sales\s*type|user|cashier|kasir|collected|receipt|bill\s*name|queue|invoice/i;
  let totalsIdx = lines.findIndex((l) => TOTALS.test(l));
  if (totalsIdx < 0) totalsIdx = lines.length;
  const sepIdx = lines.findIndex(isSeparator);
  let headerEnd = -1;
  for (let i = 0; i < totalsIdx; i++) {
    if (/:/.test(lines[i]) || META.test(lines[i])) headerEnd = i;
  }
  const start = Math.max(sepIdx + 1, headerEnd + 1, 0);

  const items: { name: string; qty: number; price: number }[] = [];
  const priceRe = /([£$€¥₹]|Rp|S\$|A\$)?\s*(\d[\d.,]*\d|\d)\s*$/;
  const qtyLineRe = /^(\d{1,3})\s*[xX×@]\s*$/;
  const qtyLeadRe = /^(\d{1,3})\s*[xX×@](?:\s+(.+))?$/;

  let nameParts: string[] = [];
  let pendingQty = 0;
  const reset = () => {
    nameParts = [];
    pendingQty = 0;
  };
  const addName = (s: string) => {
    const cand = s.replace(/^[*.\-_·•\s]+|[*.\-_·•\s]+$/g, "").trim();
    if (cand.length < 2) return;
    if (/^[a-z]{1,2}$/.test(cand)) return;
    if (NOISE.test(cand)) return;
    nameParts.push(cand);
    if (nameParts.length > 2) nameParts.shift();
  };

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    if (isSeparator(line)) {
      reset();
      continue;
    }
    if (TOTALS.test(line)) break;
    if (/[:%]/.test(line)) {
      reset();
      continue;
    }

    const ql = line.match(qtyLineRe);
    if (ql) {
      pendingQty = Number(ql[1]) || 1;
      continue;
    }
    if (/^[iIl|]\s*[xX]\s*$/.test(line)) {
      pendingQty = pendingQty || 1;
      continue;
    }

    const m = line.match(priceRe);
    if (!m || m.index === undefined) {
      addName(line);
      continue;
    }

    const price = parsePrice(m[2], dec);
    if (price == null || price <= 0 || price > maxPrice) continue;

    let qty = pendingQty || 1;
    const lead = line.slice(0, m.index).trim().replace(/[.\-_·•\s]+$/, "");
    if (lead) {
      const led = lead.match(qtyLeadRe);
      if (led && Number(led[1]) <= 99) {
        qty = Number(led[1]);
        const rest = led[2]?.trim();
        if (rest && !/^@?[\d.,]+$/.test(rest)) addName(rest);
      } else if (/^[1iIl|]{1,2}\s*[xX@]/.test(lead)) {
        qty = pendingQty || 1;
      } else if (!/^@?[\d.,]+$/.test(lead)) {
        addName(lead);
      }
    }

    let name = nameParts.join(" ").replace(/\s+/g, " ").trim();
    name = name.replace(/^[xX×*@\-\s]+/, "").trim();
    reset();

    if (name.length < 2 || NOISE.test(name)) continue;
    if (qty < 1 || qty > 99) qty = 1;

    items.push({
      name: titleCase(name),
      qty,
      price: qty > 1 ? +(price / qty).toFixed(dec) : price,
    });
  }
  return items;
}

export function parseReceiptCharges(text: string): {
  taxPct: number;
  servicePct: number;
  discount: number;
} {
  let taxPct = 0;
  let servicePct = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const pm = line.match(/(\d{1,2}(?:[.,]\d)?)\s*%/);
    if (!pm) continue;
    const pct = Math.round(Number(pm[1].replace(",", ".")));
    if (pct <= 0 || pct > 50) continue;
    if (/serv|servis/i.test(line)) servicePct = pct;
    else if (/pb\s?1|ppn|pajak|tax|gst|vat/i.test(line) || /^\W*\(?\d/.test(line))
      taxPct = pct;
  }
  return { taxPct, servicePct, discount: 0 };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function toCloudImage(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const long = Math.max(img.width, img.height) || 1;
    const scale = Math.min(1, 1600 / long);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function scanReceipt(
  file: File,
  currency = "USD",
): Promise<ScanResult | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  try {
    const image = await toCloudImage(file);
    if (!image) return null;
    const res = await fetch("/api/scan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image, currency }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      items?: { name: string; qty: number; price: number }[];
      charges?: { taxPct: number; servicePct: number; discount: number };
      currency?: string;
    };
    if (!json.items?.length) return null;
    return {
      items: json.items,
      charges: json.charges || { taxPct: 0, servicePct: 0, discount: 0 },
      merchant: "Scanned receipt",
      currency: json.currency || currency,
      source: "ocr",
    };
  } catch {
    return null;
  }
}
