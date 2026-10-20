import { NextResponse } from "next/server";

import { parseReceiptText, parseReceiptCharges } from "@/lib/ocr";

export const runtime = "nodejs";
export const maxDuration = 30;

/* Without OCRSPACE_API_KEY this falls back to OCR.space's rate-limited "helloworld"
   demo key. */
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
    form.set("base64Image", image);
    form.set("OCREngine", "2"); // best for receipts / mixed scripts
    form.set("isTable", "true"); // preserves the name | price column layout
    form.set("scale", "true");

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const data = (await response.json()) as {
      IsErroredOnProcessing?: boolean;
      ParsedResults?: { ParsedText?: string }[];
    };
    if (data.IsErroredOnProcessing || !data.ParsedResults?.length) {
      return NextResponse.json({ error: "ocr_failed" }, { status: 502 });
    }

    const text = data.ParsedResults[0].ParsedText || "";
    const currencyCode = currency || "USD";
    return NextResponse.json({
      items: parseReceiptText(text, currencyCode),
      charges: parseReceiptCharges(text),
      currency: currencyCode,
    });
  } catch {
    return NextResponse.json({ error: "scan_failed" }, { status: 500 });
  }
}
