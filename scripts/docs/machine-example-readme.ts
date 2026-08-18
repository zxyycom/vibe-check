import {
  MACHINE_EXAMPLE_REGENERATE_COMMAND,
  type CanonicalMachineExample
} from "./machine-example-model.ts";

export function renderMachineExampleReadme(example: CanonicalMachineExample): string {
  const run = example.publication.run;
  return `# ${example.title}

This directory is a deterministic current-product machine publication example. Regenerate it
with \`${MACHINE_EXAMPLE_REGENERATE_COMMAND}\`.

## Fixed scenario

- Input: ${example.fixedInputSummary}
- Invocation: \`${run.invocation.invocationId}\`
- Project root: \`${run.invocation.projectRoot}\`
- Timestamp: \`${run.invocation.timestamp}\`
- Selected policy: \`${example.selectedPolicy ?? "none (neutral observation)"}\`

## Package Run result

- Result variant: \`completed\`
- Gate status: \`${run.decision.gate.status}\`

The artifact set is a projection of the same validated model returned by Package Run. Effect status
and other result-variant fields are not inferred from these two files; API consumers use the
structured Run Result. A project-owned command adapter may map that result to process behavior, but
process exit codes are not part of this publication example.

## Canonical publication

- \`run.json\` contains v3 Check outcomes, the declarative catalog fingerprint, the canonical
  Record-set fingerprint, reference facts, acceptance and decision evidence. It contains no
  execution run, integrity, completeness or effect view.
- \`records.ndjson\` contains ${example.publication.records.length} canonical record(s)${
    example.publication.records.length === 0 ? " and is exactly zero bytes" : " in recordId order"
  }.

Both files are produced from the current Check / Record publication model and accepted together
by the formal machine-v3 validator. They are one publication set; neither file is trusted alone.
`;
}
