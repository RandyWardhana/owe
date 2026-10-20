// Existing icon links are repointed rather than a new one added, because Chrome prefers an SVG
// favicon over any PNG. <head> is watched because Next adds another /icon.svg link after hydration.

const DEFAULT_FILL = /fill="#9BE52E"/i;
const PNG_SIZE = 64;

let source: Promise<string | null> | null = null;
// Calls overlap while someone taps through swatches; only the latest may write.
let latest = 0;
let current: { svg: string; png: string | null } | null = null;
let watcher: MutationObserver | null = null;

function loadSource(): Promise<string | null> {
  if (!source) {
    source = fetch("/icon.svg")
      .then((res) => (res.ok ? res.text() : null))
      .catch(() => null);
  }
  return source;
}

async function toPng(svgUrl: string): Promise<string | null> {
  const img = new Image();
  img.src = svgUrl;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = PNG_SIZE;
  canvas.height = PNG_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, PNG_SIZE, PNG_SIZE);
  return canvas.toDataURL("image/png");
}

function recolour(link: HTMLLinkElement): void {
  if (!current) return;
  const isSvg = link.type === "image/svg+xml" || /\.svg(\?|$)/.test(link.getAttribute("href") || "");
  const want = isSvg ? current.svg : current.png;
  if (want && link.href !== want) link.href = want;
}

function recolourAll(): void {
  // Apple's touch icon is left alone: a data: URL there would be saved to the home screen.
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach(recolour);
}

function watchHead(): void {
  if (watcher) return;
  watcher = new MutationObserver(recolourAll);
  // Attributes too: a re-render can reset an existing link's href.
  watcher.observe(document.head, { childList: true, subtree: true, attributes: true, attributeFilter: ["href"] });
}

export async function applyAccentFavicon(accent: string): Promise<void> {
  if (typeof document === "undefined") return;
  const call = ++latest;

  const svg = await loadSource();
  if (!svg || !DEFAULT_FILL.test(svg)) return;

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svg.replace(DEFAULT_FILL, `fill="${accent}"`),
  )}`;
  const pngUrl = await toPng(svgUrl);
  if (call !== latest) return;

  current = { svg: svgUrl, png: pngUrl };
  recolourAll();
  watchHead();
}
