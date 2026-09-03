import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const p = JSON.parse(
  readFileSync(
    WORKSPACE_ROOT +
      "/docs/investigations/_resources/explain-cpython-jsc-lizard-regex-performance-gap/typescript-token-pattern.json",
    "utf8"
  )
);
const r = JSON.parse(
  readFileSync(
    WORKSPACE_ROOT +
      "/docs/investigations/_resources/remeasure-lizard-python-typescript-real-typescript-analyzer-performance/request.json",
    "utf8"
  )
);
const scan = () => {
  let c = 0;
  const h = createHash("sha256");
  for (const f of r.files)
    for (const x of f.source.matchAll(new RegExp(p.source, p.flags))) {
      c++;
      h.update(x[0]);
      h.update("\0");
      h.update(String(x.index));
      h.update("\0");
    }
  return { c, d: h.digest("hex") };
};
scan();
const a = [];
for (let i = 0; i < 3; i++) {
  let t = performance.now();
  const x = scan();
  if (x.c !== 296074 || x.d !== "47aeb09352ba3a1e0cbe1c3bfb8e8262974bfe38103a74345163376c759d460e")
    throw Error(JSON.stringify(x));
  a.push(performance.now() - t);
}
a.sort((x, y) => x - y);
console.log(
  JSON.stringify({ runtime: { bun: Bun.version }, samplesMs: a, medianMs: a[1] }, null, 2)
);
