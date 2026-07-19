import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { QualityConfig, ToolAvailability } from "../../../model/schema.ts";
import {
  planJscpdAreaScanTasks,
  scanJscpdAreasWithCache,
  type JscpdAreaScanFailure
} from "./area-scans.ts";
import { TEST_QUALITY_CONFIG } from "../../../../test/config.ts";

// @case AUX-QUALITY-JSCPD-TASK-001
describe("jscpd tasks", () => {
  it("plans one scan task per code area", () => {
    const tasks = planJscpdAreaScanTasks([
      {
        area: "rust-production",
        files: ["crates/b/src/lib.rs", "crates/a/src/lib.rs"],
        minimumTokens: 75
      },
      {
        area: "typescript-production-scripts",
        files: ["scripts/a.ts", "scripts/b.ts"],
        minimumTokens: 75
      }
    ]);

    assert.deepEqual(tasks.map((task) => task.id), [
      "jscpd:rust-production",
      "jscpd:typescript-production-scripts"
    ]);
    assert.deepEqual(tasks[0]!.files, [
      "crates/a/src/lib.rs",
      "crates/b/src/lib.rs"
    ]);
  });

  it("records current failures and throws baseline failures for invalid jscpd output", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "docnav-quality-jscpd-area-"));
    const fakeJscpdPath = join(tempDir, "fake-jscpd.ts");
    const scannerFailures: JscpdAreaScanFailure[] = [];

    writeFileSync(fakeJscpdPath, "process.exit(0);\n", "utf8");

    try {
      const scanOptions = {
        cacheRootDir: tempDir,
        commitSha: "abc123",
        config: configWithJscpdCommand(process.execPath, [fakeJscpdPath]),
        cwd: tempDir,
        fileMap: new Map([
          ["typescript-production-scripts", ["scripts/a.ts", "scripts/b.ts"]]
        ]),
        fingerprints: {
          "typescript-production-scripts": {
            fileCount: 2,
            fileList: ["scripts/a.ts", "scripts/b.ts"],
            fingerprint: "sha256:test"
          }
        },
        logPrefix: "",
        toolResults: availableJscpd()
      };
      const fragments = await withMutedConsoleLog(() =>
        scanJscpdAreasWithCache({
          ...scanOptions,
          scanKind: "current",
          scannerFailures,
          throwOnFailure: false
        })
      );

      assert.deepEqual(fragments, []);
      assert.equal(scannerFailures.length, 1);
      assert.equal(scannerFailures[0]!.reason, "jscpd-report-failure");
      assert.match(
        scannerFailures[0]!.error,
        /jscpd scan failed for task jscpd:typescript-production-scripts/
      );
      assert.match(scannerFailures[0]!.error, /jscpd JSON report missing/);

      await assert.rejects(
        withMutedConsoleLog(() =>
          scanJscpdAreasWithCache({
            ...scanOptions,
            scanKind: "baseline",
            throwOnFailure: true
          })
        ),
        /baseline jscpd scan failed for task jscpd:typescript-production-scripts/
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

function configWithJscpdCommand(command: string, args: string[]): QualityConfig {
  return {
    ...TEST_QUALITY_CONFIG,
    tools: {
      ...TEST_QUALITY_CONFIG.tools,
      jscpd: { command, args }
    }
  };
}

async function withMutedConsoleLog<T>(callback: () => Promise<T>): Promise<T> {
  const originalLog: typeof console.log = console.log;
  console.log = () => undefined;
  try {
    return await callback();
  } finally {
    console.log = originalLog;
  }
}

function availableJscpd(): ToolAvailability[] {
  return [{
    name: "jscpd",
    available: true,
    version: "5.0.11",
    error: null,
    source: "repository devDependency"
  }];
}
