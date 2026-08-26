import { buildCanonicalMachineExample } from "./builders.ts";
import { MACHINE_EXAMPLE_SCENARIOS, type CanonicalMachineExample } from "./contract.ts";

export function canonicalMachineExamples(): readonly CanonicalMachineExample[] {
  return Object.freeze(MACHINE_EXAMPLE_SCENARIOS.map(buildCanonicalMachineExample));
}
