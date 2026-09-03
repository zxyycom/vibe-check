import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { TypeScriptReader } from "../../../../src/package-checks/function-metrics/analyzer/readers/typescript.ts";

const requestPath = process.argv[2];
if (requestPath === undefined) throw new Error("usage: bun raw-token-bun.ts <request.json>");
const r = JSON.parse(readFileSync(requestPath, "utf8")) as { files: { source: string }[] };
function f() {
  return Array.from(r.files.flatMap((x) => Array.from(TypeScriptReader.generateTokens(x.source))));
}
function g(a: string[]) {
  const h = createHash("sha256");
  let chars = 0;
  for (const t of a) {
    h.update(t);
    h.update("\0");
    chars += t.length;
  }
  return { digest: h.digest("hex"), count: a.length, chars };
}
const warm = f();
const t = performance.now(),
  out = f(),
  ms = performance.now() - t;
const w = g(warm),
  o = g(out);
if (JSON.stringify(w) !== JSON.stringify(o)) throw Error("drift");
console.log(JSON.stringify({ ms, ...o, bun: Bun.version }));
