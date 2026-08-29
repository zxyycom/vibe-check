import type { TrustedPublicationModelV4 } from "../../../../src/machine-output/v4/publication-model.ts";
import type { MachinePublicationV4 } from "../../../../src/machine-output/v4/projection.ts";

export const MACHINE_EXAMPLES_ROOT = "docs/examples/artifacts";
export const MACHINE_EXAMPLE_NAME = "mixed-outcomes";
export const MACHINE_EXAMPLE_ROOT = `${MACHINE_EXAMPLES_ROOT}/${MACHINE_EXAMPLE_NAME}`;
export const MACHINE_EXAMPLE_DEFINITION_PATH = `${MACHINE_EXAMPLE_ROOT}/definition.ts`;
export const MACHINE_EXAMPLE_REGENERATE_COMMAND =
  "bun scripts/docs/machine-artifacts/examples/command.ts";
export const MACHINE_EXAMPLE_GENERATED_FILES = ["records.ndjson", "run.json"] as const;
export const MACHINE_EXAMPLE_FILES = ["definition.ts", ...MACHINE_EXAMPLE_GENERATED_FILES] as const;

export const FIXED_MACHINE_EXAMPLE_INVOCATION = {
  invocationId: "invocation/v1:docs-mixed-outcomes",
  projectRoot: "." as const,
  timestamp: "2026-08-12T00:00:00.000Z"
} as const;

export interface CanonicalMachineExample {
  readonly model: TrustedPublicationModelV4;
  readonly publication: MachinePublicationV4;
}

export interface GeneratedMachineExampleFile {
  readonly contents: string;
  readonly relativePath: string;
}
