import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createEmptyMetrics } from "../../model/schema.ts";
import type {
  ResolvedQualityConfig,
  ToolAvailability
} from "../../model/schema.ts";
import { maybeScanBaselineRevision } from "../../scan-command/baseline/scan.ts";
import {
  TEST_QUALITY_CONFIG,
  TEST_SCANNER_DEPENDENCIES
} from "../../../test/config.ts";
import type { ScannerDependencySnapshot } from "../../../../scanner-dependencies.ts";
import { runJscpdScan } from "./jscpd.ts";
import { runLizardScan } from "./lizard.ts";
import type { ScanContext } from "./scan-context.ts";
import { runSccScan } from "./scc.ts";

describe("current revision scanner failure projection", () => {
  it("keeps eligible Lizard zero-function output succeeded", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-lizard-empty-"));
    const fakeLizardPath = join(tempDir, "fake-lizard.ts");
    writeFileSync(fakeLizardPath, 'process.stdout.write("");\n', "utf8");
    const dependencies = dependenciesWithScanner("function", process.execPath, [fakeLizardPath]);
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [availableTool("lizard")], dependencies);

    try {
      const result = await withMutedConsoleLog(async () =>
        runLizardScan(context, ["scripts/a.ts"])
      );

      assert.deepEqual(result, {
        capabilityId: "function-metrics",
        status: "succeeded"
      });
      assert.deepEqual(context.metrics.functionMetrics, []);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns malformed Lizard output through CapabilityResult only", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-lizard-"));
    const fakeLizardPath = join(tempDir, "fake-lizard.ts");
    writeFileSync(fakeLizardPath, 'process.stdout.write("not,lizard,csv");\n', "utf8");
    const dependencies = dependenciesWithScanner("function", process.execPath, [fakeLizardPath]);
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [availableTool("lizard")], dependencies);
    context.metrics.baseline.status = "generated";
    context.metrics.baseline.commitSha = "invalid-baseline";
    context.metrics.comparisonStatus = "compared";

    try {
      const result = await withMutedConsoleLog(async () =>
        runLizardScan(context, ["scripts/a.ts"])
      );

      assert.equal(result.status, "failed");
      if (result.status === "failed") {
        assert.equal(result.diagnostic.kind, "invalid-result");
      }
      assert.equal("fatalIssues" in context, false);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns Lizard execution failures through CapabilityResult only", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-lizard-execution-"));
    const fakeLizardPath = join(tempDir, "fake-lizard.ts");
    writeFileSync(
      fakeLizardPath,
      'console.error("parse report expected after invocation");\nprocess.exit(2);\n',
      "utf8"
    );
    const dependencies = dependenciesWithScanner("function", process.execPath, [fakeLizardPath]);
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [availableTool("lizard")], dependencies);

    try {
      const result = await withMutedConsoleLog(async () =>
        runLizardScan(context, ["scripts/a.ts"])
      );

      assert.equal(result.status, "failed");
      if (result.status === "failed") {
        assert.equal(result.diagnostic.kind, "execution");
      }
      if (result.status === "failed") {
        assert.match(
          result.diagnostic.message,
          /lizard exit 2: parse report expected after invocation/
        );
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps scc non-zero exits as execution failures when stderr looks like a parser error", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-scc-execution-"));
    const fakeSccPath = join(tempDir, "fake-scc.ts");
    writeFileSync(
      fakeSccPath,
      'console.error("expected scc report parse output");\nprocess.exit(2);\n',
      "utf8"
    );
    const dependencies = dependenciesWithScanner("file", process.execPath, [fakeSccPath]);
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [availableTool("scc")], dependencies);

    try {
      const result = await withMutedConsoleLog(async () =>
        runSccScan(context, ["scripts/a.ts"])
      );

      assert.equal(result.status, "failed");
      if (result.status === "failed") {
        assert.equal(result.diagnostic.kind, "execution");
      }
      if (result.status === "failed") {
        assert.match(
          result.diagnostic.message,
          /scc exit 2: expected scc report parse output/
        );
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns scc parse failures through CapabilityResult only", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-scc-"));
    const fakeSccPath = join(tempDir, "fake-scc.ts");
    writeFileSync(fakeSccPath, 'process.stdout.write("not,scc,csv");\n', "utf8");
    const dependencies = dependenciesWithScanner("file", process.execPath, [fakeSccPath]);
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [availableTool("scc")], dependencies);

    try {
      const result = await withMutedConsoleLog(async () =>
        runSccScan(context, ["scripts/a.ts"])
      );

      assert.equal(result.status, "failed");
      if (result.status === "failed") {
        assert.equal(result.diagnostic.kind, "invalid-result");
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns jscpd report failures through CapabilityResult only", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-jscpd-"));
    const fakeJscpdPath = join(tempDir, "fake-jscpd.ts");
    writeFileSync(fakeJscpdPath, "process.exit(0);\n", "utf8");
    const dependencies = dependenciesWithScanner("duplication", process.execPath, [fakeJscpdPath]);
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [availableTool("jscpd")], dependencies);
    context.fingerprints["typescript-production-scripts"] = {
      fileCount: 2,
      fileList: ["scripts/a.ts", "scripts/b.ts"],
      fingerprint: "sha256:test"
    };

    try {
      const result = await withMutedConsoleLog(() =>
        runJscpdScan(context, new Map([
          ["typescript-production-scripts", ["scripts/a.ts", "scripts/b.ts"]]
        ]))
      );

      assert.equal(result.status, "failed");
      if (result.status === "failed") {
        assert.equal(result.diagnostic.kind, "invalid-result");
      }
      if (result.status === "failed") {
        assert.match(result.diagnostic.message, /jscpd JSON report missing/);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("keeps jscpd non-zero exits as execution failures when stderr mentions reports", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-jscpd-execution-"));
    const fakeJscpdPath = join(tempDir, "fake-jscpd.ts");
    writeFileSync(
      fakeJscpdPath,
      'console.error("parse report expected after invocation");\nprocess.exit(2);\n',
      "utf8"
    );
    const dependencies = dependenciesWithScanner("duplication", process.execPath, [fakeJscpdPath]);
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [availableTool("jscpd")], dependencies);
    context.fingerprints["typescript-production-scripts"] = {
      fileCount: 2,
      fileList: ["scripts/a.ts", "scripts/b.ts"],
      fingerprint: "sha256:test"
    };

    try {
      const result = await withMutedConsoleLog(() =>
        runJscpdScan(context, new Map([
          ["typescript-production-scripts", ["scripts/a.ts", "scripts/b.ts"]]
        ]))
      );

      assert.equal(result.status, "failed");
      if (result.status === "failed") {
        assert.equal(result.diagnostic.kind, "execution");
      }
      if (result.status === "failed") {
        assert.match(
          result.diagnostic.message,
          /jscpd exit 2: parse report expected after invocation/
        );
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("maps post-preflight scanner spawn failures to execution failures", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-spawn-failures-"));
    const missingCommand = `vibe-check-missing-scanner-${process.pid}`;
    const sccContext = createScanContext(
      tempDir,
      TEST_QUALITY_CONFIG,
      [availableTool("scc")],
      dependenciesWithScanner("file", `${missingCommand}-scc`, []),
    );
    const lizardContext = createScanContext(
      tempDir,
      TEST_QUALITY_CONFIG,
      [availableTool("lizard")],
      dependenciesWithScanner("function", `${missingCommand}-lizard`, []),
    );
    const jscpdContext = createScanContext(
      tempDir,
      TEST_QUALITY_CONFIG,
      [availableTool("jscpd")],
      dependenciesWithScanner("duplication", `${missingCommand}-jscpd`, []),
    );
    jscpdContext.fingerprints["typescript-production-scripts"] = {
      fileCount: 2,
      fileList: ["scripts/a.ts", "scripts/b.ts"],
      fingerprint: "sha256:test"
    };

    try {
      const results = await withMutedConsoleLog(async () => [
        runSccScan(sccContext, ["scripts/a.ts"]),
        runLizardScan(lizardContext, ["scripts/a.ts"]),
        await runJscpdScan(jscpdContext, new Map([
          ["typescript-production-scripts", ["scripts/a.ts", "scripts/b.ts"]]
        ]))
      ]);

      for (const result of results) {
        assert.equal(result.status, "failed");
        if (result.status === "failed") {
          assert.equal(result.diagnostic.kind, "execution");
        }
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("returns unavailable capability failures through CapabilityResult only", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "vibe-check-current-unavailable-"));
    const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, [{
      ...availableTool("lizard"),
      available: false,
      error: "lizard unavailable",
      reason: "tool-unavailable",
      version: null
    }]);

    try {
      const result = await withMutedConsoleLog(async () =>
        runLizardScan(context, ["scripts/a.ts"])
      );

      assert.equal(result.status, "failed");
      if (result.status === "failed") {
        assert.equal(result.diagnostic.kind, "unavailable");
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("skips baseline only for current execution and invalid-result failures", async () => {
    const variants = [
      { blocksBaseline: true, kind: "execution" },
      { blocksBaseline: true, kind: "invalid-result" },
      { blocksBaseline: false, kind: "unavailable" }
    ] as const;

    for (const variant of variants) {
      const tempDir = mkdtempSync(join(tmpdir(), `vibe-check-baseline-${variant.kind}-`));
      const context = createScanContext(tempDir, TEST_QUALITY_CONFIG, []);
      context.metrics.baseline.status = "generated";
      context.metrics.baseline.commitSha = "invalid-baseline";
      context.metrics.comparisonStatus = "compared";
      context.metrics.scanCompleteness = {
        capabilities: [
          { capabilityId: "file-metrics", status: "no-input" },
          {
            capabilityId: "function-metrics",
            status: "failed",
            diagnostic: {
              action: "Fix the controlled failure.",
              kind: variant.kind,
              message: "controlled current measurement failure"
            }
          },
          { capabilityId: "duplicate-detection", status: "skipped" }
        ],
        overall: "failed"
      };

      try {
        const baselineRun = await captureConsoleLogs(() =>
          maybeScanBaselineRevision({
            config: TEST_QUALITY_CONFIG,
            root: tempDir,
            runtime: context
          })
        );

        assert.equal(baselineRun.result, null);
        if (variant.blocksBaseline) {
          assert.equal(context.metrics.baseline.status, "generated");
          assert.ok(
            baselineRun.logs.some((message) =>
              message.includes("Skipping baseline scan because current measurement failed")
            )
          );
        } else {
          assert.equal(context.metrics.baseline.status, "baseline-materialization-failed");
          assert.ok(
            baselineRun.logs.some((message) => message.includes("Materializing baseline"))
          );
        }
      } finally {
        rmSync(tempDir, { recursive: true, force: true });
      }
    }
  });
});

function createScanContext(
  root: string,
  config: ResolvedQualityConfig,
  toolResults: ToolAvailability[],
  dependencies: ScannerDependencySnapshot = TEST_SCANNER_DEPENDENCIES
): ScanContext {
  const rawDir = join(root, "raw");
  mkdirSync(rawDir, { recursive: true });
  return {
    cacheRootDir: join(root, "cache"),
    changedFiles: [],
    config,
    dependencies,
    fingerprints: {},
    metrics: createEmptyMetrics({
      configVersion: config.version,
      commitSha: "abc123",
      repository: root,
      scope: {
        excludeDirs: [...config.excludeDirs],
        generatedFiles: [...config.generatedFiles],
        include: [...config.include]
      },
      tools: []
    }),
    rawDir,
    root,
    toolResults
  };
}

function dependenciesWithScanner(
  scanner: keyof ScannerDependencySnapshot,
  executable: string,
  args: string[]
): ScannerDependencySnapshot {
  return {
    ...TEST_SCANNER_DEPENDENCIES,
    [scanner]: {
      ...TEST_SCANNER_DEPENDENCIES[scanner],
      args,
      availabilityArgs: [...args, "--version"],
      executable
    }
  };
}

function availableTool(name: ToolAvailability["name"]): ToolAvailability {
  return {
    available: true,
    error: null,
    name,
    source: "test",
    version: "test"
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

async function captureConsoleLogs<T>(
  callback: () => Promise<T>
): Promise<{ logs: string[]; result: T }> {
  const logs: string[] = [];
  const originalLog: typeof console.log = console.log;
  console.log = (...values: unknown[]) => {
    logs.push(values.map(String).join(" "));
  };
  try {
    return { logs, result: await callback() };
  } finally {
    console.log = originalLog;
  }
}
