import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
import { DIAGNOSTIC_CHANNELS, type DiagnosticChannel } from "../diagnostic-logging/logger.ts";

/** 一项 Run-owned terminal output 或 measurement participant 的最终状态 readback。 */
export interface RunOutputStatus {
  /** effective configuration 是否启用该 participant；`false` 时 status 必为 `disabled`。 */
  readonly enabled: boolean;
  /** `disabled` 为未启用；`not-run` 为启用但未到达完成；`succeeded` 为完成，`failed` 为其 own I/O 或 hook failure。 */
  readonly status: "disabled" | "failed" | "not-run" | "succeeded";
}

/** Product-owned 人读 diagnostic channel；即使 setup 失败也保留其 file readback。 */
export interface RunDiagnosticLoggingChannelStatus extends RunOutputStatus {
  /**
   * 相对 effective project root 的 target readback；跨卷时可为 absolute path。disabled channel 为 `null`，
   * enabled channel 即使 setup 失败也保留预先计算的 path。
   */
  readonly file: string | null;
}

/** diagnostic logging aggregate 及其各 owner channel 的最终状态 readback。 */
export interface RunDiagnosticLoggingOutputStatus extends RunOutputStatus {
  /** aggregate status 及每个 owner channel 的独立 readback；partial failure 可由此定位。 */
  readonly channels: Readonly<Record<DiagnosticChannel, RunDiagnosticLoggingChannelStatus>>;
}

/** 配置有效后四个 terminal output participant 的独立最终状态。 */
export interface RunOutputStatuses {
  /** `run.json` 与 `records.ndjson` canonical publication 的状态。 */
  readonly machinePublication: RunOutputStatus;
  /** terminal progress 与可选 progress log tee 的状态。 */
  readonly progressRendering: RunOutputStatus;
  /** core 与 scheduler diagnostic channels 的 aggregate 状态。 */
  readonly diagnosticLogging: RunDiagnosticLoggingOutputStatus;
  /**
   * Definition generic Hooks 与 prepared custom strategy 的 optional `complete` 所形成的 terminal participant
   * 状态；它不能由 RunControls 注入或覆盖。
   */
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
  initialMeasurementHooksEnabled: boolean
): OutputStatuses {
  let measurementHooksEnabled = initialMeasurementHooksEnabled;
  const diagnosticChannelEnabled: Readonly<Record<DiagnosticChannel, boolean>> = Object.freeze({
    core: configuration.diagnosticLogging.enabled,
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
