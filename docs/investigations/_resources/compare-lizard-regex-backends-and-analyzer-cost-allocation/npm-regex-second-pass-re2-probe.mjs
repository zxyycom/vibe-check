import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const PROBE_ROOT = "/tmp/lizard-regex-second-pass";
const { RE2: Adguard } = await import(
  pathToFileURL(join(PROBE_ROOT, "node_modules/@adguard/re2-wasm/build/src/re2.js")).href
);
const { RE2JS } = await import(
  pathToFileURL(join(PROBE_ROOT, "node_modules/re2js/build/index.js")).href
);
const p = JSON.parse(
  readFileSync(
    WORKSPACE_ROOT +
      "/docs/investigations/_resources/explain-cpython-jsc-lizard-regex-performance-gap/typescript-token-pattern.json",
    "utf8"
  )
);
function run(label, f) {
  try {
    const r = f();
    console.log(JSON.stringify({ label, ok: true, source: r?.source, flags: r?.flags }));
  } catch (e) {
    console.log(
      JSON.stringify({
        label,
        ok: false,
        error: { name: e?.name, message: String(e?.message ?? e) }
      })
    );
  }
}
console.log(
  JSON.stringify({
    environment: { bun: Bun.version, node: process.version },
    patternChars: p.length,
    flags: p.flags,
    adguardWasmBytes: statSync(
      join(PROBE_ROOT, "node_modules/@adguard/re2-wasm/build/wasm/re2.wasm")
    ).size
  })
);
run("@adguard/re2-wasm@1.2.1", () => new Adguard(p.source, p.flags));
run("re2js@2.8.6", () => RE2JS.compile(p.source));
