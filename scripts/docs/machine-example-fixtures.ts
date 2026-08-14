import { buildCanonicalMachineExample } from "./machine-example-fixture-builders.ts";
import type { CanonicalMachineExample } from "./machine-example-model.ts";

export function canonicalMachineExamples(): CanonicalMachineExample[] {
  return [
    buildCanonicalMachineExample({
      outcome: "complete-passed",
      title: "Complete scan without findings",
      state: "passed",
      fixedInputSummary: "One applicable Check completed its work without records.",
      selectedPolicy: null
    }),
    buildCanonicalMachineExample({
      outcome: "complete-warning",
      title: "Complete scan with a non-gating finding",
      state: "warning",
      fixedInputSummary: "One applicable Check completed with one warning record.",
      selectedPolicy: null
    }),
    buildCanonicalMachineExample({
      outcome: "gate-failed",
      title: "Complete scan blocked by the selected policy",
      state: "gate-failed",
      fixedInputSummary: "One warning record entered the all-current view and matched blockWhen.",
      selectedPolicy: "docs-gate"
    }),
    buildCanonicalMachineExample({
      outcome: "legitimate-empty",
      title: "Legitimate scan with no eligible input",
      state: "empty",
      fixedInputSummary: "The selected Check was not applicable, with zero planned work and records.",
      selectedPolicy: null
    }),
    buildCanonicalMachineExample({
      outcome: "scan-incomplete",
      title: "Incomplete scan with retained run evidence",
      state: "incomplete",
      fixedInputSummary: "The selected Check could not run because its dependency was unavailable.",
      selectedPolicy: "docs-gate"
    })
  ];
}
