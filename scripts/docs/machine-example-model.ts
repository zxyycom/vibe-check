import type {
  MachinePublicationV4,
  TrustedPublicationModelV4
} from "../../src/product/quality-core/output/publication-v4/index.ts";

export const MACHINE_EXAMPLES_ROOT = "docs/examples/artifacts";
export const MACHINE_EXAMPLE_REGENERATE_COMMAND = "bun scripts/docs/machine-examples.ts";
export const MACHINE_EXAMPLE_ARTIFACT_FILES = ["README.md", "records.ndjson", "run.json"] as const;

export const FIXED_MACHINE_EXAMPLE_INPUT = {
  projectRoot: "." as const,
  timestamp: "2026-08-12T00:00:00.000Z"
} as const;

interface MachineExampleScenarioFields {
  readonly fixedInputSummary: string;
  readonly outcome: string;
  readonly state: "failed" | "not-applicable" | "passed" | "unavailable";
  readonly title: string;
}

/** Complete, bounded current-v4 example inventory. */
export const MACHINE_EXAMPLE_SCENARIOS = [
  {
    outcome: "complete-passed",
    title: "Complete passed Check without Records",
    state: "passed",
    fixedInputSummary: "One applicable Check completed without supplemental Records."
  },
  {
    outcome: "complete-failed-with-record",
    title: "Complete failed Check with a supplemental Record",
    state: "failed",
    fixedInputSummary: "One Check returned failed final data and submitted one supplemental Record."
  },
  {
    outcome: "legitimate-empty",
    title: "Legitimate Check with no eligible input",
    state: "not-applicable",
    fixedInputSummary: "The Check was not applicable and did not synthesize final data."
  },
  {
    outcome: "unavailable",
    title: "Unavailable Check",
    state: "unavailable",
    fixedInputSummary: "The Check could not run and published only its controlled reason."
  }
] as const satisfies readonly MachineExampleScenarioFields[];

export type MachineExampleScenario = (typeof MACHINE_EXAMPLE_SCENARIOS)[number];
export type MachineExampleOutcome = MachineExampleScenario["outcome"];
export type MachineExampleState = MachineExampleScenario["state"];
export const MACHINE_EXAMPLE_OUTCOMES: readonly MachineExampleOutcome[] = Object.freeze(
  MACHINE_EXAMPLE_SCENARIOS.map(({ outcome }) => outcome)
);

export type CanonicalMachineExample = Readonly<
  MachineExampleScenario & {
    readonly model: TrustedPublicationModelV4;
    readonly publication: MachinePublicationV4;
  }
>;

export interface GeneratedMachineExampleFile {
  readonly contents: string;
  readonly relativePath: string;
}
