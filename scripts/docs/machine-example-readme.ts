import {
  MACHINE_EXAMPLE_REGENERATE_COMMAND,
  type CanonicalMachineExample
} from "./machine-example-model.ts";

export function renderMachineExampleReadme(
  example: CanonicalMachineExample
): string {
  const run = example.publication.run;
  return `# ${example.title}

This directory is a deterministic current-product machine publication example. Regenerate it
with \`${MACHINE_EXAMPLE_REGENERATE_COMMAND}\`.

## Fixed scenario

- Input: ${example.fixedInputSummary}
- Invocation: \`${run.invocation.invocationId}\`
- Project root: \`${run.invocation.projectRoot}\`
- Timestamp: \`${run.invocation.timestamp}\`
- Selected policy: \`${run.decision.policyId ?? "disabled"}\`

## Expected user result

- Gate request: ${example.gateRequest ?? "none (policy disabled)"}
- Process outcome: \`${example.expectedProcessOutcome}\`
- Exit code: \`${example.expectedExit}\`

The expected process outcome and exit code are scenario metadata, not facts inferable from the
two-file machine set. Consumers must interpret the set together with the producing CLI outcome.

## Canonical publication

- \`run.json\` contains the Check catalog, runs, integrity/completeness, reference facts and decision evidence.
- \`records.ndjson\` contains ${example.publication.records.length} canonical record(s)${
    example.publication.records.length === 0 ? " and is exactly zero bytes" : " in recordId order"
  }.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v2 validator. They are one publication set; neither file is trusted alone.
`;
}
