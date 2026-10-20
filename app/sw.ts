import { defaultCache } from "@serwist/next/worker";
import { NetworkFirst, Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // The per-device manifest and accent icons must reach Chrome fresh, or an
    // installed app never sees its new icon; the cache is only an offline fallback.
    // Listed ahead of the defaults so it wins the match.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/pwa-icon/")),
      handler: new NetworkFirst({ cacheName: "owe-manifest" }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
