import { readFileSync } from "node:fs";
type File = { path: string; source: string };
const files = (
  JSON.parse(readFileSync("/tmp/vibe-lizard-real-ts-profile-20260903/request.json", "utf8")) as {
    files: File[];
  }
).files;
const source = JSON.parse(readFileSync("/tmp/lizard-regex-probe/captured.json", "utf8")).find(
  (entry: { source: string }) => entry.source.includes("`.*?`")
).source as string;
const importedAt = performance.now();
const onig: typeof import("/tmp/lizard-regex-probe/node_modules/vscode-oniguruma/release/main.js") =
  await import("/tmp/lizard-regex-probe/node_modules/vscode-oniguruma/release/main.js");
const importMs = performance.now() - importedAt;
const loadedAt = performance.now();
await onig.loadWASM(
  readFileSync("/tmp/lizard-regex-probe/node_modules/vscode-oniguruma/release/onig.wasm")
);
const loadMs = performance.now() - loadedAt;
const scannerAt = performance.now();
const scanner = onig.createOnigScanner([`(?m)${source}`]);
const scannerCreateMs = performance.now() - scannerAt;
const scanAt = performance.now();
let count = 0,
  observed = 0;
for (const f of files) {
  const text = onig.createOnigString(f.source);
  try {
    let at = 0;
    for (;;) {
      const m = scanner.findNextMatchSync(text, at);
      if (!m) break;
      const c = m.captureIndices[0];
      if (!c || c.end <= at) throw Error("bad");
      count++;
      observed += f.source.slice(c.start, c.end).length + c.start;
      at = c.end;
    }
  } finally {
    text.dispose();
  }
}
const scanMs = performance.now() - scanAt;
scanner.dispose();
if (count !== 296074) throw Error(String(count));
console.log(
  JSON.stringify(
    {
      importMs,
      loadMs,
      scannerCreateMs,
      scanMs,
      totalMs: importMs + loadMs + scannerCreateMs + scanMs,
      count,
      observed
    },
    null,
    2
  )
);
