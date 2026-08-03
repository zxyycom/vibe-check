import type { MachineWarningV1 } from "../../../src/product/machine-output.ts";

export function renderGithubAnnotations(warnings: readonly MachineWarningV1[]): string[] {
  return warnings.map((warning) => {
    const attrs = [
      ["file", warning.path],
      ["line", warning.line],
      ["title", warning.ruleId]
    ]
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => `${key}=${escapeProperty(String(value))}`)
      .join(",");

    return `::warning ${attrs}::${escapeData(annotationMessage(warning))}`;
  });
}

function annotationMessage(warning: MachineWarningV1): string {
  return [
    warning.message,
    warning.comparisonBasis ? `basis=${warning.comparisonBasis}` : null,
    warning.baselineValue !== null
      ? `baseline=${warning.baselineValue}`
      : null,
    warning.deltaValue !== null
      ? `delta=${warning.deltaValue}`
      : null,
    warning.suggestion || null
  ]
    .filter(Boolean)
    .join(" | ");
}

function escapeData(value: string): string {
  return value
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value)
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}
