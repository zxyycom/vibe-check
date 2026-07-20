import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadQualityConfig } from "../../config-file.ts";
import {
  validateMetrics,
  type GatePolicy,
  type QualityConfig,
  type QualityMetrics
} from "./model/schema.ts";
import { runQualityScan } from "./engine.ts";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const fixtureRoot = resolve(repoRoot, "fixtures/projects/configured-typescript");

// @case WB-RUNTIME-GATE-OUTCOME-001
describe("quality scan process outcome", () => {
  test("publishes the same warnings and GateResult across successful outputs", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-success-"));

    try {
      const fixtureConfig = await loadQualityConfig(
        resolve(fixtureRoot, "vibe-check.config.json")
      );
      const config: QualityConfig = {
        ...fixtureConfig,
        acceptedWarnings: [
          {
            reason: "Accepted by the core gate integration fixture.",
            ruleId: "lizard-cyclomatic-complexity"
          },
          {
            reason: "Accepted by the core gate integration fixture.",
            ruleId: "lizard-function-code-density"
          },
          {
            reason: "Accepted by the core gate integration fixture.",
            ruleId: "scc-file-code-lines"
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
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("returns gate-failed only after the written failed-gate metrics validate", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-failed-"));

    try {
      const config = await loadQualityConfig(
        resolve(fixtureRoot, "vibe-check.config.json")
      );
      const result = await runFixtureScan({
        artifactName: "failed-gate",
        config,
        gatePolicy: "all",
        tempRoot
      });

      expect(result.metrics.scanCompleteness.overall).toBe("complete");
      expect(result.metrics.warnings.all.length > 0).toBe(true);
      expect(result.metrics.gate.status).toBe("failed");
      expect(validateMetrics(result.metrics)).toEqual({ errors: [], valid: true });
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
      const fixtureConfig = await loadQualityConfig(
        resolve(fixtureRoot, "vibe-check.config.json")
      );
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
        config: {
          ...fixtureConfig,
          tools: {
            ...fixtureConfig.tools,
            scc: {
              args: [],
              command: resolve(tempRoot, "missing-scc")
            }
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
      const config = await loadQualityConfig(
        resolve(fixtureRoot, "vibe-check.config.json")
      );
      const result = await runFixtureScan({
        artifactName: "output-failure",
        config,
        gatePolicy: "all",
        prepareArtifactDir: (artifactDir) => {
          mkdirSync(resolve(artifactDir, "report.md"), { recursive: true });
        },
        tempRoot
      });

      expect(result.metrics.gate.status).toBe("failed");
      expect(validateMetrics(result.metrics)).toEqual({ errors: [], valid: true });
      expect(result.outcome).toBe("failed");
      expect(result.stdout.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.includes("Fatal quality scan issues:")).toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("does not publish a computed failed gate when output validation fails", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-validation-failure-"));

    try {
      const fixtureConfig = await loadQualityConfig(
        resolve(fixtureRoot, "vibe-check.config.json")
      );
      const result = await runFixtureScan({
        artifactName: "validation-failure",
        config: {
          ...fixtureConfig,
          version: ""
        },
        gatePolicy: "all",
        tempRoot
      });

      expect(result.metrics.gate.status).toBe("failed");
      expect(validateMetrics(result.metrics).valid).toBe(false);
      expect(result.outcome).toBe("failed");
      expect(result.stdout.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.filter((line) => line.includes("Quality gate"))).toEqual([]);
      expect(result.stderr.includes("Fatal quality scan issues:")).toBe(true);
      expect(result.stderr.some((line) => line.includes("metrics validation:"))).toBe(true);
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
  });

  test("keeps gate projection independent from verification warning preview", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "vibe-check-gate-verification-output-"));

    try {
      const fixtureConfig = await loadQualityConfig(
        resolve(fixtureRoot, "vibe-check.config.json")
      );
      const config: QualityConfig = {
        ...fixtureConfig,
        acceptedWarnings: [
          {
            reason: "Accepted by the gate verification-output fixture.",
            ruleId: "lizard-cyclomatic-complexity"
          },
          {
            reason: "Accepted by the gate verification-output fixture.",
            ruleId: "lizard-function-code-density"
          },
          {
            reason: "Accepted by the gate verification-output fixture.",
            ruleId: "scc-file-code-lines"
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

async function runFixtureScan({
  artifactName,
  config,
  gatePolicy,
  prepareArtifactDir,
  tempRoot,
  verificationOutput = false
}: {
  artifactName: string;
  config: QualityConfig;
  gatePolicy: GatePolicy | null;
  prepareArtifactDir?: (artifactDir: string) => void;
  tempRoot: string;
  verificationOutput?: boolean;
}): Promise<{
  artifactDir: string;
  metrics: QualityMetrics;
  outcome: Awaited<ReturnType<typeof runQualityScan>>;
  stderr: string[];
  stdout: string[];
}> {
  const artifactDir = resolve(tempRoot, artifactName);
  prepareArtifactDir?.(artifactDir);
  const output = await captureConsole(() =>
    runQualityScan({
      config: {
        ...config,
        cacheDir: resolve(tempRoot, `${artifactName}-cache`)
      },
      options: {
        artifactDir,
        baseline: null,
        changedFiles: null,
        gatePolicy,
        scanProfile: "quick",
        skipBaseline: true,
        topN: config.report.topN,
        verificationOutput
      },
      root: fixtureRoot
    })
  );
  const metrics = JSON.parse(
    readFileSync(resolve(artifactDir, "metrics.json"), "utf8")
  ) as QualityMetrics;

  return {
    artifactDir,
    metrics,
    outcome: output.result,
    stderr: output.stderr,
    stdout: output.stdout
  };
}

async function captureConsole<T>(run: () => Promise<T>): Promise<{
  result: T;
  stderr: string[];
  stdout: string[];
}> {
  const stderr: string[] = [];
  const stdout: string[] = [];
  const originalError = console.error;
  const originalLog = console.log;
  console.error = (...values: unknown[]) => {
    stderr.push(values.map(String).join(" "));
  };
  console.log = (...values: unknown[]) => {
    stdout.push(values.map(String).join(" "));
  };

  try {
    const result = await run();
    return { result, stderr, stdout };
  } finally {
    console.error = originalError;
    console.log = originalLog;
  }
}

function gateOutput(lines: string[]): string[] {
  return lines.filter(
    (line) =>
      line.includes("Quality gate") ||
      line.startsWith("  Policy:") ||
      line.startsWith("  Status:") ||
      line.startsWith("  Evaluated channel:") ||
      line.startsWith("  Evaluated warnings:") ||
      line.startsWith("  Blocking warnings:")
  );
}

function readNdjson(path: string): unknown[] {
  return readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}
