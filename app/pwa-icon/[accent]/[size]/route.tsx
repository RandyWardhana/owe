import { ImageResponse } from "next/og";

import { knownAccent } from "@/lib/accents";
import { OWE_MARK_PATH } from "@/lib/brandMark";
import type { PwaIconParams } from "@/entities/props/app";

/* `maskable` is full-bleed because Android crops it to its own shape. A failed icon
   download fails the whole app update or install, so every failure redirects to the
   static PNG, and the bytes are rendered before responding so render errors land here. */

const SIZES: Record<string, { px: number; maskable: boolean; fallback: string }> = {
  "192": { px: 192, maskable: false, fallback: "/icon-192x192.png" },
  "512": { px: 512, maskable: false, fallback: "/icon-512x512.png" },
  "maskable-512": { px: 512, maskable: true, fallback: "/icon-512x512.png" },
};

export async function GET(
  request: Request,
  { params }: PwaIconParams,
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
