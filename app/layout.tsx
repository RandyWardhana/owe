import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "owe — scan · split · settle",
  description:
    "Scan a receipt, split it, settle up. Offline-first. Nothing leaves your phone unless you share it.",
  applicationName: "owe",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "owe",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icon-180x180.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#15160e" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('owe.v1')||'{}').state||{};var d=document.documentElement;if(s.theme)d.setAttribute('data-theme',s.theme);if(s.anim===false)d.setAttribute('data-anim','off');if(s.accent)d.style.setProperty('--accent',s.accent);}catch(e){}})();`,
          }}
        />
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
