import type {
  MachinePublicationV2,
  ValidatedPublicationModelV2
} from "../../src/product/quality-core/src/output/publication-v2/index.ts";

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
  "records.ndjson",
  "run.json"
] as const;

export const FIXED_MACHINE_EXAMPLE_INPUT = {
  path: "src/example.ts",
  projectRoot: "." as const,
  timestamp: "2026-08-12T00:00:00.000Z"
} as const;

export type MachineExampleOutcome = typeof MACHINE_EXAMPLE_OUTCOMES[number];
export type MachineExampleGateRequest = "all" | null;

export interface CanonicalMachineExample {
  readonly expectedExit: 0 | 1 | 2;
  readonly expectedProcessOutcome: "failed" | "gate-failed" | "success";
  readonly fixedInputSummary: string;
  readonly gateRequest: MachineExampleGateRequest;
  readonly model: ValidatedPublicationModelV2;
  readonly outcome: MachineExampleOutcome;
  readonly publication: MachinePublicationV2;
  readonly title: string;
}

export interface GeneratedMachineExampleFile {
  readonly contents: string;
  readonly relativePath: string;
}
