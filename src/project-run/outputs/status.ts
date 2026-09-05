import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
import { DIAGNOSTIC_CHANNELS, type DiagnosticChannel } from "../diagnostic-logging/logger.ts";

export interface RunOutputStatus {
  readonly enabled: boolean;
  readonly status: "disabled" | "failed" | "not-run" | "succeeded";
}

/** One Product-owned human diagnostic channel; files are readback even when setup fails. */
export interface RunDiagnosticLoggingChannelStatus extends RunOutputStatus {
  readonly file: string | null;
}

export interface RunDiagnosticLoggingOutputStatus extends RunOutputStatus {
  /** Aggregate state plus the exact owner channel responsible for any partial failure. */
  readonly channels: Readonly<Record<DiagnosticChannel, RunDiagnosticLoggingChannelStatus>>;
}

export interface RunOutputStatuses {
  readonly machinePublication: RunOutputStatus;
  readonly progressRendering: RunOutputStatus;
  readonly diagnosticLogging: RunDiagnosticLoggingOutputStatus;
  /** Scheduler measurement hooks are terminal side effects configured by the Definition. */
  readonly measurementHooks: RunOutputStatus;
}

export interface OutputStatuses {
  /** Enables a runtime-only terminal participant after successful preparation. */
  readonly enableMeasurementHooks: () => void;
  /** A diagnostic channel failure is isolated but updates the aggregate diagnostic output. */
  readonly failedDiagnosticChannel: (channel: DiagnosticChannel) => void;
  readonly failed: (output: keyof RunOutputStatuses) => void;
  readonly succeededDiagnosticChannel: (channel: DiagnosticChannel) => void;
  readonly succeeded: (output: keyof RunOutputStatuses) => void;
  readonly value: () => RunOutputStatuses;
}

export function createOutputStatuses(
  configuration: ProjectOutputs,
  diagnosticLoggingFiles: Readonly<Record<DiagnosticChannel, string | null>>,
  learnedAdmissionEnabled: boolean,
  initialMeasurementHooksEnabled: boolean
): OutputStatuses {
  let measurementHooksEnabled = initialMeasurementHooksEnabled;
  const diagnosticChannelEnabled: Readonly<Record<DiagnosticChannel, boolean>> = Object.freeze({
    core: configuration.diagnosticLogging.enabled,
    learnedAdmission: configuration.diagnosticLogging.enabled && learnedAdmissionEnabled,
    scheduler: configuration.diagnosticLogging.enabled
  });
  const statuses: Record<keyof RunOutputStatuses, RunOutputStatus["status"]> = {
    machinePublication: initialStatus(configuration.machinePublication.enabled),
    progressRendering: initialStatus(configuration.progressRendering.enabled),
    diagnosticLogging: initialStatus(configuration.diagnosticLogging.enabled),
    measurementHooks: initialStatus(measurementHooksEnabled)
  };
  const diagnosticChannelStatuses: Record<DiagnosticChannel, RunOutputStatus["status"]> = {
    core: initialStatus(diagnosticChannelEnabled.core),
    learnedAdmission: initialStatus(diagnosticChannelEnabled.learnedAdmission),
    scheduler: initialStatus(diagnosticChannelEnabled.scheduler)
  };
  const enabled = (output: keyof RunOutputStatuses): boolean =>
    output === "measurementHooks" ? measurementHooksEnabled : configuration[output].enabled;
  const refreshDiagnosticAggregate = (): void => {
    const enabledStatuses = DIAGNOSTIC_CHANNELS.filter(
      (channel) => diagnosticChannelEnabled[channel]
    ).map((channel) => diagnosticChannelStatuses[channel]);
    if (enabledStatuses.includes("failed")) {
      statuses.diagnosticLogging = "failed";
      return;
    }
    if (enabledStatuses.every((status) => status === "succeeded")) {
      statuses.diagnosticLogging = "succeeded";
      return;
    }
    statuses.diagnosticLogging = enabledStatuses.every((status) => status === "disabled")
      ? "disabled"
      : "not-run";
  };
  return Object.freeze({
    enableMeasurementHooks: () => {
      if (measurementHooksEnabled) return;
      measurementHooksEnabled = true;
      statuses.measurementHooks = "not-run";
    },
    failedDiagnosticChannel: (channel: DiagnosticChannel) => {
      if (!diagnosticChannelEnabled[channel]) return;
      diagnosticChannelStatuses[channel] = "failed";
      refreshDiagnosticAggregate();
    },
    failed: (output: keyof RunOutputStatuses) => {
      if (enabled(output)) statuses[output] = "failed";
    },
    succeededDiagnosticChannel: (channel: DiagnosticChannel) => {
      if (!diagnosticChannelEnabled[channel] || diagnosticChannelStatuses[channel] === "failed")
        return;
      diagnosticChannelStatuses[channel] = "succeeded";
      refreshDiagnosticAggregate();
    },
    succeeded: (output: keyof RunOutputStatuses) => {
      if (enabled(output) && statuses[output] !== "failed") statuses[output] = "succeeded";
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
        }),
        diagnosticLogging: Object.freeze({
          channels: Object.freeze({
            core: diagnosticChannelValue("core"),
            learnedAdmission: diagnosticChannelValue("learnedAdmission"),
            scheduler: diagnosticChannelValue("scheduler")
          }),
          enabled: configuration.diagnosticLogging.enabled,
          status: statuses.diagnosticLogging
        }),
        measurementHooks: Object.freeze({
          enabled: measurementHooksEnabled,
          status: statuses.measurementHooks
        })
      })
  });

  function diagnosticChannelValue(channel: DiagnosticChannel): RunDiagnosticLoggingChannelStatus {
    return Object.freeze({
      enabled: diagnosticChannelEnabled[channel],
      file: diagnosticLoggingFiles[channel],
      status: diagnosticChannelStatuses[channel]
    });
  }
}

export function failedOutput(statuses: RunOutputStatuses): keyof RunOutputStatuses | undefined {
  for (const output of [
    "progressRendering",
    "machinePublication",
    "diagnosticLogging",
    "measurementHooks"
  ] as const)
    if (statuses[output].status === "failed") return output;
  return undefined;
}

function initialStatus(enabled: boolean): RunOutputStatus["status"] {
  return enabled ? "not-run" : "disabled";
}
