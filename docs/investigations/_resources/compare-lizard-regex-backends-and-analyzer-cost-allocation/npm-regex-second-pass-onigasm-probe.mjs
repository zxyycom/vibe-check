import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const PROBE_ROOT = "/tmp/lizard-regex-second-pass";
const onig = await import(
  pathToFileURL(join(PROBE_ROOT, "node_modules/onigasm/lib/index.js")).href
);
const pattern = JSON.parse(
  readFileSync(
    WORKSPACE_ROOT +
      "/docs/investigations/_resources/explain-cpython-jsc-lizard-regex-performance-gap/typescript-token-pattern.json",
    "utf8"
  )
);
const req = JSON.parse(
  readFileSync(
    WORKSPACE_ROOT +
      "/docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json",
    "utf8"
  )
);
function med(a) {
  a = [...a].sort((a, b) => a - b);
  return a[(a.length - 1) >> 1] + (a.length % 2 ? 0 : a[a.length / 2] - a[a.length / 2 - 1]) / 2;
}
function native() {
  let count = 0;
  const h = createHash("sha256");
  for (const f of req.files)
    for (const x of f.source.matchAll(new RegExp(pattern.source, pattern.flags))) {
      count++;
      h.update(x[0]);
      h.update("\0");
      h.update(String(x.index));
      h.update("\0");
    }
  return { count, digest: h.digest("hex") };
}
const expected = native();
const wasm = readFileSync(join(PROBE_ROOT, "node_modules/onigasm/lib/onigasm.wasm"));
const start = performance.now();
await onig.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
const initMs = performance.now() - start;
const scanner = new onig.OnigScanner([`(?m)${pattern.source}`]);
function scan() {
  let count = 0;
  const h = createHash("sha256");
  for (const f of req.files) {
    const text = new onig.OnigString(f.source);
    let at = 0;
    while (at < text.length) {
      const m = scanner.findNextMatchSync(text, at);
      if (!m) break;
      const c = m.captureIndices[0];
      if (c.end <= at) throw Error("non-progress");
      count++;
      h.update(f.source.slice(c.start, c.end));
      h.update("\0");
      h.update(String(c.start));
      h.update("\0");
      at = c.end;
    }
  }
  return { count, digest: h.digest("hex") };
}
const a = scan();
if (JSON.stringify(a) !== JSON.stringify(expected)) throw Error(JSON.stringify({ expected, a }));
const rows = [];
for (let i = 0; i < 3; i++) {
  const t = performance.now();
  const x = scan();
  if (JSON.stringify(x) !== JSON.stringify(expected)) throw Error("drift");
  rows.push(performance.now() - t);
}
console.log(
  JSON.stringify(
    {
      environment: { bun: Bun.version, node: process.version },
      patternChars: pattern.length,
      guard: expected,
      parity: true,
      initMs,
      warmSamplesMs: rows,
      warmMedianMs: med(rows),
      packageUnpackedBytes: 565820,
      wasmBytes: statSync(join(PROBE_ROOT, "node_modules/onigasm/lib/onigasm.wasm")).size,
      lifecycle:
        "no public scanner/string dispose; scanner compiled code stays in module-global LRU cache until eviction",
      maintenance: "latest npm release 2.2.5 published 2020-09-22"
    },
    null,
    2
  )
);
