import type { CoreSnapshot } from "../../../src/core/facts.ts";
import { createPublicationModelV4 } from "../../../src/output/machine-v4/publication-model.ts";
import { projectMachinePublicationV4 } from "../../../src/output/machine-v4/projection.ts";
import {
  FIXED_MACHINE_EXAMPLE_INPUT,
  type CanonicalMachineExample,
  type MachineExampleScenario,
  type MachineExampleState
} from "./example-contract.ts";

export function buildCanonicalMachineExample(
  input: MachineExampleScenario
): CanonicalMachineExample {
  const model = createPublicationModelV4({
    invocation: {
      invocationId: `invocation/v1:docs-${input.outcome}`,
      projectRoot: FIXED_MACHINE_EXAMPLE_INPUT.projectRoot,
      timestamp: FIXED_MACHINE_EXAMPLE_INPUT.timestamp
    },
    snapshot: createSnapshot(input.state)
  });
  return Object.freeze({ ...input, model, publication: projectMachinePublicationV4(model) });
}

function createSnapshot(state: MachineExampleState): CoreSnapshot {
  return {
    checks: [
      {
        checkId: "docs-example",
        displayName: "Documentation Example",
        outcome: outcomeFor(state)
      }
    ],
    records: recordsFor(state)
  };
}

function outcomeFor(state: MachineExampleState): CoreSnapshot["checks"][number]["outcome"] {
  switch (state) {
    case "passed":
      return { status: "passed", data: { summary: "no supplemental records" } };
    case "failed":
      return { status: "failed", data: { summary: "supplemental record retained" } };
    case "not-applicable":
      return { status: "not-applicable", reason: { code: "no-eligible-input" } };
    case "unavailable":
      return { status: "unavailable", reason: { code: "dependency-unavailable" } };
  }
}

function recordsFor(state: MachineExampleState): CoreSnapshot["records"] {
  if (state !== "failed") return [];
  return [
    {
      checkId: "docs-example",
      id: "sample:primary",
      data: { location: "src/example.ts", severity: "warning" }
    }
  ];
}
