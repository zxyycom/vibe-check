import { quietControls, completed } from "../package-api-support/gate-example-acceptance.ts";

import assert from "node:assert/strict";

import { run, type RunResult } from "@zxyycom/vibe-check";

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// #region package-api-example:gate-cached-measurement
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { cacheJsonByKey, defineCheck, defineConfig } from "@zxyycom/vibe-check";

function parseMeasurement(value: unknown): { compressedBytes: number } {
  if (
    value === null ||
    typeof value !== "object" ||
    !("compressedBytes" in value) ||
    typeof value.compressedBytes !== "number" ||
    !Number.isSafeInteger(value.compressedBytes) ||
    value.compressedBytes < 0
  )
    throw new TypeError("Invalid gzip measurement");
  return { compressedBytes: value.compressedBytes };
}

const gzipSize = defineCheck({
  checkId: "gzip-size",
  displayName: "Gzip size",
  options: { maximumBytes: 100_000 },
  async execute({ options, project }) {
    const source = await readFile(resolve(project.root, "dist/app.js"));
    const level = 9;
    const key = JSON.stringify({
      sourceHash: createHash("sha256").update(source).digest("hex"),
      measurementRevision: "gzip-size-v1",
      level,
      nodeVersion: process.versions.node,
      zlibVersion: process.versions.zlib ?? null,
      bunVersion: process.versions.bun ?? null
    });
    const cached = await cacheJsonByKey({
      directory: resolve(project.root, ".cache/quality/gzip-size"),
      namespace: "my-project.gzip-size",
      version: "1",
      key,
      parse: parseMeasurement,
      compute: () => ({ compressedBytes: gzipSync(source, { level }).byteLength })
    });
    const maximumBytes = options.maximumBytes;
    const data = {
      compressedBytes: cached.value.compressedBytes,
      maximumBytes,
      cacheSource: cached.source
    };
    return data.compressedBytes <= maximumBytes
      ? { status: "passed", data }
      : { status: "failed", data };
  }
});

const definition = defineConfig({
  checks: [gzipSize],
  outputs: { machinePublication: { enabled: false } }
});
// #endregion package-api-example:gate-cached-measurement

const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-gzip-"));
function writeFixture(path: string, content: string) {
  const target = join(fixtureRoot, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, "utf8");
}
function measurement(result: RunResult) {
  const outcome = completed(result).snapshot.checks[0]?.outcome;
  if (outcome?.status !== "passed" && outcome?.status !== "failed")
    throw new Error("Expected gzip measurement");
  return outcome;
}
try {
  const content = "export const answer = 42;\n";
  writeFixture("dist/app.js", content);
  const controls = { ...quietControls, projectRoot: fixtureRoot };
  const cold = measurement(await run(definition, controls));
  const warm = measurement(await run(definition, controls));
  assert.equal(cold.status, "passed");
  assert.equal(cold.data.cacheSource, "computed");
  assert.equal(warm.data.cacheSource, "cache");
  assert.equal(warm.data.compressedBytes, gzipSync(content, { level: 9 }).byteLength);
  assert.equal(warm.data.compressedBytes, cold.data.compressedBytes);
  const strict = measurement(
    await run(
      defineConfig({
        ...definition,
        checks: [defineCheck({ ...gzipSize, options: { maximumBytes: 0 } })]
      }),
      controls
    )
  );
  assert.equal(strict.status, "failed");
  assert.equal(strict.data.cacheSource, "cache");
  assert.equal(strict.data.maximumBytes, 0);
  writeFixture("dist/app.js", content + "export const changed = true;\n");
  assert.equal(measurement(await run(definition, controls)).data.cacheSource, "computed");
  rmSync(join(fixtureRoot, ".cache"), { recursive: true });
  assert.equal(measurement(await run(definition, controls)).data.cacheSource, "computed");
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}
