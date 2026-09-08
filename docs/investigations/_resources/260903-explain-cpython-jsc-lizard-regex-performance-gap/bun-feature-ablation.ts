import { readFileSync } from "node:fs";
const req = JSON.parse(
  readFileSync(
    `${process.cwd()}/docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json`,
    "utf8"
  )
) as { files: { source: string }[] };
const source = JSON.parse(readFileSync(`${import.meta.dir}/typescript-token-pattern.json`, "utf8"))
  .source as string;
const variants: { [k: string]: string } = {
  current: source,
  asciiWord: source.replace("[\\p{L}\\p{N}_]+", "[A-Za-z0-9_]+"),
  noGenericLookahead: source.replace(
    "|<(?=(?:[^<>?]*\\?)+[^<>]*>)(?:[\\w\\s,.?]|(?:extends))+>",
    ""
  ),
  noBlockComment: source.replace("\\/\\*.*?\\*\\/", "(?!)"),
  noQuotedStrings: source
    .replace('|"(?:\\\\.|[^"\\\\])*"', "")
    .replace("|'(?:\\\\.|[^'\\\\])*?'", ""),
  noLargeSymbols: source.replace(
    "|<<=|>>=|\\|\\||&&|===|!==|==|!=|<=|>=|->|=>|\\+\\+|--|\\+=|-=|\\+|-|\\*|/|\\*=|/=|\\^=|&=|\\|=|\\.\\.\\.",
    ""
  ),
  asciiWord_noGeneric: source
    .replace("[\\p{L}\\p{N}_]+", "[A-Za-z0-9_]+")
    .replace("|<(?=(?:[^<>?]*\\?)+[^<>]*>)(?:[\\w\\s,.?]|(?:extends))+>", "")
};
function scan(p: string) {
  const r = new RegExp(p, "gmsu");
  let count = 0,
    chars = 0;
  for (const f of req.files) {
    r.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = r.exec(f.source)) !== null) {
      count++;
      chars += m[0].length;
    }
  }
  return { count, chars };
}
function one(p: string) {
  const t = performance.now(),
    v = scan(p);
  return { ms: performance.now() - t, ...v };
}
for (const p of Object.values(variants)) scan(p);
const names = Object.keys(variants),
  rows: { variant: string; ms: number; count: number; chars: number }[] = [];
for (let b = 0; b < 4; b++)
  for (let k = 0; k < names.length; k++) {
    const n = names[(b + k) % names.length];
    rows.push({ variant: n, ...one(variants[n]) });
  }
function med(a: number[]) {
  a = [...a].sort((x, y) => x - y);
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
}
const summary = Object.fromEntries(
  names.map((n) => {
    const a = rows.filter((r) => r.variant === n);
    return [
      n,
      {
        patternChars: variants[n].length,
        medianMs: med(a.map((x) => x.ms)),
        samplesMs: a.map((x) => x.ms),
        rawCount: a[0].count,
        rawChars: a[0].chars
      }
    ];
  })
);
console.log(
  JSON.stringify(
    {
      protocol:
        "Feature ablations execute exact same corpus via fresh gmsu RegExp+exec/file after one warmup each. Except current, variants intentionally change token semantics and often match count; they are diagnostic cost probes only, NOT candidate implementations or parity evidence.",
      bun: Bun.version,
      summary,
      rows
    },
    null,
    2
  )
);
