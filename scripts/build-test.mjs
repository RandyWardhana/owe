/* Compiles the pure lib modules under test to .test-build, then rewrites the
   emitted relative imports to carry .js — tsc leaves them extensionless and
   Node's ESM resolver will not guess. */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = ".test-build";

execFileSync(
  "npx",
  ["tsc", "lib/addressBook.ts", "lib/util.ts", "lib/adminDb.ts", "lib/adminRestore.ts", "--outDir", OUT,
   "--module", "es2022", "--target", "es2022",
   "--moduleResolution", "bundler", "--skipLibCheck"],
  { stdio: "inherit" },
);

for (const name of readdirSync(OUT).filter((f) => f.endsWith(".js"))) {
  const path = join(OUT, name);
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace(
      /(from\s+")(\.\.?\/[^"]+?)(")/g,
      (_, a, spec, b) => a + spec + (spec.endsWith(".js") ? "" : ".js") + b,
    ),
  );
}
