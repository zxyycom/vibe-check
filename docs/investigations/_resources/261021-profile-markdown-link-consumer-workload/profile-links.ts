/** Build temporary views of the existing Product-owned measurement entry; never edit Product. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const [outputDirectory] = process.argv.slice(2);
if (!outputDirectory) throw new Error("Pass an owned output directory");
const root = process.cwd();
const output = path.resolve(outputDirectory);
mkdirSync(output, { recursive: true });
const entry = path.join(root, "src/package-checks/markdown-link-validation/measurement.test-support.ts");
const inputs: Record<string, string> = {};

function replaceOnce(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2) throw new Error(`Expected exactly one occurrence: ${before}`);
  return source.replace(before, after);
}

function instrument(source: string, file: string): string {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits: { position: number; text: string }[] = [];
  function visit(node: ts.Node): void {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.body && node.name) {
      const key = `${path.basename(file)}:${node.name.getText(ast)}`;
      const asynchronous = node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.AsyncKeyword);
      edits.push({ position: node.body.getStart(ast) + 1,
        text: `\nconst __linkPerfStarted = performance.now(); try {${asynchronous ? " return await (async () => {" : ""}\n` });
      edits.push({ position: node.body.getEnd() - 1,
        text: `\n${asynchronous ? "})();" : ""}} finally { globalThis.__linkPerfRecord(${JSON.stringify(key)}, performance.now() - __linkPerfStarted); }\n` });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const edit of edits.sort((a, b) => b.position - a.position)) {
    source = source.slice(0, edit.position) + edit.text + source.slice(edit.position);
  }
  if (file.endsWith("/filesystem-probes.ts")) {
    source = replaceOnce(source, "const bytes = new Uint8Array(maxBytes + 1);",
      "const bytes = new Uint8Array(maxBytes + 1); globalThis.__linkPerfCount('bufferAllocationBytes', bytes.byteLength);");
    source = replaceOnce(source, "const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset);",
      "globalThis.__linkPerfCount('fileHandleReadCalls', 1); const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset); globalThis.__linkPerfCount('fileHandleReturnedBytes', result.bytesRead);");
  }
  return source;
}

const prelude = `
const __linkPerf = { metrics: new Map(), counters: {} };
globalThis.__linkPerfRecord = (key, elapsedMs) => {
  const row = __linkPerf.metrics.get(key) ?? { calls: 0, inclusiveMs: 0 };
  row.calls += 1; row.inclusiveMs += elapsedMs; __linkPerf.metrics.set(key, row);
};
globalThis.__linkPerfCount = (key, value) => { __linkPerf.counters[key] = (__linkPerf.counters[key] ?? 0) + value; };
globalThis.__linkPerfReset = () => { __linkPerf.metrics.clear(); __linkPerf.counters = {}; };
globalThis.__linkPerfSnapshot = () => ({
  metrics: Object.fromEntries([...__linkPerf.metrics.entries()].sort((a,b) => a[0].localeCompare(b[0]))),
  counters: { ...__linkPerf.counters }
});
`;

for (const mode of ["plain", "trace"] as const) {
  const built = await Bun.build({
    entrypoints: [entry], outdir: output, target: "node", format: "esm", packages: "external",
    naming: `${mode}.mjs`,
    plugins: [{ name: "investigation-only-observation", setup(build) {
      build.onLoad({ filter: /\.ts$/u }, async ({ path: file }) => {
        let source = readFileSync(file, "utf8");
        inputs[path.relative(root, file)] = createHash("sha256").update(source).digest("hex");
        if (file === entry) {
          source = replaceOnce(source,
            "limits: { maxOccurrences: 100_000, maxTargetReads: 10_000 },",
            "limits: { maxMarkdownBytes: Number(process.env.LINK_MAX_BYTES ?? 1048576), maxOccurrences: false, maxTargetReads: false },");
          source = replaceOnce(source, "if (cacheState === \"hit\") await run(config, { projectRoot: root });",
            `if (cacheState === "hit") await run(config, { projectRoot: root });
             if (cacheState === "workspace") {
               mkdirSync(path.join(root, ".parse-cache"), { recursive: true });
               writeFileSync(path.join(root, ".parse-cache/markdown-link-parse-facts-v1.jsonl"), readFileSync(process.env.LINK_CACHE_SEED));
             }`);
          source = replaceOnce(source, "const started = performance.now();",
            "globalThis.__linkPerfReset(); const cpuStarted = process.cpuUsage(); const started = performance.now();");
          source = replaceOnce(source, "const elapsedMs = performance.now() - started;",
            "const elapsedMs = performance.now() - started; const cpu = process.cpuUsage(cpuStarted); const profile = globalThis.__linkPerfSnapshot();");
          source = replaceOnce(source, "elapsedMs,\n        maxRssKiB:",
            "elapsedMs, cpu, profile, maxMarkdownBytes: Number(process.env.LINK_MAX_BYTES ?? 1048576),\n        maxRssKiB:");
          source = replaceOnce(source, "sources: selected.length,",
            `sources: selected.length,
             sourceBytes: selected.reduce((sum, file) => sum + statSync(file).size, 0),
             maxSourceBytes: Math.max(...selected.map(file => statSync(file).size)),
             sourceManifest: selected.map(file => ({ path: file, bytes: statSync(file).size, sha256: globalThis.__sourceDigest(readFileSync(file)) })),`);
          source = `import { createHash as __createHash } from "node:crypto"; globalThis.__sourceDigest = bytes => __createHash("sha256").update(bytes).digest("hex");\n${prelude}\n${source}`;
        } else if (mode === "trace" && (
          file.includes("/src/package-checks/markdown-link-validation/") ||
          file.endsWith("/src/package-checks/project-files/collection.ts")
        )) {
          source = instrument(source, file);
        }
        return { contents: source, loader: "ts" };
      });
    } }]
  });
  if (!built.success) throw new Error(built.logs.map(String).join("\n"));
  console.log(JSON.stringify({ mode, outputs: built.outputs.map(item => item.path) }));
}
writeFileSync(path.join(output, "bundle-identities.json"), JSON.stringify({
  formedAt: new Date().toISOString(), bun: Bun.version,
  scope: "Temporary bundle instrumentation plus public byte-limit sensitivity; no Product edits",
  inputs,
  bundles: Object.fromEntries(["plain", "trace"].map(mode => [mode,
    createHash("sha256").update(readFileSync(path.join(output, `${mode}.mjs`))).digest("hex")]))
}, null, 2) + "\n");
