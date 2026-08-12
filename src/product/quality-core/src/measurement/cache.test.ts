import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

import {
  buildScanCacheKey,
  loadScanCacheEntry,
  writeScanCacheEntry,
  type DuplicateCodeCacheIdentity
} from "./cache.ts";
import type { DuplicateCodeFragment } from "../model/schema.ts";

const TEST_CODE_AREA = "typescript-production-scripts";
describe("quality measurement cache", () => {
  it("keys duplicate-code cache by scan identity and strips changed-scope annotations", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-cache-"));
    const identity = cacheIdentity();
    const fragment = duplicateFragment();
    fragment.hitsChangedScope = true;

    try {
      const baseKey = buildScanCacheKey(identity);
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

      writeScanCacheEntry({ rootDir: tempDir, identity, metrics: [fragment] });

      const hit = loadScanCacheEntry({ rootDir: tempDir, identity });
      assert.equal(hit.hit, true);
      assert.equal(hit.hit ? hit.metrics[0]!.hitsChangedScope : true, false);
      assert.equal(
        hit.hit ? relative(tempDir, hit.cachePath).split("\\").join("/") : "",
        `quality-scan-cache-v1/${baseKey}.json`
      );

      assert.notEqual(
        baseKey,
        buildScanCacheKey({
          ...identity,
          normalizedToolArgs: ["exec", "jscpd", "--min-tokens", "75", "--reporters", "json"]
        })
      );

      const mismatched = loadScanCacheEntry({
        rootDir: tempDir,
        identity: { ...identity, toolVersion: "5.0.12" }
      });
      assert.equal(mismatched.hit, false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function cacheIdentity(): DuplicateCodeCacheIdentity {
  return {
    scanKind: "current",
    toolName: "jscpd",
    toolVersion: "5.0.11",
    normalizedToolArgs: ["<repo-local-jscpd-bin>", "--min-tokens", "75", "--reporters", "json"],
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

function duplicateFragment(): DuplicateCodeFragment {
  return {
    id: 1,
    tokenCount: 90,
    lineCount: 10,
    codeAreas: [],
    hitsChangedScope: false,
    locations: [
      { path: "src/a.ts", startLine: 10, endLine: 20, codeArea: "unknown" },
      { path: "src/b.ts", startLine: 11, endLine: 21, codeArea: "unknown" }
    ]
  };
}
