import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadSemanticProjectConfig } from "../../config-file.ts";
import { resolveQualityConfig } from "../../config-resolution.ts";
import type { ScannerDependencySnapshot } from "../../scanner-dependencies.ts";
import { type MachineMetricsV1 } from "../../machine-output.ts";
import {
  type GatePolicy,
  type ResolvedQualityConfig
} from "./model/schema.ts";
import { runQualityScan } from "./engine.ts";
import {
  assertNoMachinePublication,
  captureConsole,
  gateOutput,
  readNdjson,
  readValidatedMachineArtifacts,
  seedPriorMachinePublication
} from "./engine.test-support.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");
const controlledScanner = resolve(fixtureRoot, "tools/controlled-scanner.ts");
const FIXTURE_DEPENDENCIES: ScannerDependencySnapshot = {
  duplication: {
    args: [controlledScanner, "jscpd"],
    availabilityArgs: [controlledScanner, "jscpd", "--version"],
    executable: process.execPath,
    maxConcurrency: 4
  },
  file: {
    args: [controlledScanner, "scc"],
    availabilityArgs: [controlledScanner, "scc", "--version"],
    executable: process.execPath
  },
  function: {
    args: [controlledScanner, "lizard"],
    availabilityArgs: [controlledScanner, "lizard", "--version"],
    executable: process.execPath
  }
};

