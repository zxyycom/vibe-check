import type { MachineMetricsV1, MachineWarningV1 } from "./schema.ts";

export function serializeMachineMetricsV1(metrics: MachineMetricsV1): string {
  return JSON.stringify(metrics, null, 2);
}

export function serializeMachineWarningStreamV1(
  warnings: readonly MachineWarningV1[]
): string {
  if (warnings.length === 0) return "";
  return `${warnings.map((warning) => JSON.stringify(warning)).join("\n")}\n`;
}

export function serializeMachineArtifactCandidatesV1(
  metrics: MachineMetricsV1
): {
  metricsJson: string;
  warningsAllNdjson: string;
  warningsNdjson: string;
} {
  return {
    metricsJson: serializeMachineMetricsV1(metrics),
    warningsAllNdjson: serializeMachineWarningStreamV1(metrics.warnings.all),
    warningsNdjson: serializeMachineWarningStreamV1(metrics.warnings.changed)
  };
}
