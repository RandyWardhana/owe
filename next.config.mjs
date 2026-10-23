import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";

// Not `/` itself: a precached `/` is served cache-first even online, so a launch after a
// deploy would run the old build against chunks the new worker has already dropped.
const OFFLINE_SHELL_URL = "/~offline";
const OFFLINE_SHELL_REVISION = randomUUID();

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",

  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: true,
  // Appended here rather than via `additionalPrecacheEntries`, which replaces the public/ scan.
  manifestTransforms: [
    (manifest) => ({
      manifest: [...manifest, { url: OFFLINE_SHELL_URL, revision: OFFLINE_SHELL_REVISION, size: 0 }],
      warnings: [],
    }),
  ],
});

const nextConfig = {
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
