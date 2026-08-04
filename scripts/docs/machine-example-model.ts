import { projectMachineMetricsV1 } from "../../src/product/machine-output.ts";

export const MACHINE_EXAMPLES_ROOT = "docs/examples/artifacts";
export const MACHINE_EXAMPLE_REGENERATE_COMMAND =
  "bun run generate:machine-examples";
export const MACHINE_EXAMPLE_OUTCOMES = [
  "complete-passed",
  "complete-warning",
  "legitimate-empty",
  "gate-failed",
  "scan-incomplete"
] as const;
export const MACHINE_EXAMPLE_ARTIFACT_FILES = [
  "README.md",
  "metrics.json",
  "warnings-all.ndjson",
  "warnings.ndjson"
] as const;

export const FIXED_MACHINE_EXAMPLE_INPUT = {
  baselineCommitDate: "2026-07-31T12:00:00.000Z",
  baselineCommitSha: "89abcdef0123456789abcdef0123456789abcdef",
  commitDate: "2026-08-02T12:00:00.000Z",
  commitSha: "0123456789abcdef0123456789abcdef01234567",
  configVersion: "canonical-config-v1",
  paths: ["src/example.ts", "src/generated.ts"] as const,
  repository: "/workspace/vibe-check-fixtures/canonical-project",
  timestamp: "2026-08-03T00:00:00.000Z",
  tools: [
    { name: "scc", source: "configured", version: "3.6.0" },
    { name: "lizard", source: "configured", version: "1.17.31" },
    { name: "jscpd", source: "configured", version: "5.0.11" }
  ]
} as const;

export type CoreMetricsFixture = Parameters<typeof projectMachineMetricsV1>[0];
export type CoreWarningFixture = CoreMetricsFixture["warnings"]["all"][number];
export type MachineExampleOutcome = typeof MACHINE_EXAMPLE_OUTCOMES[number];

export interface CanonicalMachineExample {
  readonly contractReason: string;
  readonly expectedExit: 0 | 1 | 2;
  readonly expectedProcessOutcome: "failed" | "gate-failed" | "success";
  readonly fixedInput: {
    readonly paths: readonly string[];
    readonly summary: string;
  };
  readonly gateRequest: string;
  readonly metrics: CoreMetricsFixture;
  readonly outcome: MachineExampleOutcome;
  readonly title: string;
}

export interface GeneratedMachineExampleFile {
  readonly contents: string;
  readonly relativePath: string;
}
