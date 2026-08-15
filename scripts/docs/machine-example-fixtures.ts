import { buildCanonicalMachineExample } from "./machine-example-fixture-builders.ts";
import {
  MACHINE_EXAMPLE_SCENARIOS,
  type CanonicalMachineExample
} from "./machine-example-model.ts";

export function canonicalMachineExamples(): readonly CanonicalMachineExample[] {
  return Object.freeze(MACHINE_EXAMPLE_SCENARIOS.map(buildCanonicalMachineExample));
}