describe("quality scan process outcome", () => {
  test("publishes the same warnings and GateResult across successful outputs", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-success-"));

    try {
      const fixtureConfig = await loadFixtureConfig();
      const config: ResolvedQualityConfig = {
        ...fixtureConfig,
        acceptedWarnings: [
          {
            checkId: "function-cyclomatic-complexity",
            reason: "Accepted by the core gate integration fixture.",
          },
          {
            checkId: "function-code-lines",
            reason: "Accepted by the core gate integration fixture.",
          },
          {
            checkId: "file-code-lines",
            reason: "Accepted by the core gate integration fixture.",
          }
        ]
      };

      const omitted = await runFixtureScan({
        artifactName: "omitted",
        config,
        gatePolicy: null,
        tempRoot
      });
      const requested = await runFixtureScan({
        artifactName: "requested",
        config,
        gatePolicy: "all",
        tempRoot
      });
      const omittedReport = readFileSync(
        resolve(omitted.artifactDir, "report.md"),
        "utf8"
      );
      const requestedReport = readFileSync(
        resolve(requested.artifactDir, "report.md"),
        "utf8"
      );
      const omittedWarningArtifacts = {
        all: readNdjson(resolve(omitted.artifactDir, "warnings-all.ndjson")),
        changed: readNdjson(resolve(omitted.artifactDir, "warnings.ndjson"))
      };
      const requestedWarningArtifacts = {
        all: readNdjson(resolve(requested.artifactDir, "warnings-all.ndjson")),
        changed: readNdjson(resolve(requested.artifactDir, "warnings.ndjson"))
      };

      expect(omitted.metrics.gate).toEqual({
        policy: null,
        status: "disabled"
      });
      expect(requested.metrics.warnings).toEqual(omitted.metrics.warnings);
      expect(requestedWarningArtifacts).toEqual(omittedWarningArtifacts);
      expect(requestedWarningArtifacts).toEqual({
        all: requested.metrics.warnings.all,
        changed: requested.metrics.warnings.changed
      });
      expect(requested.metrics.warnings.all).toHaveLength(3);
      expect(
        requested.metrics.warnings.all.every(
          ({ acceptedReason }) =>
            acceptedReason === "Accepted by the core gate integration fixture."
        )
      ).toBe(true);
      expect(requested.metrics.gate).toEqual({
        blockingWarningCount: 0,
        blockingWarnings: [],
        evaluatedChannel: "all",
        evaluatedWarningCount: requested.metrics.warnings.all.length,
        policy: "all",
        status: "passed"
      });
      expect(omitted.outcome).toBe("success");
      expect(requested.outcome).toBe("success");
      expect(omitted.stdout.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(omitted.stderr.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(
        requested.stdout.includes("✅ Quality gate passed for the resolved quick profile.")
      ).toBe(true);
      expect(requested.stdout.includes("  Policy: all")).toBe(true);
      expect(requested.stdout.includes("  Status: passed")).toBe(true);
      expect(requested.stdout.includes("  Evaluated channel: all")).toBe(true);
      expect(requested.stdout.includes("  Evaluated warnings: 3")).toBe(true);
      expect(requested.stdout.includes("  Blocking warnings: 0")).toBe(true);
      expect(requested.stderr.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(omittedReport.includes("## Quality Gate")).toBe(false);
      expect(requestedReport.includes("## Quality Gate")).toBe(true);
      expect(requestedReport.includes("- **Policy**: `all`")).toBe(true);
      expect(requestedReport.includes("- **Status**: `passed`")).toBe(true);
      expect(requestedReport.includes("- **Evaluated channel**: `all`")).toBe(true);
      expect(requestedReport.includes("- **Evaluated warnings**: 3")).toBe(true);
      expect(requestedReport.includes("- **Blocking warnings**: 0")).toBe(true);
      expect(omittedReport.includes("vibe-check.metrics.v1")).toBe(false);
      expect(requestedReport.includes("vibe-check.warning.v1")).toBe(false);
      const rawFileMetrics = JSON.parse(
        readFileSync(resolve(requested.artifactDir, "raw", "scc-output.json"), "utf8")
      ) as unknown;
      expect(Array.isArray(rawFileMetrics)).toBe(true);
      expect(JSON.stringify(rawFileMetrics).includes("schemaVersion")).toBe(false);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("returns gate-failed only after the written failed-gate metrics validate", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-failed-"));

    try {
      const config = await loadFixtureConfig();
      const result = await runFixtureScan({
        artifactName: "failed-gate",
        config,
        gatePolicy: "all",
        tempRoot
      });

      expect(result.metrics.scanCompleteness.overall).toBe("complete");
      expect(result.metrics.warnings.all.length > 0).toBe(true);
      expect(result.metrics.gate.status).toBe("failed");
      expect(result.outcome).toBe("gate-failed");
      expect(
        result.stdout.includes("❌ Quality gate failed for the resolved quick profile.")
      ).toBe(true);
      expect(result.stdout.includes("  Status: failed")).toBe(true);
      expect(
        result.stdout.includes(
          `  Blocking warnings: ${result.metrics.warnings.all.length}`
        )
      ).toBe(true);
      expect(result.stderr.filter((line) => line.includes("Quality gate"))).toEqual([]);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("returns failed for requested gates without complete evidence", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-not-evaluated-"));

    try {
      const fixtureConfig = await loadFixtureConfig();
      const empty = await runFixtureScan({
        artifactName: "empty",
        config: {
          ...fixtureConfig,
          include: ["does-not-exist/**/*.ts"]
        },
        gatePolicy: "all",
        tempRoot
      });
      const incomplete = await runFixtureScan({
        artifactName: "incomplete",
        config: fixtureConfig,
        dependencies: {
          ...FIXTURE_DEPENDENCIES,
          file: {
            args: [],
            availabilityArgs: ["--version"],
            executable: resolve(tempRoot, "missing-scc")
          }
        },
        gatePolicy: "all",
        tempRoot
      });

      expect(empty.metrics.scanCompleteness.overall).toBe("empty");
      expect(empty.metrics.gate).toEqual({
        policy: "all",
        reasonCode: "no-eligible-input",
        status: "not-evaluated"
      });
      expect(empty.outcome).toBe("failed");
      expect(
        empty.stderr.includes(
          "❌ Quality gate was not evaluated for the resolved quick profile."
        )
      ).toBe(true);
      expect(empty.stderr.includes("  Reason code: no-eligible-input")).toBe(true);
      expect(
        empty.stderr.includes(
          "  Action: Adjust the resolved quick profile or configured include scope (does-not-exist/**/*.ts) so at least one requested capability has eligible input."
        )
      ).toBe(true);

      expect(incomplete.metrics.scanCompleteness.overall).toBe("failed");
      expect(incomplete.metrics.gate).toEqual({
        policy: "all",
        reasonCode: "scan-incomplete",
        status: "not-evaluated"
      });
      expect(incomplete.outcome).toBe("failed");
      const failedCapability = incomplete.metrics.scanCompleteness.capabilities.find(
        (result) => result.status === "failed"
      );
      expect(failedCapability?.status).toBe("failed");
      if (failedCapability?.status === "failed") {
        expect(
          incomplete.stderr.includes(
            `  Action (${failedCapability.capabilityId}): ${failedCapability.diagnostic.action}`
          )
        ).toBe(true);
      }
      expect(incomplete.stderr.includes("  Reason code: scan-incomplete")).toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("returns failed when artifact output fails after a failed gate was computed", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-output-failure-"));

    try {
      const config = await loadFixtureConfig();
      const result = await runFixtureScanWithoutArtifacts({
        artifactName: "output-failure",
        config,
        gatePolicy: "all",
        prepareArtifactDir: (artifactDir) => {
          mkdirSync(resolve(artifactDir, "report.md"), { recursive: true });
        },
        tempRoot
      });

      expect(result.outcome).toBe("failed");
      expect(result.stdout.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.includes("Fatal quality scan issues:")).toBe(true);
      expect(existsSync(resolve(result.artifactDir, "raw"))).toBe(true);
      expect(existsSync(resolve(result.artifactDir, "report.md"))).toBe(true);
      assertNoMachinePublication(result.artifactDir, result.stdout);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("does not publish a computed failed gate when output validation fails", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-validation-failure-"));

    try {
      const fixtureConfig = await loadFixtureConfig();
      const result = await runFixtureScanWithoutArtifacts({
        artifactName: "validation-failure",
        config: {
          ...fixtureConfig,
          version: ""
        } as unknown as ResolvedQualityConfig,
        gatePolicy: "all",
        prepareArtifactDir: seedPriorMachinePublication,
        tempRoot
      });

      expect(result.outcome).toBe("failed");
      expect(result.stdout.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.includes("Fatal quality scan issues:")).toBe(true);
      expect(result.stderr.some((line) => line.includes("metrics validation:"))).toBe(true);
      expect(existsSync(resolve(result.artifactDir, "raw"))).toBe(true);
      expect(existsSync(resolve(result.artifactDir, "report.md"))).toBe(false);
      assertNoMachinePublication(result.artifactDir, result.stdout);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("keeps gate projection independent from verification warning preview", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-verification-output-"));

    try {
      const fixtureConfig = await loadFixtureConfig();
      const config: ResolvedQualityConfig = {
        ...fixtureConfig,
        acceptedWarnings: [
          {
            checkId: "function-cyclomatic-complexity",
            reason: "Accepted by the gate verification-output fixture.",
          },
          {
            checkId: "function-code-lines",
            reason: "Accepted by the gate verification-output fixture.",
          },
          {
            checkId: "file-code-lines",
            reason: "Accepted by the gate verification-output fixture.",
          }
        ]
      };
      const normal = await runFixtureScan({
        artifactName: "normal-preview",
        config,
        gatePolicy: "all",
        tempRoot
      });
      const verification = await runFixtureScan({
        artifactName: "verification-preview",
        config,
        gatePolicy: "all",
        tempRoot,
        verificationOutput: true
      });

      expect(gateOutput(normal.stdout)).toEqual(gateOutput(verification.stdout));
      expect(gateOutput(normal.stdout)).toEqual([
        "✅ Quality gate passed for the resolved quick profile.",
        "  Policy: all",
        "  Status: passed",
        "  Evaluated channel: all",
        "  Evaluated warnings: 3",
        "  Blocking warnings: 0"
      ]);
      expect(normal.stdout.includes("Quality check status: warning")).toBe(true);
      expect(
        verification.stdout.includes("Quality verification status: passed")
      ).toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});

async function loadFixtureConfig(): Promise<ResolvedQualityConfig> {
  return resolveQualityConfig(
    await loadSemanticProjectConfig(
      resolve(fixtureRoot, ".vibe-check", "config.json")
    )
  );
}

type RunFixtureScanOptions = {
  artifactName: string;
  config: ResolvedQualityConfig;
  dependencies?: ScannerDependencySnapshot;
  gatePolicy: GatePolicy | null;
  prepareArtifactDir?: (artifactDir: string) => void;
  tempRoot: string;
  verificationOutput?: boolean;
};

async function runFixtureScan(
  options: RunFixtureScanOptions
): Promise<{
  artifactDir: string;
  metrics: MachineMetricsV1;
  outcome: Awaited<ReturnType<typeof runQualityScan>>;
  stderr: string[];
  stdout: string[];
}> {
  const {
    artifactName,
    config,
    dependencies,
    gatePolicy,
    prepareArtifactDir,
    tempRoot,
    verificationOutput = false
  } = options;
  const output = await runFixtureScanWithoutArtifacts({
    artifactName,
    config,
    dependencies,
    gatePolicy,
    prepareArtifactDir,
    tempRoot,
    verificationOutput
  });
  const metrics = readValidatedMachineArtifacts(output.artifactDir).metrics;

  return { ...output, metrics };
}

async function runFixtureScanWithoutArtifacts(
  options: RunFixtureScanOptions
): Promise<{
  artifactDir: string;
  outcome: Awaited<ReturnType<typeof runQualityScan>>;
  stderr: string[];
  stdout: string[];
}> {
  const {
    artifactName,
    config,
    dependencies = FIXTURE_DEPENDENCIES,
    gatePolicy,
    prepareArtifactDir,
    tempRoot,
    verificationOutput = false
  } = options;
  const artifactDir = resolve(tempRoot, artifactName);
  prepareArtifactDir?.(artifactDir);
  const output = await captureConsole(() =>
    runQualityScan({
      config: {
        ...config,
        cacheDir: resolve(tempRoot, `${artifactName}-cache`)
      },
      dependencies,
      options: {
        artifactDir,
        baselineCommitSha: null,
        changedFiles: null,
        gatePolicy,
        scanProfile: "quick",
        topN: config.report.topN,
        verificationOutput
      },
      root: fixtureRoot
    })
  );

  return {
    artifactDir,
    outcome: output.result,
    stderr: output.stderr,
    stdout: output.stdout
  };
}
