import { buildCanonicalMachineExample } from "./machine-example-fixture-builders.ts";
import type { CanonicalMachineExample } from "./machine-example-model.ts";

export function canonicalMachineExamples(): CanonicalMachineExample[] {
  return [
    buildCanonicalMachineExample({
      outcome: "complete-passed",
      title: "Complete scan without findings",
      state: "passed",
      fixedInputSummary: "One applicable Check completed its work without records.",
      gateRequest: "none (policy disabled)",
      expectedProcessOutcome: "success",
      expectedExit: 0
    }),
    buildCanonicalMachineExample({
      outcome: "complete-warning",
      title: "Complete scan with a non-gating finding",
      state: "warning",
      fixedInputSummary: "One applicable Check completed with one warning record.",
      gateRequest: "none (policy disabled for this scenario projection)",
      expectedProcessOutcome: "success",
      expectedExit: 0
    }),
    buildCanonicalMachineExample({
      outcome: "gate-failed",
      title: "Complete scan blocked by the selected policy",
      state: "gate-failed",
      fixedInputSummary: "One warning record entered the all-current view and matched blockWhen.",
      gateRequest: "all-current",
      expectedProcessOutcome: "gate-failed",
      expectedExit: 1
    }),
    buildCanonicalMachineExample({
      outcome: "legitimate-empty",
      title: "Legitimate scan with no eligible input",
      state: "empty",
      fixedInputSummary: "The selected Check was not applicable, with zero planned work and records.",
      gateRequest: "none (policy disabled)",
      expectedProcessOutcome: "success",
      expectedExit: 0
    }),
    buildCanonicalMachineExample({
      outcome: "scan-incomplete",
      title: "Incomplete scan with retained run evidence",
      state: "incomplete",
      fixedInputSummary: "The selected Check could not run because its dependency was unavailable.",
      gateRequest: "all-current (not evaluated: scan-incomplete)",
      expectedProcessOutcome: "failed",
      expectedExit: 2
    })
  ];
}
