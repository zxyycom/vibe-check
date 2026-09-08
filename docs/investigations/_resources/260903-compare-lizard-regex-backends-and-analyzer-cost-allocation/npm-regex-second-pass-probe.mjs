import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath, pathToFileURL } from "node:url";

const WORKSPACE_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const PROBE_ROOT = "/tmp/lizard-regex-second-pass";
const packageEntrypoints = {
  "pcre2-wasm": "pcre2-wasm/lib/index.js",
  "@ofjansen/pcre2-wasm": "@ofjansen/pcre2-wasm/dist/libpcre2.js",
  "pcre2-wasm-universal": "pcre2-wasm-universal/src/PCRE.js"
};
const importProbePackage = (name) =>
  import(pathToFileURL(join(PROBE_ROOT, "node_modules", packageEntrypoints[name])).href);
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
const target = process.argv[2] ?? "all";
const modernMode = process.env.MODERN_MODE ?? "iterator";
const samples = 3;
function median(a) {
  a = [...a].sort((x, y) => x - y);
  return a[(a.length - 1) >> 1] + (a.length % 2 ? 0 : a[a.length / 2] - a[a.length / 2 - 1]) / 2;
}
function native() {
  const h = createHash("sha256");
  let count = 0;
  for (const f of req.files) {
    for (const m of f.source.matchAll(new RegExp(pattern.source, pattern.flags))) {
      count++;
      h.update(m[0]);
      h.update("\0");
      h.update(String(m.index));
      h.update("\0");
    }
  }
  return { count, digest: h.digest("hex") };
}
const expected = native();
function timing(f) {
  const t = performance.now();
  const value = f();
  return { ms: performance.now() - t, value };
}
function result(label, fn) {
  try {
    return { label, ...fn() };
  } catch (e) {
    return {
      label,
      error: {
        name: e?.name,
        message: String(e?.message ?? e),
        stack: String(e?.stack ?? "")
          .split("\n")
          .slice(0, 5)
      }
    };
  }
}
function validate(label, scan, details = {}) {
  return result(label, () => {
    const first = scan();
    if (JSON.stringify(first) !== JSON.stringify(expected))
      throw new Error(`parity ${JSON.stringify({ expected, actual: first })}`);
    const rows = [];
    for (let i = 0; i < samples; i++) {
      const x = timing(scan);
      if (JSON.stringify(x.value) !== JSON.stringify(expected)) throw Error("warm parity drift");
      rows.push(x.ms);
    }
    return {
      api: "text + index exposed",
      patternChars: pattern.length,
      flags: pattern.flags,
      files: req.files.length,
      expected,
      parity: true,
      warmSamplesMs: rows,
      warmMedianMs: median(rows),
      ...details
    };
  });
}
async function modern() {
  const importStart = performance.now();
  const m = await importProbePackage("pcre2-wasm");
  const importMs = performance.now() - importStart;
  const initStart = performance.now();
  const p = await m.createPCRE2();
  const initMs = performance.now() - initStart;
  const flags = m.parseFlags("msuU");
  const compileStart = performance.now();
  const re = p.compile(pattern.source, flags);
  const compileMs = performance.now() - compileStart;
  try {
    return validate(
      "pcre2-wasm@10.47.5",
      () => {
        const h = createHash("sha256");
        let count = 0;
        for (const f of req.files)
          for (const x of modernMode === "all"
            ? re.matchAll(f.source)
            : re.matchAllIterator(f.source)) {
            count++;
            h.update(x.match);
            h.update("\0");
            h.update(String(x.index));
            h.update("\0");
          }
        return { count, digest: h.digest("hex") };
      },
      {
        delivery: "WASM embedded in dist/pcre2.js; no .wasm file packaged",
        importMs,
        initMs,
        compileMs,
        packageUnpackedBytes: 571123,
        scanApi: modernMode,
        dispose: "PCRE2Regex.destroy() explicit (FinalizationRegistry only safety net)"
      }
    );
  } finally {
    re.destroy();
  }
}
async function of() {
  const importStart = performance.now();
  const mod = await importProbePackage("@ofjansen/pcre2-wasm");
  const importMs = performance.now() - importStart;
  const lib = mod.default();
  const initStart = performance.now();
  await lib.PCRE.init();
  const initMs = performance.now() - initStart;
  const re = new lib.PCRE(pattern.source, "ms");
  try {
    return validate(
      "@ofjansen/pcre2-wasm@1.4.0",
      () => {
        const h = createHash("sha256");
        let count = 0;
        for (const f of req.files)
          for (const x of re.matchAll(f.source)) {
            count++;
            h.update(x[0].match);
            h.update("\0");
            h.update(String(x[0].start));
            h.update("\0");
          }
        return { count, digest: h.digest("hex") };
      },
      {
        delivery: "package needs external libpcre2.wasm",
        importMs,
        initMs,
        packageUnpackedBytes: 406336,
        dispose: "PCRE.destroy() explicit"
      }
    );
  } finally {
    re.destroy();
  }
}
async function universal() {
  const importStart = performance.now();
  const mod = await importProbePackage("pcre2-wasm-universal");
  const importMs = performance.now() - importStart;
  const PCRE = mod.default;
  const initStart = performance.now();
  await PCRE.init();
  const initMs = performance.now() - initStart;
  const re = new PCRE(pattern.source, "ms");
  try {
    return validate(
      "pcre2-wasm-universal@1.0.0",
      () => {
        const h = createHash("sha256");
        let count = 0;
        for (const f of req.files)
          for (const x of re.matchAll(f.source)) {
            count++;
            h.update(x[0].match);
            h.update("\0");
            h.update(String(x[0].start));
            h.update("\0");
          }
        return { count, digest: h.digest("hex") };
      },
      {
        delivery: "external dist/libpcre2.wasm",
        importMs,
        initMs,
        packageUnpackedBytes: 641535,
        wasmBytes: statSync(
          join(PROBE_ROOT, "node_modules/pcre2-wasm-universal/dist/libpcre2.wasm")
        ).size,
        dispose: "PCRE.destroy() explicit"
      }
    );
  } finally {
    re.destroy();
  }
}
const out = {
  environment: {
    bun: Bun.version,
    node: process.version,
    platform: process.platform,
    arch: process.arch
  },
  corpus: {
    files: req.files.length,
    utf16Units: req.files.reduce((n, x) => n + x.source.length, 0)
  },
  expected,
  results: []
};
if (target === "all" || target === "modern") out.results.push(await modern());
if (target === "all" || target === "of") out.results.push(await of());
if (target === "all" || target === "universal") out.results.push(await universal());
console.log(JSON.stringify(out, null, 2));
