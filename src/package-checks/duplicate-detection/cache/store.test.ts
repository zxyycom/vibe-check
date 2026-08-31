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
} from "./store.ts";
import type { DuplicateCodeFragment } from "../measurement-model.ts";
import { createDuplicateScanCacheIdentity, jscpdCacheConfiguration } from "./identity.ts";
import { DEFAULT_JSCPD_COMMAND, readJscpdBinTarget } from "../jscpd/command-resolution.ts";

describe("quality measurement cache", () => {
  it("keys duplicate-code cache by scanner and exact input identity", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-cache-"));
    const identity = cacheIdentity();
    const fragment = duplicateFragment();

    try {
      const baseKey = buildScanCacheKey(identity);
      assertIdentityInputs(baseKey, identity);
      assertDefaultJscpdIdentity(tempDir);
      assertRawScanConfigurationVersion();

      writeScanCacheEntry({ rootDir: tempDir, identity, metrics: [fragment] });
      assertCacheRoundTrip(tempDir, identity, baseKey);
      assertVersionMismatch(tempDir, identity);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("treats cache read I/O errors as a Check-local miss", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-cache-read-error-"));
    try {
      writeFileSync(join(tempDir, "quality-scan-cache-v3"), "blocked");
      const hit = loadScanCacheEntry({ rootDir: tempDir, identity: cacheIdentity() });
      assert.equal(hit.hit, false);
      if (!hit.hit) assert.equal(hit.reason, "cache-miss");
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function assertIdentityInputs(baseKey: string, identity: DuplicateCodeCacheIdentity): void {
  assert.notEqual(baseKey, buildScanCacheKey({ ...identity, configVersion: "changed" }));
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
      scannerConfiguration: { ...identity.scannerConfiguration, minimumTokens: 76 }
    })
  );
}

function assertRawScanConfigurationVersion(): void {
  const current = createDuplicateScanCacheIdentity({
    dependency: { command: DEFAULT_JSCPD_COMMAND },
    exactInput: {
      approvedExactPaths: ["src/risky.ts"],
      areas: [],
      cacheRootDir: ".cache/vibe-check",
      commitSha: "abc123",
      inputFingerprint: {
        fileCount: 1,
        fileList: ["src/risky.ts"],
        fingerprint: "sha256:test:1"
      },
      rootDir: "/workspace/consumer"
    },
    minimumLines: 3,
    minimumTokens: 75,
    toolVersion: "5.0.11"
  });
  assert.equal(current.configVersion, "4");
  assert.notEqual(
    buildScanCacheKey(current),
    buildScanCacheKey({ ...current, configVersion: "3" })
  );
}

function assertDefaultJscpdIdentity(tempDir: string): void {
  const defaultScanner = { command: DEFAULT_JSCPD_COMMAND };
  const defaultConfiguration = jscpdCacheConfiguration({
    dependency: defaultScanner,
    minimumLines: 3,
    minimumTokens: 75
  });
  assert.deepEqual(defaultConfiguration, {
    backend: { kind: "package" },
    minimumLines: 3,
    minimumTokens: 75,
    reportedPathMode: "absolute",
    reporter: "json",
    workerPolicy: "tool-default"
  });
  const firstInstalledBin = fakeInstalledJscpdBin(tempDir, "first-consumer");
  const secondInstalledBin = fakeInstalledJscpdBin(tempDir, "second-consumer");
  assert.notEqual(firstInstalledBin, secondInstalledBin);
  const publicDefaultCommand = JSON.stringify(DEFAULT_JSCPD_COMMAND);
  assert.equal(publicDefaultCommand.includes(firstInstalledBin), false);
  assert.equal(publicDefaultCommand.includes(secondInstalledBin), false);
  assert.deepEqual(
    jscpdCacheConfiguration({ dependency: defaultScanner, minimumLines: 3, minimumTokens: 75 }),
    jscpdCacheConfiguration({ dependency: defaultScanner, minimumLines: 3, minimumTokens: 75 })
  );
  assert.notDeepEqual(defaultConfiguration, explicitCustomJscpdCacheConfiguration());
  assert.deepEqual(repositoryLocalJscpdCacheConfiguration().backend, {
    executable: "/workspace/consumer/node_modules/.bin/jscpd",
    kind: "custom"
  });
}

function explicitCustomJscpdCacheConfiguration() {
  return jscpdCacheConfiguration({
    dependency: {
      command: {
        executable: "/opt/node",
        kind: "custom"
      }
    },
    minimumLines: 3,
    minimumTokens: 75
  });
}

function repositoryLocalJscpdCacheConfiguration() {
  return jscpdCacheConfiguration({
    dependency: {
      command: {
        executable: "/workspace/consumer/node_modules/.bin/jscpd",
        kind: "custom"
      }
    },
    minimumLines: 3,
    minimumTokens: 75
  });
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
    `quality-scan-cache-v3/${baseKey}.json`
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
    scannerConfiguration: {
      backend: { kind: "package" },
      minimumLines: 3,
      minimumTokens: 75,
      reportedPathMode: "absolute",
      reporter: "json",
      workerPolicy: "tool-default"
    },
    configVersion: "quality-observability-v1",
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
      { path: "src/a.ts", startLine: 10, endLine: 20 },
      { path: "src/b.ts", startLine: 11, endLine: 21 }
    ]
  };
}
