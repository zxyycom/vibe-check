import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, it } from "node:test";

import { preparePackageCandidate } from "./index.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const candidateModuleUrl = new URL("./index.ts", import.meta.url).href;

describe("package candidate preparation", () => {
  it("prepares a physical candidate lifecycle", { timeout: 20_000 }, async () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "vibe-check-package-candidate-"));
    const consumerDirectory = join(temporaryRoot, "consumer");
    const stateDirectory = join(temporaryRoot, "state");
    try {
      writeAncestorJscpdFallback(temporaryRoot);
      writeConsumerManifest(consumerDirectory);
      const first = await preparePackageCandidate({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(first.reused, false);
      assert.equal(existsSync(first.artifactPath), true);
      assert.equal(lstatSync(first.installedPackageDirectory).isSymbolicLink(), false);
      assert.equal(existsSync(first.resolvedEntryPath), true);
      assert.equal(first.resolvedEntryPath.startsWith(first.installedPackageDirectory), true);
      assert.equal(
        runtimeExports(first.resolvedEntryPath),
        '["defineCheck","defineConfig","duplicateDetection","fileMetrics","functionMetrics","inherit","run"]'
      );
      assert.deepEqual(candidateDependencies(candidateManifest(first.installedPackageDirectory)), {
        jscpd: "5.0.11",
        neverthrow: "8.2.0",
        typebox: "1.3.9"
      });
      assert.equal(
        createRequire(first.resolvedEntryPath)
          .resolve("jscpd/package.json")
          .startsWith(join(consumerDirectory, "node_modules")),
        true
      );
      const reused = await preparePackageCandidate({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(reused.reused, true);
      assert.equal(reused.inputFingerprint, first.inputFingerprint);
      assert.equal(reused.sha256, first.sha256);

      rmSync(join(consumerDirectory, "node_modules", "jscpd"), { force: true, recursive: true });
      const ancestorResolvedJscpd = resolveJscpdFromFreshBunProcess(first.resolvedEntryPath);
      assert.equal(
        ancestorResolvedJscpd.startsWith(join(temporaryRoot, "node_modules")),
        true,
        ancestorResolvedJscpd
      );
      const reinstalled = prepareInFreshBunProcess({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(reinstalled, false);
      assert.equal(
        createRequire(first.resolvedEntryPath)
          .resolve("jscpd/package.json")
          .startsWith(join(consumerDirectory, "node_modules")),
        true
      );

      writeFileSync(join(stateDirectory, "preparation-receipt.json"), "not JSON\n", "utf8");
      const rebuilt = await preparePackageCandidate({
        consumerDirectory,
        repositoryRoot,
        stateDirectory
      });
      assert.equal(rebuilt.reused, false);
      assert.equal(rebuilt.inputFingerprint, first.inputFingerprint);
      assert.equal(existsSync(rebuilt.resolvedEntryPath), true);
    } finally {
      rmSync(temporaryRoot, { force: true, recursive: true });
    }
  });
});

function writeConsumerManifest(consumerDirectory: string): void {
  mkdirSync(consumerDirectory, { recursive: true });
  writeFileSync(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "vibe-check-candidate-test-consumer", private: true, type: "module" })}\n`,
    "utf8"
  );
}

function writeAncestorJscpdFallback(temporaryRoot: string): void {
  const packageDirectory = join(temporaryRoot, "node_modules", "jscpd");
  mkdirSync(packageDirectory, { recursive: true });
  writeFileSync(
    join(packageDirectory, "package.json"),
    `${JSON.stringify({
      bin: { jscpd: "./run-jscpd.js" },
      name: "jscpd",
      version: "5.0.11"
    })}\n`,
    "utf8"
  );
  writeFileSync(join(packageDirectory, "run-jscpd.js"), "", "utf8");
}

function resolveJscpdFromFreshBunProcess(candidateEntryPath: string): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "import { createRequire } from 'node:module'; process.stdout.write(createRequire(process.argv[1]).resolve('jscpd/package.json'))",
      candidateEntryPath
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function prepareInFreshBunProcess(input: {
  readonly consumerDirectory: string;
  readonly repositoryRoot: string;
  readonly stateDirectory: string;
}): boolean {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const { preparePackageCandidate } = await import(process.argv[1]); const candidate = await preparePackageCandidate({ repositoryRoot: process.argv[2], consumerDirectory: process.argv[3], stateDirectory: process.argv[4] }); process.stdout.write(candidate.reused ? 'reused' : 'updated');",
      candidateModuleUrl,
      input.repositoryRoot,
      input.consumerDirectory,
      input.stateDirectory
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() === "reused";
}

function candidateManifest(packageDirectory: string): unknown {
  return JSON.parse(readFileSync(join(packageDirectory, "package.json"), "utf8"));
}

function candidateDependencies(manifest: unknown): unknown {
  if (!isRecord(manifest)) {
    throw new TypeError("candidate manifest must be an object");
  }
  return manifest.dependencies;
}

function runtimeExports(entryPath: string): string {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "import(process.argv[1]).then((module) => process.stdout.write(JSON.stringify(Object.keys(module).sort())))",
      pathToFileURL(entryPath).href
    ],
    { encoding: "utf8" }
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
