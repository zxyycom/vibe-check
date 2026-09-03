import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const files = (
  JSON.parse(
    readFileSync(
      "docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json",
      "utf8"
    )
  ) as { files: { source: string }[] }
).files;
const current = (
  JSON.parse(readFileSync(`${import.meta.dir}/typescript-token-pattern.json`, "utf8")) as {
    source: string;
  }
).source;
const generic = "<(?=(?:[^<>?]*\\?)+[^<>]*>)(?:[\\w\\s,.?]|(?:extends))+>";
const variants = {
  current,
  noGeneric: current.replace("|" + generic, ""),
  asciiWord: current.replace("[\\p{L}\\p{N}_]+", "[A-Za-z0-9_]+")
};
function guard(source: string) {
  const h = createHash("sha256");
  let count = 0,
    chars = 0;
  for (const f of files) {
    const re = new RegExp(source, "gmsu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(f.source)) !== null) {
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
const genericRegex = new RegExp(generic, "gmsu");
let genericMatches = 0;
for (const f of files) for (const _ of f.source.matchAll(genericRegex)) genericMatches++;
console.log(
  JSON.stringify(
    {
      protocol:
        "Untimed Bun output guard for current, no-generic, and ASCII-word variants on the same decoded corpus.",
      bun: Bun.version,
      genericMatches,
      guards: Object.fromEntries(Object.entries(variants).map(([n, p]) => [n, guard(p)]))
    },
    null,
    2
  )
);
