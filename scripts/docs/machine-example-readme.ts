import {
  MACHINE_EXAMPLE_REGENERATE_COMMAND,
  type CanonicalMachineExample
} from "./machine-example-model.ts";

export function renderMachineExampleReadme(
  example: CanonicalMachineExample
): string {
  const metadata = example.metrics.metadata;
  const toolSummary = metadata.tools
    .map((tool) => `${tool.name} ${tool.version} (${tool.source})`)
    .join("; ");
  const currentCommitDate = metadata.commitDate === undefined
    ? ""
    : ` at \`${metadata.commitDate}\``;
  const baseline = example.metrics.baseline;
  const baselineLine = baseline.commitSha === null
    ? `- Baseline input: none (\`${baseline.status}\`)`
    : `- Baseline commit: \`${baseline.commitSha}\`${
      baseline.commitDate === null ? "" : ` at \`${baseline.commitDate}\``
    }`;
  return `# ${example.title}

This directory is a deterministic current-product artifact example. Regenerate it with
\`${MACHINE_EXAMPLE_REGENERATE_COMMAND}\`.

## Fixed input

- Scenario: ${example.fixedInput.summary}
- Project-relative input paths: ${renderCodeValues(example.fixedInput.paths)}
- Repository root: \`${metadata.repository}\`
- Timestamp: \`${metadata.timestamp}\`
- Current commit: \`${metadata.commitSha}\`${currentCommitDate}
${baselineLine}
- Config version: \`${metadata.configVersion}\`
- Tool metadata: ${toolSummary}
- Configured include globs: ${renderCodeValues(metadata.scope.include)}
- Configured exclude directories: ${renderCodeValues(metadata.scope.excludeDirs)}
- Configured generated-file paths: ${renderCodeValues(metadata.scope.generatedFiles)}

## Requested gate and process result

- Gate request: ${example.gateRequest}
- Expected process outcome: \`${example.expectedProcessOutcome}\`
- Expected exit code: \`${example.expectedExit}\`

## Why this set is contract-valid

${example.contractReason}

The three artifact files are produced from fixed core values through the production mapper and
serializers, then accepted by the production artifact-set validator. The process outcome and exit
code above are scenario metadata; they cannot be inferred from the files alone.
`;
}

function renderCodeValues(values: readonly string[]): string {
  return values.length === 0
    ? "none"
    : values.map((value) => `\`${value}\``).join(", ");
}
