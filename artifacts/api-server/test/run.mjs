import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cases = ["judge-readiness", "localization", "municipality"];
await build({
  absWorkingDir: root,
  entryPoints: cases.map((name) => `test/${name}.ts`),
  bundle: true,
  platform: "node",
  format: "esm",
  outdir: "dist/tests",
  outExtension: { ".js": ".mjs" },
  // Keep native SQLite external; bundle source-exporting workspace dependencies.
  external: ["better-sqlite3"],
  // Transitive CommonJS dependencies still need Node's built-in require.
  banner: { js: 'import { createRequire as testRequire } from "node:module"; const require = testRequire(import.meta.url);' },
});
for (const name of cases) {
  const result = spawnSync(process.execPath, [resolve(root, `dist/tests/${name}.mjs`)], {
    cwd: root, stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
