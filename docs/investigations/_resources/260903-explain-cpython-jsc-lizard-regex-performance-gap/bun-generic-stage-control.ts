import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const files = (
  JSON.parse(
    readFileSync(
      `${process.cwd()}/docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json`,
      "utf8"
    )
  ) as { files: { source: string }[] }
).files;
const current = JSON.parse(readFileSync(`${import.meta.dir}/typescript-token-pattern.json`, "utf8"))
  .source as string;
const generic = "<(?=(?:[^<>?]*\\?)+[^<>]*>)(?:[\\w\\s,.?]|(?:extends))+>";
const main = current.replace("|" + generic, "");
type Emit = (t: string, i: number) => void;
function combined(f: { source: string }, e: Emit) {
  const r = new RegExp(current, "gmsu");
  let m;
  while ((m = r.exec(f.source))) e(m[0], m.index);
}
function staged(f: { source: string }, e: Emit) {
  const r = new RegExp(main, "ymsu"),
    g = new RegExp(generic, "ymsu");
  while (r.lastIndex < f.source.length) {
    const p = r.lastIndex;
    if (f.source.charCodeAt(p) === 60) {
      g.lastIndex = p;
      const x = g.exec(f.source);
      if (x?.index === p) {
        e(x[0], p);
        r.lastIndex = g.lastIndex;
        continue;
      }
    }
    const m = r.exec(f.source);
    if (!m || m.index !== p || m[0].length === 0) throw Error(`gap ${p}`);
    e(m[0], p);
  }
}
function guard(fn: (f: { source: string }, e: Emit) => void) {
  const h = createHash("sha256");
  let count = 0,
    chars = 0;
  for (const f of files)
    fn(f, (t, i) => {
      count++;
      chars += t.length;
      h.update(t);
      h.update("\0");
      h.update(String(i));
      h.update("\0");
    });
  return { count, chars, digest: h.digest("hex") };
}
const a = guard(combined),
  b = guard(staged);
if (JSON.stringify(a) !== JSON.stringify(b)) throw Error(JSON.stringify({ a, b }));
function one(fn: (f: { source: string }, e: Emit) => void) {
  const t = performance.now();
  let c = 0;
  for (const f of files) fn(f, () => c++);
  if (c !== a.count) throw Error("count");
  return performance.now() - t;
}
one(combined);
one(staged);
const rows: { block: number; variant: string; ms: number }[] = [];
for (let b = 0; b < 12; b++)
  for (const [n, f] of b % 2
    ? [
        ["combined", combined],
        ["stagedAtLt", staged]
      ]
    : ([
        ["stagedAtLt", staged],
        ["combined", combined]
      ] as const))
    rows.push({ block: b + 1, variant: n, ms: one(f) });
function med(x: number[]) {
  x = [...x].sort((a, b) => a - b);
  return (x[5] + x[6]) / 2;
}
const ca = rows.filter((x) => x.variant === "combined").map((x) => x.ms),
  cb = rows.filter((x) => x.variant === "stagedAtLt").map((x) => x.ms);
console.log(
  JSON.stringify(
    {
      protocol:
        "Bun exact-output stage control. Both conditions guard identical raw text+UTF-16 starts. staged runs the generic branch only when scanner position is < and otherwise uses a sticky no-generic main regex. This is a diagnostic control, not a proposed replacement.",
      bun: Bun.version,
      guard: a,
      combined: { medianMs: med(ca), samplesMs: ca },
      stagedAtLt: { medianMs: med(cb), samplesMs: cb },
      stagedDividedByCombinedMedian: med(cb) / med(ca),
      rows
    },
    null,
    2
  )
);
