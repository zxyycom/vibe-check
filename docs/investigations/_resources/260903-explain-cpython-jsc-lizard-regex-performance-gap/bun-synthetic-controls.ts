import { readFileSync } from "node:fs";
const req = JSON.parse(
  readFileSync(
    `${process.cwd()}/docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json`,
    "utf8"
  )
) as { files: { source: string }[] };
const current = JSON.parse(readFileSync(`${import.meta.dir}/typescript-token-pattern.json`, "utf8"))
  .source as string;
const generic = "<(?=(?:[^<>?]*\\?)+[^<>]*>)(?:[\\w\\s,.?]|(?:extends))+>";
const noGeneric = current.replace("|" + generic, "");
function fill(n: number, t: string) {
  return t.repeat(Math.ceil(n / t.length)).slice(0, n);
}
const noLt = req.files.map((f) => fill(f.source.length, "alpha[beta+gamma;\n"));
const manyLtFail = req.files.map((f) => fill(f.source.length, "alpha<beta+gamma;\n"));
function scan(sources: string[], p: string) {
  let n = 0,
    c = 0;
  for (const s of sources) {
    const r = new RegExp(p, "gmsu");
    let m;
    while ((m = r.exec(s))) {
      n++;
      c += m[0].length;
    }
  }
  return { n, c };
}
function one(s: string[], p: string) {
  const t = performance.now(),
    v = scan(s, p);
  return { ms: performance.now() - t, ...v };
}
function med(x: number[]) {
  x = [...x].sort((a, b) => a - b);
  return (x[5] + x[6]) / 2;
}
const out: any = {};
for (const [n, s] of Object.entries({ noLt, manyLtFail })) {
  for (const p of [current, noGeneric]) scan(s, p);
  const rows: any[] = [];
  for (let b = 0; b < 12; b++)
    for (const [v, p] of b % 2
      ? [
          ["current", current],
          ["noGeneric", noGeneric]
        ]
      : ([
          ["noGeneric", noGeneric],
          ["current", current]
        ] as const))
      rows.push({ block: b + 1, variant: v, ...one(s, p) });
  const x = rows.filter((r) => r.variant === "current"),
    y = rows.filter((r) => r.variant === "noGeneric");
  out[n] = {
    chars: s.reduce((a, x) => a + x.length, 0),
    current: { medianMs: med(x.map((r) => r.ms)), sampleMs: x.map((r) => r.ms), raw: x[0].n },
    noGeneric: { medianMs: med(y.map((r) => r.ms)), sampleMs: y.map((r) => r.ms), raw: y[0].n },
    ratio: med(y.map((r) => r.ms)) / med(x.map((r) => r.ms)),
    rows
  };
}
console.log(
  JSON.stringify(
    {
      protocol:
        "Synthetic diagnostic only: preserve 254-file lengths/total UTF-16 char count, but not real-language semantics. noLt has zero <; manyLtFail contains repeated < but no ? or >, so generic lookahead cannot succeed. New RegExp+exec/file, one warm/pattern, then 12 alternating pairs.",
      bun: Bun.version,
      out
    },
    null,
    2
  )
);
