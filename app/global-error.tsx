"use client";

import { useEffect } from "react";

import { Warning } from "@/components/icons";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
          background: "#fbfbf7",
          color: "#16170f",
          font: "16px/1.5 system-ui, -apple-system, sans-serif",
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #15160e !important; color: #fbfbf7 !important; }
            .ge-btn { background: #b7f25a !important; color: #16170f !important; }
          }
        `}</style>
        <main style={{ maxWidth: 420, textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: 62,
              height: 62,
              margin: "0 auto",
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: "rgba(185, 114, 47, 0.14)",
              color: "#b9722f",
            }}
          >
            <Warning size={28} />
          </div>
          <h1 style={{ fontSize: 22, margin: "16px 0 8px", fontWeight: 700 }}>
            owe could not start
          </h1>
          <p style={{ margin: "0 0 24px", opacity: 0.75 }}>
            Your splits are saved on this device and have not been lost.
            Reloading usually fixes it.
          </p>
          <button
            className="ge-btn"
            onClick={() => reset()}
            style={{
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
              border: 0,
              borderRadius: 999,
              padding: "12px 28px",
              background: "#9be52e",
              color: "#16170f",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p style={{ marginTop: 20, fontSize: 13, opacity: 0.55 }}>
              Reference: <code>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
