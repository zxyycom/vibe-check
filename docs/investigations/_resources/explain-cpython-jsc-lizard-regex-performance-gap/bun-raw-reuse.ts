import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

type File = { path: string; source: string };
type Request = { files: readonly File[] };
const ROOT = process.cwd();
const req = JSON.parse(
  readFileSync(
    `${ROOT}/docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json`,
    "utf8"
  )
) as Request;
const symbols = [
  "<<=",
  ">>=",
  "||",
  "&&",
  "===",
  "!==",
  "==",
  "!=",
  "<=",
  ">=",
  "->",
  "=>",
  "++",
  "--",
  "+=",
  "-=",
  "+",
  "-",
  "*",
  "/",
  "*=",
  "/=",
  "^=",
  "&=",
  "|=",
  "..."
];
const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const addition = "|(?:#\\w+)|(?:\\$\\w+)|(?:\\w+\\?)|`.*?`";
const whitespace = "(?:(?!\\n)(?:\\p{White_Space}|[\u001c-\u001f]))";
const untilEnd = String.raw`(?:\\\n|[^\n])*`;
const source =
  "(?:" +
  String.raw`\/\*.*?\*\/` +
  addition +
  String.raw`|(?:\d+')+\d+` +
  String.raw`|0x(?:[0-9A-Fa-f]+')+[0-9A-Fa-f]+` +
  String.raw`|0b(?:[01]+')+[01]+` +
  String.raw`|[\p{L}\p{N}_]+` +
  String.raw`|"(?:\\.|[^"\\])*"` +
  String.raw`|'(?:\\.|[^'\\])*?'` +
  String.raw`|\/\/` +
  untilEnd +
  String.raw`|#|:=|::|\*\*` +
  String.raw`|<(?=(?:[^<>?]*\?)+[^<>]*>)(?:[\w\s,.?]|(?:extends))+>` +
  `|${symbols.map(esc).join("|")}` +
  String.raw`|\\\n|\n|` +
  whitespace +
  String.raw`+|.)`;
const flags = "gmsu";
const expectedPatternLength = 393;
if (source.length !== expectedPatternLength)
  throw Error(`source length ${source.length}, expected ${expectedPatternLength}`);

function digestScan(consume: (f: File, emit: (text: string, index: number) => void) => void) {
  const h = createHash("sha256");
  let count = 0;
  let chars = 0;
  for (const f of req.files)
    consume(f, (text, index) => {
      count++;
      chars += text.length;
      h.update(text);
      h.update("\0");
      h.update(String(index));
      h.update("\0");
    });
  return { count, chars, digest: h.digest("hex") };
}
function matchAllNew(f: File, emit: (t: string, i: number) => void) {
  for (const m of f.source.matchAll(new RegExp(source, flags))) emit(m[0], m.index);
}
const reusedMA = new RegExp(source, flags);
function matchAllReused(f: File, emit: (t: string, i: number) => void) {
  reusedMA.lastIndex = 0;
  for (const m of f.source.matchAll(reusedMA)) emit(m[0], m.index);
}
function execNew(f: File, emit: (t: string, i: number) => void) {
  const r = new RegExp(source, flags);
  let m: RegExpExecArray | null;
  while ((m = r.exec(f.source)) !== null) emit(m[0], m.index);
}
const reusedExecRe = new RegExp(source, flags);
function execReused(f: File, emit: (t: string, i: number) => void) {
  reusedExecRe.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = reusedExecRe.exec(f.source)) !== null) emit(m[0], m.index);
}
function stickyNew(f: File, emit: (t: string, i: number) => void) {
  const r = new RegExp(source, "ymsu");
  while (r.lastIndex < f.source.length) {
    const before = r.lastIndex;
    const m = r.exec(f.source);
    if (!m || m.index !== before || m[0].length === 0)
      throw Error(`sticky gap ${f.path} ${before}`);
    emit(m[0], m.index);
  }
}
const variants = { matchAllNew, matchAllReused, execNew, execReused, stickyNew };
type Variant = keyof typeof variants;
const expected = digestScan(matchAllNew);
for (const [name, fn] of Object.entries(variants)) {
  const got = digestScan(fn);
  if (JSON.stringify(got) !== JSON.stringify(expected))
    throw Error(`${name} drift ${JSON.stringify(got)} expected ${JSON.stringify(expected)}`);
}
function now<T>(fn: () => T) {
  const t = performance.now();
  const value = fn();
  return { ms: performance.now() - t, value };
}
function median(xs: number[]) {
  const a = [...xs].sort((a, b) => a - b),
    n = a.length;
  return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2;
}
function p90(xs: number[]) {
  const a = [...xs].sort((a, b) => a - b),
    k = (a.length - 1) * 0.9,
    i = Math.floor(k),
    j = Math.ceil(k);
  return a[i] * (j - k) + a[j] * (k - i);
}
function scanCount(consume: (f: File, emit: (text: string, index: number) => void) => void) {
  let count = 0,
    chars = 0;
  for (const f of req.files)
    consume(f, (text) => {
      count++;
      chars += text.length;
    });
  return { count, chars };
}
function one(v: Variant) {
  const got = scanCount(variants[v]);
  if (got.count !== expected.count || got.chars !== expected.chars)
    throw Error(`guard ${JSON.stringify(got)}`);
  return got;
}
const selected = (process.argv[2] ?? "abba") as "abba" | "first";
if (selected === "first") {
  // This process has imported only node builtins and constructed no scanner before this point.
  const firstReused = now(() => one("matchAllReused")).ms;
  const secondReused = now(() => one("matchAllReused")).ms;
  const firstNew = now(() => one("matchAllNew")).ms;
  const secondNew = now(() => one("matchAllNew")).ms;
  console.log(
    JSON.stringify(
      {
        protocol:
          "fresh Bun process; no scanner warmup before firstReused; then same operation; then per-file new operation twice. This cannot force JSC internal compiled-regexp cache eviction, so it measures first execution in this process, not a proven compilation-only delta.",
        bun: Bun.version,
        patternChars: source.length,
        flags,
        corpus: { files: req.files.length, utf8Bytes: 1138778 },
        guard: expected,
        firstUseMs: { firstReused, secondReused, firstNew, secondNew }
      },
      null,
      2
    )
  );
} else {
  // Warm all variants once, then 8 cyclic Latin-square blocks to resist monotonic thermal/drift bias.
  for (const v of Object.keys(variants) as Variant[]) one(v);
  const order = Object.keys(variants) as Variant[];
  const rows: { block: number; variant: Variant; ms: number }[] = [];
  for (let b = 0; b < 3; b++)
    for (let k = 0; k < order.length; k++) {
      const v = order[(k + b) % order.length];
      rows.push({ block: b + 1, variant: v, ms: now(() => one(v)).ms });
    }
  const summary = Object.fromEntries(
    order.map((v) => {
      const xs = rows.filter((x) => x.variant === v).map((x) => x.ms);
      return [v, { n: xs.length, medianMs: median(xs), p90Ms: p90(xs), samplesMs: xs }];
    })
  );
  console.log(
    JSON.stringify(
      {
        protocol:
          "all variants raw-scan the exact current TypeScriptReader combined source-aligned pattern; all validate identical raw token text+UTF-16 start digest. Each variant warmed once, then three cyclic orders.",
        bun: Bun.version,
        patternChars: source.length,
        flags,
        corpus: { files: req.files.length, utf8Bytes: 1138778 },
        guard: expected,
        summary,
        rows
      },
      null,
      2
    )
  );
}
