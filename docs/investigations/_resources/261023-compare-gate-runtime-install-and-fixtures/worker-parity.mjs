import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";

const [inputPath, outputPath] = process.argv.slice(2);
assert.ok(inputPath && outputPath);
const input = JSON.parse(readFileSync(inputPath, "utf8"));
const { canonicalJsonText } = await import(pathToFileURL(input.entry).href);
const files = input.inputs.map((file) => {
  const bytes = readFileSync(join(input.root, file.path));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), file.sha256);
  return { path: file.path, source: bytes.toString("utf8") };
});
const workerPath = join(dirname(input.entry), "dist/esm/package-checks/function-metrics/analyzer-worker.mjs");
const worker = new Worker(pathToFileURL(workerPath));
try {
  const response = await new Promise((resolve, reject) => {
    let responded = false;
    worker.once("message", (value) => { responded = true; resolve(value); });
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (!responded) reject(new Error(`Worker exited ${code} without a result`));
    });
    worker.postMessage({ files });
  });
  assert.equal(response.kind, "complete");
  const canonical = canonicalJsonText(response);
  writeFileSync(outputPath, canonical, { flag: "wx" });
  console.log(JSON.stringify({ runtime: process.versions.bun ? "bun" : "node",
    files: files.length, metrics: response.metrics.length,
    bytes: Buffer.byteLength(canonical), sha256: createHash("sha256").update(canonical).digest("hex") }));
} finally {
  await worker.terminate();
}
