"use client";

import { useEffect } from "react";

import type { GlobalErrorProps } from "@/entities/props/app";

export default function GlobalError({
  error,
  reset,
}: GlobalErrorProps) {
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
              width: 72,
              height: 72,
              margin: "0 auto",
              display: "grid",
              placeItems: "center",
              borderRadius: "50%",
              background: "rgba(185, 114, 47, 0.14)",
              color: "#b9722f",
            }}
          >
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
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
