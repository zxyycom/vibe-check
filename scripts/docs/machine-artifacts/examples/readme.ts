import { MACHINE_EXAMPLE_REGENERATE_COMMAND, type CanonicalMachineExample } from "./contract.ts";

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

## Package Run result

The artifact set projects the same frozen Core Check/Record facts returned by Package Run. Output
status and any invocation-specific aggregate are structured Run Result facts, not recoverable from
these artifacts. A command adapter may map its result to process behavior, but process exit codes
are not part of this publication example.

## Canonical publication

- \`run.json\` contains v4 terminal Check outcomes (with final data only for passed/failed Checks),
  invocation metadata, and the complete Record-set fingerprint. It contains no catalog, aggregate,
  decision, reference, acceptance, view, blocking, or presentation evidence.
- \`records.ndjson\` contains ${example.publication.records.length} canonical supplemental Record(s)${
    example.publication.records.length === 0
      ? " and is exactly zero bytes"
      : " in composite { checkId, id } order"
  }. Each row is \`{ checkId, id, data }\` plus its v4 schema identity.

Both files are produced from the current Check / Record publication model and accepted together by
the formal machine-v4 validator. They are one publication set; neither file is trusted alone.
`;
}
