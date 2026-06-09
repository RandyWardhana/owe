import { NextResponse } from "next/server";

import { parseReceiptText, parseReceiptCharges } from "@/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 30;

/* Cloud OCR via OCR.space → existing receipt parser. The free "helloworld" demo
   key works out of the box (rate-limited); set OCRSPACE_API_KEY to your own free
   key (https://ocr.space/ocrapi, 25k/month) for reliability. */
export async function POST(req: Request) {
  const apiKey = process.env.OCRSPACE_API_KEY || "helloworld";
  try {
    const { image, currency } = (await req.json()) as {
      image?: string;
      currency?: string;
    };
    if (!image) {
      return NextResponse.json({ error: "no_image" }, { status: 400 });
    }

    const form = new URLSearchParams();
    form.set("base64Image", image); // data URL
    form.set("OCREngine", "2"); // best for receipts / mixed scripts
    form.set("isTable", "true"); // preserves the name | price column layout
    form.set("scale", "true");

    const r = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = (await r.json()) as {
      IsErroredOnProcessing?: boolean;
      ParsedResults?: { ParsedText?: string }[];
    };
    if (data.IsErroredOnProcessing || !data.ParsedResults?.length) {
      return NextResponse.json({ error: "ocr_failed" }, { status: 502 });
    }

    const text = data.ParsedResults[0].ParsedText || "";
    const cur = currency || "USD";
    return NextResponse.json({
      items: parseReceiptText(text, cur),
      charges: parseReceiptCharges(text),
      currency: cur,
    });
  } catch {
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }
}
