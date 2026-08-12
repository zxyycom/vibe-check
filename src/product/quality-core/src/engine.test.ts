import { describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadSemanticProjectConfig } from "../../config-file.ts";
import { resolveQualityConfig } from "../../config-resolution.ts";
import type { ScannerDependencySnapshot } from "../../scanner-dependencies.ts";
import type { GatePolicy, ResolvedQualityConfig } from "./model/schema.ts";
import { runQualityScan } from "./engine.ts";
import {
  assertNoMachinePublication,
  captureConsole,
  gateOutput,
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
  test("publishes the same records and GateResult across successful outputs", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-success-"));
    try {
      const config = acceptedFixtureConfig(await loadFixtureConfig());
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
        prepareArtifactDir: seedPriorMachinePublication,
        tempRoot
      });
      const clean = await runFixtureScan({
        artifactName: "clean",
        config: cleanFixtureConfig(config),
        gatePolicy: null,
        tempRoot
      });

      expect(omitted.machine.run.decision.gate).toEqual({
        policyId: null,
        status: "disabled"
      });
      expect(requested.machine.run.decision.gate.status).toBe("passed");
      expect(requested.machine.records.map(({ recordId }) => recordId)).toEqual(
        omitted.machine.records.map(({ recordId }) => recordId)
      );
      expect(requested.machine.records).toHaveLength(3);
      expect(requested.machine.run.acceptance).toHaveLength(3);
      expect(omitted.outcome).toBe("success");
      expect(requested.outcome).toBe("success");
      expect(clean.outcome).toBe("success");
      expect(clean.machine.records).toEqual([]);
      expect(clean.stdout.includes("Quality check status: passed")).toBe(true);
      expect(omitted.stdout.includes("Quality check status: warning")).toBe(true);
      expect(gateOutput(requested.stdout)).toEqual([
        "✅ Quality gate passed.",
        "  Policy: all",
        "  Status: passed",
        "  Blocking records: 0"
      ]);
      expect(
        readFileSync(resolve(requested.artifactDir, "report.md"), "utf8")
          .includes("- **Gate status**: passed")
      ).toBe(true);
      expect(existsSync(resolve(requested.artifactDir, "metrics.json"))).toBe(false);
      expect(existsSync(resolve(requested.artifactDir, "warnings.ndjson"))).toBe(false);
      expect(existsSync(resolve(requested.artifactDir, "warnings-all.ndjson"))).toBe(false);
      expect(existsSync(resolve(requested.artifactDir, "raw"))).toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("returns gate-failed only after the written failed-gate publication validates", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-failed-"));
    try {
      const result = await runFixtureScan({
        artifactName: "failed-gate",
        config: await loadFixtureConfig(),
        gatePolicy: "all",
        tempRoot
      });

      expect(result.machine.run.completeness.status).toBe("complete");
      expect(result.machine.records.length > 0).toBe(true);
      expect(result.machine.run.decision.gate.status).toBe("failed");
      expect(result.outcome).toBe("gate-failed");
      expect(result.stdout.includes("❌ Quality gate failed.")).toBe(true);
      expect(result.stdout.includes(
        `  Blocking records: ${result.machine.records.length}`
      )).toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("returns failed for requested gates without complete evidence", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-not-evaluated-"));
    try {
      const fixtureConfig = await loadFixtureConfig();
      const emptyConfig = {
        ...fixtureConfig,
        include: ["does-not-exist/**/*.ts"]
      };
      const empty = await runFixtureScan({
        artifactName: "empty",
        config: emptyConfig,
        gatePolicy: "all",
        tempRoot
      });
      const ungatedEmpty = await runFixtureScan({
        artifactName: "ungated-empty",
        config: emptyConfig,
        gatePolicy: null,
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
      const unavailableReference = await runFixtureScan({
        artifactName: "unavailable-reference",
        baselineCommitSha: "a".repeat(40),
        config: fixtureConfig,
        gatePolicy: "changed",
        scanProfile: "full",
        tempRoot
      });

      expect(empty.machine.run.decision.gate.status).toBe("not-evaluated");
      expect(empty.outcome).toBe("failed");
      expect(empty.stderr.includes("  Reason: no-eligible-input")).toBe(true);
      expect(ungatedEmpty.machine.run.completeness.status).toBe("complete");
      expect(ungatedEmpty.machine.records).toEqual([]);
      expect(ungatedEmpty.outcome).toBe("success");
      expect(ungatedEmpty.stdout.includes("Quality check status: warning")).toBe(true);
      expect(incomplete.machine.run.completeness.status).toBe("incomplete");
      expect(incomplete.machine.run.decision.gate.status).toBe("not-evaluated");
      expect(incomplete.outcome).toBe("failed");
      expect(incomplete.stderr.includes("  Reason: scan-incomplete")).toBe(true);
      expect(unavailableReference.machine.run.completeness.status).toBe("complete");
      expect(unavailableReference.machine.run.references.evidence.every(
        ({ status }) => status === "unavailable"
      )).toBe(true);
      expect(unavailableReference.machine.run.decision.gate.status).toBe("not-evaluated");
      expect(unavailableReference.stderr.includes("  Reason: comparison-unavailable"))
        .toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("returns failed when artifact output fails after a failed gate was computed", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-output-failure-"));
    try {
      const result = await runFixtureScanWithoutArtifacts({
        artifactName: "output-failure",
        config: await loadFixtureConfig(),
        gatePolicy: "all",
        prepareArtifactDir: (artifactDir) => writeFileSync(artifactDir, "blocked", "utf8"),
        tempRoot
      });

      expect(result.outcome).toBe("failed");
      expect(gateOutput(result.stdout)).toEqual([]);
      expect(result.stderr.some((line) => line.includes("Fatal quality scan issue:"))).toBe(true);
      assertNoMachinePublication(result.artifactDir, result.stdout);

      if (process.platform !== "win32") {
        const cleanupArtifactDir = resolve(tempRoot, "cleanup-failure");
        seedPriorMachinePublication(cleanupArtifactDir);
        mkdirSync(resolve(cleanupArtifactDir, "raw"));
        chmodSync(cleanupArtifactDir, 0o300);
        try {
          const cleanupFailure = await runFixtureScanWithoutArtifacts({
            artifactName: "cleanup-failure",
            config: await loadFixtureConfig(),
            gatePolicy: "all",
            tempRoot
          });

          chmodSync(cleanupArtifactDir, 0o700);
          expect(cleanupFailure.outcome).toBe("failed");
          expect(gateOutput(cleanupFailure.stdout)).toEqual([]);
          expect(cleanupFailure.stdout.some((line) => line.includes(" → "))).toBe(false);
          expect(readFileSync(resolve(cleanupArtifactDir, "run.json"), "utf8")).toBe("stale");
          expect(readFileSync(resolve(cleanupArtifactDir, "records.ndjson"), "utf8"))
            .toBe("stale");
        } finally {
          chmodSync(cleanupArtifactDir, 0o700);
        }
      }
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("does not publish a computed failed gate when output validation fails", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-validation-failure-"));
    try {
      const config = await loadFixtureConfig();
      const result = await runFixtureScanWithoutArtifacts({
        artifactName: "validation-failure",
        config: {
          ...config,
          acceptedWarnings: [{
            checkId: "file-code-lines",
            reason: ""
          }]
        },
        gatePolicy: "all",
        prepareArtifactDir: seedPriorMachinePublication,
        tempRoot
      });

      expect(result.outcome).toBe("failed");
      expect(gateOutput(result.stdout)).toEqual([]);
      assertNoMachinePublication(result.artifactDir, result.stdout);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("keeps gate projection independent from verification warning preview", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-verification-output-"));
    try {
      const config = acceptedFixtureConfig(await loadFixtureConfig());
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
      expect(normal.machine.records.map(stableRecordProjection)).toEqual(
        verification.machine.records.map(stableRecordProjection)
      );
      expect(normal.machine.run.decision.gate.status).toBe(
        verification.machine.run.decision.gate.status
      );
      expect(normal.outcome).toBe(verification.outcome);
      expect(normal.stdout.includes("Quality check status: warning")).toBe(true);
      expect(verification.stdout.includes("Quality verification status: passed")).toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });
});

async function loadFixtureConfig(): Promise<ResolvedQualityConfig> {
  return resolveQualityConfig(
    await loadSemanticProjectConfig(resolve(fixtureRoot, ".vibe-check", "config.json"))
  );
}

function acceptedFixtureConfig(config: ResolvedQualityConfig): ResolvedQualityConfig {
  return {
    ...config,
    acceptedWarnings: [
      "file-code-lines",
      "function-code-lines",
      "function-cyclomatic-complexity"
    ].map((checkId) => ({
      checkId: checkId as ResolvedQualityConfig["acceptedWarnings"][number]["checkId"],
      reason: "Accepted by the core gate integration fixture."
    }))
  };
}

function cleanFixtureConfig(config: ResolvedQualityConfig): ResolvedQualityConfig {
  return {
    ...config,
    acceptedWarnings: [],
    checks: {
      ...config.checks,
      files: {
        codeLines: {
          ...config.checks.files.codeLines,
          absoluteFloor: 1_000_000,
          lowDecisionTokenAllowance: {
            ...config.checks.files.codeLines.lowDecisionTokenAllowance,
            codeLineFloor: 1_000_000
          }
        }
      },
      functions: {
        codeLines: {
          ...config.checks.functions.codeLines,
          absoluteFloor: 1_000_000,
          lowComplexityAllowance: {
            ...config.checks.functions.codeLines.lowComplexityAllowance,
            codeLineFloor: 1_000_000
          }
        },
        cyclomaticComplexity: {
          ...config.checks.functions.cyclomaticComplexity,
          absoluteFloor: 1_000_000
        },
        parameterCount: {
          ...config.checks.functions.parameterCount,
          absoluteFloor: 1_000_000
        }
      }
    }
  };
}

type RunFixtureScanOptions = {
  artifactName: string;
  baselineCommitSha?: string | null;
  config: ResolvedQualityConfig;
  dependencies?: ScannerDependencySnapshot;
  gatePolicy: GatePolicy | null;
  prepareArtifactDir?: (artifactDir: string) => void;
  scanProfile?: "full" | "quick";
  tempRoot: string;
  verificationOutput?: boolean;
};

async function runFixtureScan(options: RunFixtureScanOptions) {
  const output = await runFixtureScanWithoutArtifacts(options);
  if (!existsSync(resolve(output.artifactDir, "run.json"))) {
    throw new Error(`fixture scan did not publish: ${output.stderr.join(" | ")}`);
  }
  return {
    ...output,
    machine: readValidatedMachineArtifacts(output.artifactDir)
  };
}

async function runFixtureScanWithoutArtifacts(options: RunFixtureScanOptions) {
  const artifactDir = resolve(options.tempRoot, options.artifactName);
  options.prepareArtifactDir?.(artifactDir);
  const output = await captureConsole(() =>
    runQualityScan({
      config: {
        ...options.config,
        cacheDir: resolve(options.tempRoot, `${options.artifactName}-cache`)
      },
      dependencies: options.dependencies ?? FIXTURE_DEPENDENCIES,
      options: {
        artifactDir,
        baselineCommitSha: options.baselineCommitSha ?? null,
        changedFiles: null,
        gatePolicy: options.gatePolicy,
        scanProfile: options.scanProfile ?? "quick",
        topN: options.config.report.topN,
        verificationOutput: options.verificationOutput ?? false
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

function stableRecordProjection(record: {
  readonly fields: object;
  readonly message: string;
  readonly recordId: string;
}) {
  return { fields: record.fields, message: record.message, recordId: record.recordId };
}
