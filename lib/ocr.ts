import { CURRENCIES } from "./currency";
import type { ScanResult } from "./types";

export const DEMO_RECEIPT = {
  merchant: "Corner Café",
  currency: "USD",
  items: [
    { name: "Flat White", qty: 2, price: 4.5 },
    { name: "Avocado Toast", qty: 1, price: 11.0 },
    { name: "Blueberry Pancakes", qty: 1, price: 12.5 },
    { name: "Fresh OJ", qty: 2, price: 5.0 },
    { name: "Side of Bacon", qty: 1, price: 4.0 },
  ],
  charges: { taxPct: 8, servicePct: 10, discount: 0 },
};

const NOISE =
  /(sub\s*total|total|tax|gst|vat|ppn|service|charge|biaya|cash|change|kembali|balance|visa|master|debit|credit|kredit|qris|gopay|ovo|dana|card|tip|round|amount|due|bayar|tunai|nontunai|qty|item|thank|terima|www|http|tel|telp|receipt|invoice|struk|table|meja|server|kasir|cashier|date|tgl|time|order|pajak|jumlah|diskon|discount|potongan|npwp)/i;

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

export function parseReceiptText(text: string, currency = "USD") {
  const dec = (CURRENCIES[currency] || CURRENCIES.USD).dec;
  const maxPrice = dec === 0 ? 100_000_000 : 100_000;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const items: { name: string; qty: number; price: number }[] = [];
  const priceRe = /([£$€¥₹]|Rp|S\$|A\$)?\s*(\d[\d.,]*\d|\d)\s*$/;

  for (const line of lines) {
    if (/%/.test(line)) continue;
    const m = line.match(priceRe);
    if (!m || m.index === undefined) continue;
    const price = parsePrice(m[2], dec);
    if (price == null || price <= 0 || price > maxPrice) continue;

    let name = line
      .slice(0, m.index)
      .trim()
      .replace(/[.\-_·•\s]+$/, "");
    let qty = 1;
    const q = name.match(/^(\d{1,2})\s*[xX×@]?\s+(.*)$/);
    if (q && Number(q[1]) >= 1 && Number(q[1]) <= 30) {
      qty = Number(q[1]);
      name = q[2].trim();
    }
    name = name.replace(/^[xX×*@\-\s]+/, "").trim();
    if (name.length < 2) continue;
    if (NOISE.test(name) && !/\d/.test(name)) continue;

    items.push({
      name: titleCase(name),
      qty,
      price: qty > 1 ? +(price / qty).toFixed(dec) : price,
    });
  }
  return items;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function preprocess(file: File): Promise<HTMLCanvasElement | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const long = Math.max(img.width, img.height) || 1;
    const scale = Math.min(Math.max(1800 / long, 0.5), 3);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    const image = ctx.getImageData(0, 0, w, h);
    const d = image.data;
    let min = 255;
    let max = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      d[i] = d[i + 1] = d[i + 2] = g;
      if (g < min) min = g;
      if (g > max) max = g;
    }
    const range = Math.max(1, max - min);
    for (let i = 0; i < d.length; i += 4) {
      let v = ((d[i] - min) / range) * 255;
      v = (v - 128) * 1.35 + 128;
      v = v < 0 ? 0 : v > 255 ? 255 : v;
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

type ProgressFn = (p: number, status?: string) => void;

export async function scanReceipt(
  file: File,
  onProgress?: ProgressFn,
  langs = "eng",
  currency = "USD",
): Promise<ScanResult> {
  const fallback = (): ScanResult => ({
    ...DEMO_RECEIPT,
    items: DEMO_RECEIPT.items.map((i) => ({ ...i })),
    source: "demo",
  });

  let worker: Awaited<ReturnType<typeof import("tesseract.js").createWorker>> | null = null;
  try {
    onProgress?.(0.04, "load");
    const Tesseract = await Promise.race([
      import("tesseract.js"),
      new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 20000)),
    ]);

    onProgress?.(0.1, "load");
    const input = (await preprocess(file)) ?? file;

    worker = await Tesseract.createWorker(langs, 1, {
      logger: (m: { status: string; progress: number }) => {
        if (m.status === "recognizing text") onProgress?.(0.2 + m.progress * 0.75, "read");
      },
    });
    await worker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    onProgress?.(0.2, "read");
    const { data } = await worker.recognize(input);
    const items = parseReceiptText(data.text || "", currency);
    onProgress?.(0.98, "tidy");

    if (items.length >= 2) {
      return {
        items: items.slice(0, 40),
        charges: { taxPct: 0, servicePct: 0, discount: 0 },
        merchant: "Scanned receipt",
        currency,
        source: "ocr",
        rawText: data.text,
      };
    }
    return {
      ...fallback(),
      source: items.length ? "partial" : "demo",
      partialItems: items,
    };
  } catch {
    return fallback();
  } finally {
    await worker?.terminate().catch(() => {});
  }
}
