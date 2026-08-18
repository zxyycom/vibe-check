import type {
  MachinePublicationV3,
  ValidatedPublicationModelV3
} from "../../src/product/quality-core/output/publication-v3/index.ts";

export const MACHINE_EXAMPLES_ROOT = "docs/examples/artifacts";
export const MACHINE_EXAMPLE_REGENERATE_COMMAND = "bun run generate:machine-examples";
export const MACHINE_EXAMPLE_ARTIFACT_FILES = ["README.md", "records.ndjson", "run.json"] as const;

export const FIXED_MACHINE_EXAMPLE_INPUT = {
  path: "src/example.ts",
  projectRoot: "." as const,
  timestamp: "2026-08-12T00:00:00.000Z"
} as const;

interface MachineExampleScenarioFields {
  readonly fixedInputSummary: string;
  readonly outcome: string;
  readonly selectedPolicy: string | null;
  readonly state: string;
  readonly title: string;
}

/**
 * The complete legal scenario surface for generated current machine examples.
 * Outcome, Core state, and selected policy stay correlated in this one table.
 */
export const MACHINE_EXAMPLE_SCENARIOS = [
  {
    outcome: "complete-passed",
    title: "Complete scan without findings",
    state: "passed",
    fixedInputSummary: "One applicable Check completed its work without records.",
    selectedPolicy: null
  },
  {
    outcome: "complete-warning",
    title: "Complete scan with a non-gating finding",
    state: "warning",
    fixedInputSummary: "One applicable Check completed with one warning record.",
    selectedPolicy: null
  },
  {
    outcome: "gate-failed",
    title: "Complete scan blocked by the selected policy",
    state: "gate-failed",
    fixedInputSummary: "One warning record entered the all-current view and matched blockWhen.",
    selectedPolicy: "docs-gate"
  },
  {
    outcome: "legitimate-empty",
    title: "Legitimate scan with no eligible input",
    state: "empty",
    fixedInputSummary: "The Check was not applicable, with no records.",
    selectedPolicy: null
  },
  {
    outcome: "scan-incomplete",
    title: "Unavailable Check with retained Check evidence",
    state: "incomplete",
    fixedInputSummary: "The Check could not run because its dependency was unavailable.",
    selectedPolicy: "docs-gate"
  }
] as const satisfies readonly MachineExampleScenarioFields[];

export type MachineExampleScenario = (typeof MACHINE_EXAMPLE_SCENARIOS)[number];

export const MACHINE_EXAMPLE_OUTCOMES: readonly MachineExampleScenario["outcome"][] = Object.freeze(
  MACHINE_EXAMPLE_SCENARIOS.map(({ outcome }) => outcome)
);

export type MachineExampleOutcome = MachineExampleScenario["outcome"];
export type MachineExampleSelectedPolicy = MachineExampleScenario["selectedPolicy"];
export type MachineExampleState = MachineExampleScenario["state"];

export type CanonicalMachineExample = Readonly<
  MachineExampleScenario & {
    readonly model: ValidatedPublicationModelV3;
    readonly publication: MachinePublicationV3;
  }
>;

export interface GeneratedMachineExampleFile {
  readonly contents: string;
  readonly relativePath: string;
}
