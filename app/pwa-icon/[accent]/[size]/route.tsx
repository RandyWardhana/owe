import { ImageResponse } from "next/og";

import { knownAccent } from "@/lib/accents";
import { OWE_MARK_PATH } from "@/lib/brandMark";

/* The app icon in one of the six accents, for the per-device manifest.

   `any` is the rounded square of public/icon.svg; `maskable` is full-bleed,
   because Android crops maskable icons to its own shape and rounded corners
   would show as notches. The mark already sits inside the maskable safe zone
   (the centre 80% circle) at its original scale, so it is not resized.

   Built never to hand Chrome a broken icon -- a failed icon download fails the
   whole app update, or the install:
   - unknown accent or size: redirect to the static PNG of that size;
   - the image is rendered to bytes BEFORE responding, so a rendering error is
     caught here and also falls back to the static PNG, instead of surfacing
     halfway through a streamed response. */

const SIZES: Record<string, { px: number; maskable: boolean; fallback: string }> = {
  "192": { px: 192, maskable: false, fallback: "/icon-192x192.png" },
  "512": { px: 512, maskable: false, fallback: "/icon-512x512.png" },
  "maskable-512": { px: 512, maskable: true, fallback: "/icon-512x512.png" },
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accent: string; size: string }> },
): Promise<Response> {
  const { accent, size } = await params;
  const spec = SIZES[size];
  const color = knownAccent(accent);
  const fallback = new URL(spec?.fallback ?? "/icon-512x512.png", request.url);

  if (!spec || !color) return Response.redirect(fallback, 307);

  try {
    const image = new ImageResponse(
      (
        <div style={{ width: spec.px, height: spec.px, display: "flex" }}>
          <svg width={spec.px} height={spec.px} viewBox="0 0 512 512">
            <rect width="512" height="512" rx={spec.maskable ? 0 : 64} fill={color} />
            <path d={OWE_MARK_PATH} fill="#000000" />
          </svg>
        </div>
      ),
      { width: spec.px, height: spec.px },
    );
    const bytes = await image.arrayBuffer();
    if (bytes.byteLength === 0) throw new Error("empty icon");
    return new Response(bytes, {
      headers: {
        "Content-Type": "image/png",
        // The colour is in the URL, so the bytes for a URL never change.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return Response.redirect(fallback, 307);
  }
}
