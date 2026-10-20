/* The tab icon in the accent the user picked.

   public/icon.svg is the lime square with the black "owe" mark. Rather than
   copy that path into code, the file is fetched once and only its square's
   fill is swapped, so redrawing the mark in the SVG keeps working here too.

   Every icon <link> is repointed at the recoloured version -- the SVG link
   gets an SVG, the PNG ones a PNG drawn from it. Adding one more link instead
   does not work: Chrome prefers an SVG favicon over any PNG, so the original
   lime icon.svg kept winning. And it has to cover links that arrive LATER as
   well: Next adds another /icon.svg link after hydration, after this has
   already run once, and that late one was what the tab showed. So <head> is
   watched, and any icon link that turns up is recoloured as it lands.

   Only the browser tab changes. The home-screen icon comes from the manifest
   and is fixed when the app is installed. */

const DEFAULT_FILL = /fill="#9BE52E"/i;
const PNG_SIZE = 64;

let source: Promise<string | null> | null = null;

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

// Several calls can overlap while someone taps through the swatches; only the
// last one may write, or a slow earlier render would land after it.
let latest = 0;
let current: { svg: string; png: string | null } | null = null;
let watcher: MutationObserver | null = null;

function recolour(link: HTMLLinkElement): void {
  if (!current) return;
  const isSvg = link.type === "image/svg+xml" || /\.svg(\?|$)/.test(link.getAttribute("href") || "");
  const want = isSvg ? current.svg : current.png;
  if (want && link.href !== want) link.href = want;
}

function recolourAll(): void {
  // Apple's touch icon is left alone: it is what gets saved to a home screen,
  // and a data: URL there would be the wrong thing to keep.
  document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]').forEach(recolour);
}

function watchHead(): void {
  if (watcher) return;
  watcher = new MutationObserver(recolourAll);
  // Attributes too: a re-render that resets an existing link's href.
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
