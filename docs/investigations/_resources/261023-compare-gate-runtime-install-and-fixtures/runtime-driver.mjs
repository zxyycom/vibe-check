import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const [inputPath, outputDirectory] = process.argv.slice(2);
assert.ok(inputPath && outputDirectory);
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const importStart = performance.now();
const { run, defineConfig, functionMetrics, canonicalJsonText, collectProjectFiles } =
  await import(pathToFileURL(input.entry).href);
const importMs = performance.now() - importStart;

// The same public collection contract and bytes are checked before every sample.
const selected = [...new Set(Object.values(input.options.codeAreas).flatMap((area) =>
  collectProjectFiles({ projectRoot: input.root, selection: area.files })))].sort();
assert.deepEqual(selected, input.inputs.map(({ path }) => path));
for (const file of input.inputs) {
  const bytes = readFileSync(join(input.root, file.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
}

const definition = defineConfig({
  checks: [functionMetrics(input.options)],
  scheduler: { maxParallel: 1 },
  outputs: {
    machinePublication: { enabled: false },
    progressRendering: { enabled: false },
    diagnosticLogging: { enabled: false }
  }
});
const started = performance.now();
const result = await run(definition, { projectRoot: input.root });
const runMs = performance.now() - started;
writeFileSync(join(outputDirectory, "result.json"), JSON.stringify(result, null, 2));
assert.equal(result.kind, "completed");
assert.equal(result.aggregate, "passed");
assert.equal(result.snapshot.checks.length, 1);
assert.equal(result.snapshot.checks[0].outcome.status, "passed");

const semantic = { snapshot: result.snapshot, checkMessages: result.checkMessages };
const canonical = canonicalJsonText(semantic);
writeFileSync(join(outputDirectory, "semantic.json"), canonical);
console.log(JSON.stringify({
  runtime: process.versions.bun ? "bun" : "node",
  version: process.versions.bun ?? process.version,
  importMs, runMs, checkDurations: result.checkDurations,
  semanticSha256: createHash("sha256").update(canonical).digest("hex"),
  selectedFiles: input.inputs.length,
  selectedBytes: input.inputs.reduce((total, file) => total + file.bytes, 0),
  records: result.snapshot.records.length,
  result: result.aggregate
}));
