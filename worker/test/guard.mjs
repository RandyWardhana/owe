/**
 * Refuse to run the suites against anything but localhost.
 *
 * They write real rows and upload real objects. Pointed at the deployed Worker
 * they land in the live D1 and the live R2 bucket, and cleanup only ever
 * removed the rows — which left ten orphaned receipts in storage until someone
 * noticed the __key/__proof/__rm folders.
 *
 * This lives in its own module, not inside a test file: importing a test file
 * for a helper makes node:test execute its cases a second time, and two runs
 * sharing one fixture key trip over each other.
 */
export function assertNotProduction(base) {
  const local = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/.test(base);
  if (local || process.env.OWE_ALLOW_REMOTE_TESTS === "1") return;
  throw new Error(
    `Refusing to run against ${base}: this suite writes to D1 and R2. ` +
      "Start `wrangler dev --local` and set OWE_DB_URL=http://127.0.0.1:8787, " +
      "or set OWE_ALLOW_REMOTE_TESTS=1 if you truly mean production.",
  );
}
