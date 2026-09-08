import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { Worker } from "node:worker_threads";

const MAIN = "/tmp/lizard-regex-probe/node_modules/vscode-oniguruma/release/main.js";
const WASM = "/tmp/lizard-regex-probe/node_modules/vscode-oniguruma/release/onig.wasm";
const REQUEST = "/tmp/vibe-lizard-real-ts-profile-20260903/request.json";
type File = { path: string; source: string };
const files = (JSON.parse(readFileSync(REQUEST, "utf8")) as { files: File[] }).files;
const source = JSON.parse(readFileSync("/tmp/lizard-regex-probe/captured.json", "utf8")).find(
  (entry: { source: string }) => entry.source.includes("`.*?`")
).source as string;
if (source.length !== 395) throw new Error(`pattern expected 395, got ${source.length}`);
const onigPattern = `(?m)${source}`; // Oniguruma m supplies JS dotAll; JS m is default Onig line-anchor behavior.
const expected = {
  count: 296074,
  digest: "47aeb09352ba3a1e0cbe1c3bfb8e8262974bfe38103a74345163376c759d460e"
};
function now<T>(fn: () => T): { ms: number; value: T } {
  const start = performance.now();
  const value = fn();
  return { ms: performance.now() - start, value };
}
function median(values: number[]) {
  const xs = [...values].sort((a, b) => a - b);
  return xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2;
}
function rssMiB() {
  return process.memoryUsage().rss / 1024 / 1024;
}
function digestNative() {
  const h = createHash("sha256");
  let count = 0;
  for (const file of files)
    for (const m of file.source.matchAll(new RegExp(source, "gmsu"))) {
      count++;
      h.update(m[0]);
      h.update("\0");
      h.update(String(m.index));
      h.update("\0");
    }
  return { count, digest: h.digest("hex") };
}
const importStart = performance.now();
const onig: typeof import("/tmp/lizard-regex-probe/node_modules/vscode-oniguruma/release/main.js") =
  await import(MAIN);
const importMs = performance.now() - importStart;
const beforeLoadRssMiB = rssMiB();
const loadStart = performance.now();
await onig.loadWASM(readFileSync(WASM));
const loadMs = performance.now() - loadStart;
const afterLoadRssMiB = rssMiB();
function scanWithNewScanner(): { count: number; digest: string } {
  const scanner = onig.createOnigScanner([onigPattern]);
  try {
    return scanWithScanner(scanner);
  } finally {
    scanner.dispose();
  }
}
function scanWithScanner(scanner: ReturnType<typeof onig.createOnigScanner>): {
  count: number;
  digest: string;
} {
  const h = createHash("sha256");
  let count = 0;
  for (const file of files) {
    const text = onig.createOnigString(file.source);
    try {
      let position = 0;
      for (;;) {
        const match = scanner.findNextMatchSync(text, position);
        if (match === null) break;
        const capture = match.captureIndices[0];
        if (capture === undefined || capture.end <= position)
          throw new Error(`non-progress ${file.path} ${position}`);
        count++;
        h.update(file.source.slice(capture.start, capture.end));
        h.update("\0");
        h.update(String(capture.start));
        h.update("\0");
        position = capture.end;
      }
    } finally {
      text.dispose();
    }
  }
  return { count, digest: h.digest("hex") };
}
const nativeGuard = digestNative();
const disposableGuard = scanWithNewScanner();
if (
  JSON.stringify(nativeGuard) !== JSON.stringify(expected) ||
  JSON.stringify(disposableGuard) !== JSON.stringify(expected)
)
  throw new Error(`guard mismatch ${JSON.stringify({ nativeGuard, disposableGuard })}`);
const createDisposeSamples: number[] = [];
for (let i = 0; i < 100; i++)
  createDisposeSamples.push(
    now(() => {
      const scanner = onig.createOnigScanner([onigPattern]);
      scanner.dispose();
    }).ms
  );
const oneString = files.find((file) => /[^\x00-\x7F]/u.test(file.source))!;
const stringSamples: number[] = [];
for (let i = 0; i < 100; i++)
  stringSamples.push(
    now(() => {
      const text = onig.createOnigString(oneString.source);
      text.dispose();
    }).ms
  );
