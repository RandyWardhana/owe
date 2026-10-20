import { execFileSync } from "node:child_process";
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = ".test-build";

const ENTRIES = [
  "lib/addressBook.ts",
  "lib/util.ts",
  "lib/adminDb.ts",
  "lib/adminRestore.ts",
  "lib/calc.ts",
  "lib/historyMerge.ts",
  "lib/poll.ts",
  "lib/share.ts",
  "lib/shareId.ts",
  "lib/accents.ts",
  "lib/pwaManifest.ts",
  "lib/brandMark.ts",
  "lib/receipt.ts",
  "lib/pattern.ts",
];

rmSync(OUT, { recursive: true, force: true });

execFileSync(
  "npx",
  ["tsc", ...ENTRIES, "--outDir", OUT, "--rootDir", ".",
   "--module", "es2022", "--target", "es2022", "--lib", "es2022,dom",
   "--moduleResolution", "bundler", "--skipLibCheck"],
  { stdio: "inherit" },
);

cpSync(join(OUT, "lib"), OUT, { recursive: true });
rmSync(join(OUT, "lib"), { recursive: true, force: true });
rmSync(join(OUT, "entities"), { recursive: true, force: true });

/* tsc emits extensionless relative imports and Node's ESM resolver will not guess. */
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
