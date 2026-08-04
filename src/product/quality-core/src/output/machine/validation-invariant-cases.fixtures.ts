import {
  serializeMachineWarningStreamV1,
  type MachineArtifactBytesV1,
  type MachineMetricsV1,
  type MachineValidationDiagnostic,
  type MachineWarningV1
} from "../../../../machine-output.ts";
import {
  bytes,
  machineWarning,
  refreshArtifacts
} from "./validation.fixtures.ts";

export interface ArtifactSetFailureCase {
  readonly index?: number;
  readonly logicalArtifact: string;
  readonly mutate: (
    metrics: MachineMetricsV1,
    artifacts: MachineArtifactBytesV1
  ) => void;
  readonly pointer?: string;
  readonly relationship: NonNullable<
    MachineValidationDiagnostic["relationship"]
  >;
}

interface ArtifactSetFailureCasesOptions {
  readonly blocking: MachineWarningV1;
  readonly emptyReasonBlocking: MachineWarningV1;
  readonly whitespaceAccepted: MachineWarningV1;
}

export function artifactSetFailureCases(
  options: ArtifactSetFailureCasesOptions
): ArtifactSetFailureCase[] {
  const { blocking, emptyReasonBlocking, whitespaceAccepted } = options;
  return [
      {
        index: 0,
        logicalArtifact: "warnings.ndjson",
        mutate: (_metrics, artifacts) => {
          artifacts.warningsNdjson = bytes(serializeMachineWarningStreamV1([
            machineWarning({ ruleId: "stream-drift" })
          ]));
        },
        relationship: "warnings-stream-equals-changed"
      },
      {
        index: 0,
        logicalArtifact: "warnings-all.ndjson",
        mutate: (_metrics, artifacts) => {
          artifacts.warningsAllNdjson = bytes(serializeMachineWarningStreamV1([
            machineWarning({ ruleId: "all-stream-drift" })
          ]));
        },
        relationship: "warnings-all-stream-equals-all"
      },
      {
        index: 1,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.warnings.all = [
            whitespaceAccepted,
            blocking,
            emptyReasonBlocking
          ];
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/warnings/changed/1",
        relationship: "changed-subsequence-of-all"
      },
      {
        index: 0,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.warnings.regressions = [
            machineWarning({ ruleId: "not-changed" })
          ];
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/warnings/regressions/0",
        relationship: "regressions-subsequence-of-changed"
      },
      {
        index: 2,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.scanCompleteness.capabilities[2] = structuredClone(
            metrics.scanCompleteness.capabilities[1]!
          );
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/scanCompleteness/capabilities/2/capabilityId",
        relationship: "capability-membership"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.scanCompleteness.overall = "empty";
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/scanCompleteness/overall",
        relationship: "completeness-reduction"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.evaluatedChannel = "all";
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/evaluatedChannel",
        relationship: "gate-policy-channel"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.evaluatedWarningCount += 1;
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/evaluatedWarningCount",
        relationship: "gate-evaluated-count"
      },
      ...([
        [[blocking], 1],
        [[blocking, whitespaceAccepted, emptyReasonBlocking], 1],
        [[emptyReasonBlocking, blocking], 0]
      ] as const).map(([blockingWarnings, index]): ArtifactSetFailureCase => ({
        index,
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.blockingWarnings = [...blockingWarnings];
            metrics.gate.blockingWarningCount = blockingWarnings.length;
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/blockingWarnings",
        relationship: "gate-blocking-warnings"
      })),
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          if (metrics.gate.status === "failed") {
            metrics.gate.blockingWarningCount += 1;
          }
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/blockingWarningCount",
        relationship: "gate-blocking-count"
      },
      {
        logicalArtifact: "metrics.json",
        mutate: (metrics, artifacts) => {
          metrics.gate.status = "passed";
          refreshArtifacts(metrics, artifacts);
        },
        pointer: "/gate/status",
        relationship: "gate-status"
      }
    ];
}