function consumeOnig(scanner: ReturnType<typeof onig.createOnigScanner>) {
  let count = 0;
  let observed = 0;
  for (const file of files) {
    const text = onig.createOnigString(file.source);
    try {
      let position = 0;
      for (;;) {
        const match = scanner.findNextMatchSync(text, position);
        if (match === null) break;
        const capture = match.captureIndices[0];
        if (capture === undefined || capture.end <= position)
          throw new Error(`non-progress ${file.path} ${position}`);
        count++;
        observed += file.source.slice(capture.start, capture.end).length + capture.start;
        position = capture.end;
      }
    } finally {
      text.dispose();
    }
  }
  if (count !== expected.count) throw new Error(`consume count ${count}`);
  return observed;
}
function consumeNative() {
  let count = 0;
  let observed = 0;
  for (const file of files)
    for (const match of file.source.matchAll(new RegExp(source, "gmsu"))) {
      count++;
      observed += match[0].length + match.index;
    }
  if (count !== expected.count) throw new Error(`native count ${count}`);
  return observed;
}
const scanner = onig.createOnigScanner([onigPattern]);
const warmSamples: number[] = [];
const nativeSamples: number[] = [];
for (let i = 0; i < 2; i++) {
  consumeOnig(scanner);
  consumeNative();
}
for (let i = 0; i < 5; i++) {
  warmSamples.push(now(() => consumeOnig(scanner)).ms);
  nativeSamples.push(now(() => consumeNative()).ms);
}
scanner.dispose();
const afterDisposeRssMiB = rssMiB();
async function workerRoundTrip(): Promise<{
  createMs: number;
  readyMs: number;
  terminateMs: number;
  payload: unknown;
}> {
  const createStart = performance.now();
  const worker = new Worker("/tmp/lizard-oniguruma-worker.ts");
  const createMs = performance.now() - createStart;
  const payload = await new Promise<unknown>((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
  });
  const readyMs = performance.now() - createStart;
  const terminateStart = performance.now();
  await worker.terminate();
  const terminateMs = performance.now() - terminateStart;
  return { createMs, readyMs, terminateMs, payload };
}
const workers = [];
for (let i = 0; i < 5; i++) workers.push(await workerRoundTrip());
console.log(
  JSON.stringify(
    {
      protocol:
        "/tmp-only probe. Pattern and corpus reproduce the previous 254-real-TypeScript raw guard. Onig scanner/string objects are explicitly disposed; warm scan includes OnigString UTF-16/UTF-8 conversion and capture-index conversion supplied by vscode-oniguruma. No repository runtime/import/lockfile changed.",
      environment: {
        bun: Bun.version,
        nodeCompatibility: process.version,
        platform: process.platform,
        arch: process.arch
      },
      artifact: {
        package: "vscode-oniguruma",
        version: "2.0.1",
        mainBytes: statSync(MAIN).size,
        wasmBytes: statSync(WASM).size,
        wasmPath: WASM
      },
      coldInThisProcess: { importMs, loadMs, beforeLoadRssMiB, afterLoadRssMiB },
      guards: { expected, nativeGuard, disposableGuard },
      lifecycle: {
        scannerCreateDispose100: {
          medianMs: median(createDisposeSamples),
          samplesMs: createDisposeSamples
        },
        onigStringCreateDispose100: {
          sourceUtf16Length: oneString.source.length,
          medianMs: median(stringSamples),
          samplesMs: stringSamples
        },
        rssAfterScannerAndStringDisposalMiB: afterDisposeRssMiB
      },
      warm254FileRawScan: {
        onigSamplesMs: warmSamples,
        onigMedianMs: median(warmSamples),
        nativeSamplesMs: nativeSamples,
        nativeMedianMs: median(nativeSamples),
        operation:
          "reads token text length and UTF-16 start; Onig must slice source because API returns capture ranges only",
        reusedSingleScanner: true,
        perFileOnigStringDispose: true
      },
      workers
    },
    null,
    2
  )
);
