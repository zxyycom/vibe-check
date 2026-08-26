import type { ProjectOutputs } from "../project-definition/project-definition.ts";
export interface RunOutputStatus {
  readonly enabled: boolean;
  readonly status: "disabled" | "failed" | "not-run" | "succeeded";
}
export interface RunOutputStatuses {
  readonly machinePublication: RunOutputStatus;
  readonly progressRendering: RunOutputStatus;
}
export interface OutputStatuses {
  readonly failed: (output: keyof RunOutputStatuses) => void;
  readonly succeeded: (output: keyof RunOutputStatuses) => void;
  readonly value: () => RunOutputStatuses;
}
export function createOutputStatuses(configuration: ProjectOutputs): OutputStatuses {
  const statuses: Record<keyof RunOutputStatuses, RunOutputStatus["status"]> = {
    machinePublication: initialStatus(configuration.machinePublication.enabled),
    progressRendering: initialStatus(configuration.progressRendering.enabled)
  };
  const enabled = (output: keyof RunOutputStatuses): boolean => configuration[output].enabled;
  return Object.freeze({
    failed: (output: keyof RunOutputStatuses) => {
      if (enabled(output)) statuses[output] = "failed";
    },
    succeeded: (output: keyof RunOutputStatuses) => {
      if (enabled(output)) statuses[output] = "succeeded";
    },
    value: () =>
      Object.freeze({
        machinePublication: Object.freeze({
          enabled: configuration.machinePublication.enabled,
          status: statuses.machinePublication
        }),
        progressRendering: Object.freeze({
          enabled: configuration.progressRendering.enabled,
          status: statuses.progressRendering
        })
      })
  });
}
export function failedOutput(statuses: RunOutputStatuses): keyof RunOutputStatuses | undefined {
  for (const output of ["progressRendering", "machinePublication"] as const)
    if (statuses[output].status === "failed") return output;
  return undefined;
}
function initialStatus(enabled: boolean): RunOutputStatus["status"] {
  return enabled ? "not-run" : "disabled";
}
