import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const request = JSON.parse(
  readFileSync(
    join(
      root,
      "docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json"
    ),
    "utf8"
  )
);
const pattern = JSON.parse(
  readFileSync(
    join(
      root,
      "docs/investigations/_resources/explain-cpython-jsc-lizard-regex-performance-gap/typescript-token-pattern.json"
    ),
    "utf8"
  )
).source;
const expected = {
  count: 296074,
  digest: "47aeb09352ba3a1e0cbe1c3bfb8e8262974bfe38103a74345163376c759d460e"
};

function mapUtf8StartsToUtf16(text, starts) {
  const mapped = new Array(starts.length);
  let target = 0;
  let bytes = 0;
  for (let utf16 = 0; target < starts.length;) {
    while (target < starts.length && starts[target] === bytes) mapped[target++] = utf16;
    if (utf16 >= text.length) break;
    const unit = text.charCodeAt(utf16);
    let width16 = 1;
    let width8;
    if (unit >= 0xd800 && unit <= 0xdbff && utf16 + 1 < text.length) {
      const next = text.charCodeAt(utf16 + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        width16 = 2;
        width8 = 4;
      }
    }
    if (width8 === undefined) {
      // TextEncoder/rg UTF-8 behavior for an unpaired surrogate is U+FFFD (3 bytes).
      width8 = unit >= 0xd800 && unit <= 0xdfff ? 3 : unit <= 0x7f ? 1 : unit <= 0x7ff ? 2 : 3;
    }
    utf16 += width16;
    bytes += width8;
  }
  while (target < starts.length && starts[target] === bytes) mapped[target++] = text.length;
  if (target !== starts.length)
    throw new Error(`unmapped byte start ${starts[target]} in ${bytes}-byte source`);
  return mapped;
}

function materialize() {
  const directory = mkdtempSync(join(tmpdir(), "lizard-rg-cli-"));
  const paths = [];
  for (let index = 0; index < request.files.length; index++) {
    const path = join(directory, `${index}.ts`);
    writeFileSync(path, request.files[index].source, "utf8");
    paths.push(path);
  }
  return { directory, paths };
}

function scanAndGuard(paths) {
  const result = Bun.spawnSync(
    ["rg", "--pcre2", "-U", "-o", "--json", "-e", `(?sm)${pattern}`, ...paths],
    {
      stdout: "pipe",
      stderr: "pipe"
    }
  );
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr));
  const output = new TextDecoder().decode(result.stdout);
  const byIndex = new Map();
  for (const event of output.trimEnd().split("\n").map(JSON.parse)) {
    if (event.type !== "match") continue;
    const index = Number(event.data.path.text.match(/\/(\d+)\.ts$/u)?.[1]);
    byIndex.set(index, event.data);
  }
  const hash = createHash("sha256");
  let count = 0;
  for (let index = 0; index < request.files.length; index++) {
    const data = byIndex.get(index);
    if (data === undefined) throw new Error(`missing file ${index}`);
    const starts = data.submatches.map((submatch) => submatch.start);
    const offsets = mapUtf8StartsToUtf16(data.lines.text, starts);
    for (let tokenIndex = 0; tokenIndex < data.submatches.length; tokenIndex++) {
      const text = data.submatches[tokenIndex].match.text;
      hash.update(text);
      hash.update("\0");
      hash.update(String(offsets[tokenIndex]));
      hash.update("\0");
      count++;
    }
  }
  const guard = { count, digest: hash.digest("hex") };
  if (guard.count !== expected.count || guard.digest !== expected.digest)
    throw new Error(JSON.stringify({ expected, guard }));
  return { bytes: result.stdout.byteLength, guard };
}

function one() {
  const totalStart = performance.now();
  const materializeStart = performance.now();
  const { directory, paths } = materialize();
  const materializeMs = performance.now() - materializeStart;
  let scan;
  let scanAndReconstructMs;
  try {
    const start = performance.now();
    scan = scanAndGuard(paths);
    scanAndReconstructMs = performance.now() - start;
  } finally {
    const cleanupStart = performance.now();
    rmSync(directory, { recursive: true, force: true });
    var cleanupMs = performance.now() - cleanupStart;
  }
  return {
    materializeMs,
    scanAndReconstructMs,
    cleanupMs,
    totalMs: performance.now() - totalStart,
    stdoutBytes: scan.bytes,
    guard: scan.guard,
    rssAfterBytes: process.memoryUsage().rss
  };
}

// One untimed check warms program imports and validates all boundaries.
one();
const samples = Array.from({ length: 7 }, one);
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) >> 1];
}
console.log(
  JSON.stringify(
    {
      runtime: { bun: Bun.version, rg: "15.2.0, PCRE2 10.45 JIT available" },
      scope:
        "Each sample writes 254 decoded JS source strings to a fresh temp directory, spawns rg with PCRE2/multiline/JSON, decodes/parses output, maps every per-file UTF-8 byte start to JS UTF-16, and hashes matched text plus offsets. It does not enter CodeReader macro grouping, readers, processors, Worker or Product.",
      expected,
      median: {
        materializeMs: median(samples.map((sample) => sample.materializeMs)),
        scanAndReconstructMs: median(samples.map((sample) => sample.scanAndReconstructMs)),
        cleanupMs: median(samples.map((sample) => sample.cleanupMs)),
        totalMs: median(samples.map((sample) => sample.totalMs)),
        stdoutBytes: median(samples.map((sample) => sample.stdoutBytes)),
        rssAfterBytes: median(samples.map((sample) => sample.rssAfterBytes))
      },
      samples
    },
    null,
    2
  )
);
