import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import {
  buildScanCacheKey,
  loadScanCacheEntry,
  writeScanCacheEntry,
  type DuplicateCodeCacheIdentity
} from "./cache.ts";
import type { DuplicateCodeFragment } from "../model/schema.ts";
import { jscpdCacheArgs } from "../check-record/builtins/duplicate-detection-measurement.ts";
import { DEFAULT_JSCPD_COMMAND, readJscpdBinTarget } from "./scanners/jscpd/default-command.ts";

const TEST_CODE_AREA = "typescript-production-scripts";
describe("quality measurement cache", () => {
  it("keys duplicate-code cache by scanner and exact input identity", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-cache-"));
    const identity = cacheIdentity();
    const fragment = duplicateFragment();

    try {
      const baseKey = buildScanCacheKey(identity);
      assertIdentityInputs(baseKey, identity);
      assertDefaultJscpdIdentity(tempDir);

      writeScanCacheEntry({ rootDir: tempDir, identity, metrics: [fragment] });
      assertCacheRoundTrip(tempDir, identity, baseKey);
      assertVersionMismatch(tempDir, identity);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function assertIdentityInputs(baseKey: string, identity: DuplicateCodeCacheIdentity): void {
  assert.notEqual(baseKey, buildScanCacheKey({ ...identity, codeArea: "rust-tests" }));
  assert.notEqual(
    baseKey,
    buildScanCacheKey({
      ...identity,
      inputFingerprint: {
        fileCount: 1,
        fileList: ["src/changed.ts"],
        fingerprint: "sha256:changed:1"
      }
    })
  );
  assert.notEqual(
    baseKey,
    buildScanCacheKey({
      ...identity,
      normalizedToolArgs: ["exec", "jscpd", "--min-tokens", "75", "--reporters", "json"]
    })
  );
}

function assertDefaultJscpdIdentity(tempDir: string): void {
  const defaultCommandArgs = jscpdCacheArgs({ ...DEFAULT_JSCPD_COMMAND, maxConcurrency: 4 }, 75);
  assert.deepEqual(defaultCommandArgs.slice(0, 2), ["<bun>", "<package-jscpd-bin>"]);
  const firstInstalledBin = fakeInstalledJscpdBin(tempDir, "first-consumer");
  const secondInstalledBin = fakeInstalledJscpdBin(tempDir, "second-consumer");
  assert.notEqual(firstInstalledBin, secondInstalledBin);
  const publicDefaultCommand = JSON.stringify(DEFAULT_JSCPD_COMMAND);
  assert.equal(publicDefaultCommand.includes(firstInstalledBin), false);
  assert.equal(publicDefaultCommand.includes(secondInstalledBin), false);
  assert.deepEqual(
    jscpdCacheArgs({ ...DEFAULT_JSCPD_COMMAND, maxConcurrency: 4 }, 75),
    jscpdCacheArgs({ ...DEFAULT_JSCPD_COMMAND, maxConcurrency: 4 }, 75)
  );
  assert.notDeepEqual(defaultCommandArgs, explicitNodeJscpdCacheArgs());
  assert.equal(repositoryLocalJscpdCacheArgs()[0], "<repo-local-jscpd-bin>");
}

function explicitNodeJscpdCacheArgs(): readonly string[] {
  return jscpdCacheArgs(
    {
      executable: "/opt/node",
      args: ["/opt/jscpd/run-jscpd.js"],
      availabilityArgs: ["/opt/jscpd/run-jscpd.js", "--version"],
      maxConcurrency: 4
    },
    75
  );
}

function repositoryLocalJscpdCacheArgs(): readonly string[] {
  return jscpdCacheArgs(
    {
      executable: "/workspace/consumer/node_modules/.bin/jscpd",
      args: [],
      availabilityArgs: ["--version"],
      maxConcurrency: 4
    },
    75
  );
}

function assertCacheRoundTrip(
  tempDir: string,
  identity: DuplicateCodeCacheIdentity,
  baseKey: string
): void {
  const hit = loadScanCacheEntry({ rootDir: tempDir, identity });
  assert.equal(hit.hit, true);
  assert.equal(
    hit.hit ? relative(tempDir, hit.cachePath).split("\\").join("/") : "",
    `quality-scan-cache-v1/${baseKey}.json`
  );
}

function assertVersionMismatch(tempDir: string, identity: DuplicateCodeCacheIdentity): void {
  const mismatched = loadScanCacheEntry({
    rootDir: tempDir,
    identity: { ...identity, toolVersion: "5.0.12" }
  });
  assert.equal(mismatched.hit, false);
}

function cacheIdentity(): DuplicateCodeCacheIdentity {
  return {
    toolName: "jscpd",
    toolVersion: "5.0.11",
    normalizedToolArgs: [
      "<bun>",
      "<package-jscpd-bin>",
      "--min-tokens",
      "75",
      "--reporters",
      "json"
    ],
    configVersion: "quality-observability-v1",
    codeArea: TEST_CODE_AREA,
    commitSha: "abc123",
    inputFingerprint: {
      fileCount: 1,
      fileList: ["src/risky.ts"],
      fingerprint: "sha256:test:1"
    }
  };
}

function fakeInstalledJscpdBin(rootDir: string, consumerName: string): string {
  const packageDir = join(rootDir, consumerName, "node_modules", "jscpd");
  const packageManifestPath = join(packageDir, "package.json");
  mkdirSync(packageDir, { recursive: true });
  writeFileSync(packageManifestPath, JSON.stringify({ bin: { jscpd: "./run-jscpd.js" } }), "utf8");
  writeFileSync(join(packageDir, "run-jscpd.js"), "", "utf8");
  return readJscpdBinTarget(packageManifestPath) ?? "";
}

function duplicateFragment(): DuplicateCodeFragment {
  return {
    id: 1,
    tokenCount: 90,
    lineCount: 10,
    codeAreas: [],
    locations: [
      { path: "src/a.ts", startLine: 10, endLine: 20, codeArea: "unknown" },
      { path: "src/b.ts", startLine: 11, endLine: 21, codeArea: "unknown" }
    ]
  };
}
