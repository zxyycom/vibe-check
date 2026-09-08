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
const p = JSON.parse(readFileSync(`${import.meta.dir}/typescript-token-pattern.json`, "utf8"))
  .source as string;
function guard() {
  const h = createHash("sha256");
  let count = 0,
    chars = 0;
  for (const f of files) {
    const r = new RegExp(p, "gmsu");
    let m;
    while ((m = r.exec(f.source))) {
      count++;
      chars += m[0].length;
      h.update(m[0]);
      h.update("\0");
      h.update(String(m.index));
      h.update("\0");
    }
  }
  return { count, chars, digest: h.digest("hex") };
}
const g = guard();
function countOnly() {
  let n = 0;
  for (const f of files) {
    const r = new RegExp(p, "gmsu");
    while (r.exec(f.source)) n++;
  }
  return n;
}
function fields() {
  let x = 0;
  for (const f of files) {
    const r = new RegExp(p, "gmsu");
    let m;
    while ((m = r.exec(f.source))) x += m[0].length + m.index;
  }
  return x;
}
function one(f: () => number) {
  const t = performance.now(),
    x = f(),
    ms = performance.now() - t;
  if (f === countOnly && x !== g.count) throw Error("count");
  return ms;
}
for (const f of [countOnly, fields]) one(f);
const rows: { block: number; variant: string; ms: number }[] = [];
for (let b = 0; b < 12; b++)
  for (const [n, f] of b % 2
    ? [
        ["countOnly", countOnly],
        ["fields", fields]
      ]
    : ([
        ["fields", fields],
        ["countOnly", countOnly]
      ] as const))
    rows.push({ block: b + 1, variant: n, ms: one(f) });
function med(x: number[]) {
  x = [...x].sort((a, b) => a - b);
  return (x[5] + x[6]) / 2;
}
const summary = Object.fromEntries(
  ["countOnly", "fields"].map((n) => {
    const x = rows.filter((r) => r.variant === n).map((r) => r.ms);
    return [n, { medianMs: med(x), samplesMs: x }];
  })
);
console.log(
  JSON.stringify(
    {
      runtime: { bun: Bun.version },
      protocol:
        "new exact current RegExp/file + exec; guard preflight hashes raw text+UTF16 start but is excluded; countOnly does only loop counter; fields does m[0].length + m.index.",
      guard: g,
      summary,
      rows
    },
    null,
    2
  )
);
