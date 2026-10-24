import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
import { DEFAULT_JSCPD_COMMAND } from "../jscpd/command-resolution.ts";

describe("quality measurement cache", () => {
  it("keys duplicate-code cache by scanner and exact input identity", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-cache-"));
    const identity = cacheIdentity();
    const fragment = duplicateFragment();

    try {
      const baseKey = buildScanCacheKey(identity);
      assertIdentityInputs(baseKey, identity);
      assertDefaultJscpdIdentity();
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
  assert.notEqual(baseKey, buildScanCacheKey({ ...identity, commitSha: "changed-commit" }));
  assert.notEqual(baseKey, buildScanCacheKey({ ...identity, toolVersion: "5.0.12" }));
  assert.notEqual(
    baseKey,
    buildScanCacheKey({
      ...identity,
      scannerConfiguration: { ...identity.scannerConfiguration, minimumLines: 4 }
    })
  );
  assert.notEqual(
    baseKey,
    buildScanCacheKey({
      ...identity,
      scannerConfiguration: {
        ...identity.scannerConfiguration,
        backend: { kind: "custom", executable: "/another/jscpd" }
      }
    })
  );
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
    commitSha: "abc123",
    inputFingerprint: {
      fileCount: 1,
      fileList: ["src/risky.ts"],
      fingerprint: "sha256:test:1"
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

function assertDefaultJscpdIdentity(): void {
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
