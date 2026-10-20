import type { Metadata, Viewport } from "next";
import { Manrope, Bricolage_Grotesque } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import AnalyticsBridge from "@/components/AnalyticsBridge";
import ClickSpark from "@/components/ui/ClickSpark";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000";
const TITLE = "owe — scan · split · settle";
const DESCRIPTION =
  "Scan a receipt, split it, settle up. Offline-first. Your bills stay on your phone unless you share them.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "owe",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "owe",
  },
  openGraph: {
    type: "website",
    siteName: "owe",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/icon-512x512.png", width: 512, height: 512 }],
  },
  twitter: {
    card: "summary",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/icon-512x512.png"],
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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbf7" },
    { media: "(prefers-color-scheme: dark)", color: "#15160e" },
  ],
};

const bootScript =
  `(function(){try{var s=JSON.parse(localStorage.getItem('owe.v1')||'{}').state||{};var d=document.documentElement;if(s.theme)d.setAttribute('data-theme',s.theme);if(s.anim===false)d.setAttribute('data-anim','off');if(s.accent)d.style.setProperty('--accent',s.accent);}catch(e){}})();` +
  (process.env.NODE_ENV === "development"
    ? `if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){rs.forEach(function(r){r.unregister()})}).catch(function(){});if(window.caches){caches.keys().then(function(ks){ks.forEach(function(k){caches.delete(k)})}).catch(function(){})}}`
    : "");

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        {/* Rendered here, not through `metadata.manifest`, for one attribute:
            use-credentials. Without it browsers fetch the manifest without
            cookies, so the accent cookie never reaches the manifest route and
            an installed app could never pick up its accent icon. React puts
            the <link> in <head>. */}
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <div id="root">{children}</div>
        <Analytics />
        <AnalyticsBridge />
        {/* One canvas for every route -- the app, shared links, /landing,
            /admin -- instead of one per screen inside App, which left the
            pages outside it without the click spark. */}
        <ClickSpark />
      </body>
    </html>
  );
}
