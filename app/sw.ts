import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // The manifest and the accent icons are per device and must reach Chrome
    // fresh, or an installed app never sees its new icon. Network first,
    // with the last copy only as an offline fallback. Listed ahead of the
    // defaults so this does not depend on how they happen to match.
    {
      matcher: ({ url, sameOrigin }) =>
        sameOrigin && (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/pwa-icon/")),
      handler: new NetworkFirst({ cacheName: "owe-manifest" }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
