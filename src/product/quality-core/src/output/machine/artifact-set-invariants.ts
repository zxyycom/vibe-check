import { GATE_POLICY_DESCRIPTORS } from "../../model/gate-policy.ts";
import {
  SCAN_CAPABILITY_IDS,
  reduceScanCompleteness
} from "../../model/scan-completeness.ts";
import type {
  MachineMetricsV1,
  MachineWarningV1
} from "./schema.ts";
import {
  firstDeepMismatchIndex,
  firstSubsequenceFailureIndex,
  setFailure
} from "./validation-support.ts";
import type { MachineValidationResult } from "./validation-types.ts";

const METRICS_ARTIFACT = "metrics.json";
const WARNINGS_ARTIFACT = "warnings.ndjson";
const WARNINGS_ALL_ARTIFACT = "warnings-all.ndjson";

type EvaluatedGate = Extract<
  MachineMetricsV1["gate"],
  { status: "failed" | "passed" }
>;
type GatePolicyDescriptor = typeof GATE_POLICY_DESCRIPTORS[number];
type InvariantFailure = MachineValidationResult<never>;

export function validateArtifactSetInvariants(
  metrics: MachineMetricsV1,
  warnings: readonly MachineWarningV1[],
  warningsAll: readonly MachineWarningV1[]
): InvariantFailure | null {
  const streamFailure = validateWarningStreamRelationships(
    metrics,
    warnings,
    warningsAll
  );
  if (streamFailure) return streamFailure;

  const subsequenceFailure = validateWarningSubsequences(metrics);
  if (subsequenceFailure) return subsequenceFailure;

  const completenessFailure = validateCompleteness(metrics);
  if (completenessFailure) return completenessFailure;

  return validateEvaluatedGate(metrics);
}

function validateWarningStreamRelationships(
  metrics: MachineMetricsV1,
  warnings: readonly MachineWarningV1[],
  warningsAll: readonly MachineWarningV1[]
): InvariantFailure | null {
  const changedMismatch = firstDeepMismatchIndex(
    warnings,
    metrics.warnings.changed
  );
  if (changedMismatch !== null) {
    return setFailure({
      index: changedMismatch,
      logicalArtifact: WARNINGS_ARTIFACT,
      message:
        "Parsed warning stream must deep-equal metrics.warnings.changed in order and multiplicity.",
      relationship: "warnings-stream-equals-changed"
    });
  }

  const allMismatch = firstDeepMismatchIndex(
    warningsAll,
    metrics.warnings.all
  );
  if (allMismatch === null) return null;
  return setFailure({
    index: allMismatch,
    logicalArtifact: WARNINGS_ALL_ARTIFACT,
    message:
      "Parsed all-warning stream must deep-equal metrics.warnings.all in order and multiplicity.",
    relationship: "warnings-all-stream-equals-all"
  });
}

function validateWarningSubsequences(
  metrics: MachineMetricsV1
): InvariantFailure | null {
  const changedFailure = firstSubsequenceFailureIndex(
    metrics.warnings.changed,
    metrics.warnings.all
  );
  if (changedFailure !== null) {
    return setFailure({
      index: changedFailure,
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "metrics.warnings.changed must be an order-preserving subsequence of metrics.warnings.all.",
      pointer: `/warnings/changed/${changedFailure}`,
      relationship: "changed-subsequence-of-all"
    });
  }

  const regressionsFailure = firstSubsequenceFailureIndex(
    metrics.warnings.regressions,
    metrics.warnings.changed
  );
  if (regressionsFailure === null) return null;
  return setFailure({
    index: regressionsFailure,
    logicalArtifact: METRICS_ARTIFACT,
    message:
      "metrics.warnings.regressions must be an order-preserving subsequence of metrics.warnings.changed.",
    pointer: `/warnings/regressions/${regressionsFailure}`,
    relationship: "regressions-subsequence-of-changed"
  });
}

function validateCompleteness(
  metrics: MachineMetricsV1
): InvariantFailure | null {
  const capabilities = metrics.scanCompleteness.capabilities;
  const membershipFailure = validateCapabilityMembership(capabilities);
  if (membershipFailure) return membershipFailure;

  const expectedOverall = reduceScanCompleteness(capabilities);
  if (metrics.scanCompleteness.overall === expectedOverall) return null;
  return setFailure({
    logicalArtifact: METRICS_ARTIFACT,
    message:
      `scanCompleteness.overall must equal shared reduction "${expectedOverall}".`,
    pointer: "/scanCompleteness/overall",
    relationship: "completeness-reduction"
  });
}

function validateCapabilityMembership(
  capabilities: MachineMetricsV1["scanCompleteness"]["capabilities"]
): InvariantFailure | null {
  const seen = new Set<string>();
  for (const [index, result] of capabilities.entries()) {
    if (
      !SCAN_CAPABILITY_IDS.includes(result.capabilityId) ||
      seen.has(result.capabilityId)
    ) {
      return capabilityMembershipFailure(
        `/scanCompleteness/capabilities/${index}/capabilityId`,
        index
      );
    }
    seen.add(result.capabilityId);
  }
  if (
    capabilities.length === SCAN_CAPABILITY_IDS.length &&
    SCAN_CAPABILITY_IDS.every((capabilityId) => seen.has(capabilityId))
  ) {
    return null;
  }
  return capabilityMembershipFailure("/scanCompleteness/capabilities");
}

function capabilityMembershipFailure(
  pointer: string,
  index?: number
): InvariantFailure {
  return setFailure({
    ...(index === undefined ? {} : { index }),
    logicalArtifact: METRICS_ARTIFACT,
    message:
      "scanCompleteness.capabilities must contain every stable capability ID exactly once.",
    pointer,
    relationship: "capability-membership"
  });
}

function validateEvaluatedGate(
  metrics: MachineMetricsV1
): InvariantFailure | null {
  const gate = metrics.gate;
  if (gate.status !== "passed" && gate.status !== "failed") return null;

  const descriptor = GATE_POLICY_DESCRIPTORS.find(
    ({ value }) => value === gate.policy
  )!;
  const channelFailure = validateGateChannel(gate, descriptor);
  if (channelFailure) return channelFailure;

  const evaluatedWarnings = metrics.warnings[descriptor.evaluatedChannel];
  const countFailure = validateGateEvaluatedCount(gate, evaluatedWarnings);
  if (countFailure) return countFailure;

  const expectedBlocking = evaluatedWarnings.filter((warning) => (
    warning.acceptedReason === undefined || warning.acceptedReason.length === 0
  ));
  return validateGateBlockingResult(gate, expectedBlocking);
}

function validateGateChannel(
  gate: EvaluatedGate,
  descriptor: GatePolicyDescriptor
): InvariantFailure | null {
  if (gate.evaluatedChannel === descriptor.evaluatedChannel) return null;
  return setFailure({
    logicalArtifact: METRICS_ARTIFACT,
    message:
      `gate.evaluatedChannel must be "${descriptor.evaluatedChannel}" for policy "${descriptor.value}".`,
    pointer: "/gate/evaluatedChannel",
    relationship: "gate-policy-channel"
  });
}

function validateGateEvaluatedCount(
  gate: EvaluatedGate,
  evaluatedWarnings: readonly MachineWarningV1[]
): InvariantFailure | null {
  if (gate.evaluatedWarningCount === evaluatedWarnings.length) return null;
  return setFailure({
    logicalArtifact: METRICS_ARTIFACT,
    message:
      "gate.evaluatedWarningCount must equal the selected warning channel length.",
    pointer: "/gate/evaluatedWarningCount",
    relationship: "gate-evaluated-count"
  });
}

function validateGateBlockingResult(
  gate: EvaluatedGate,
  expectedBlocking: readonly MachineWarningV1[]
): InvariantFailure | null {
  const blockingMismatch = firstDeepMismatchIndex(
    gate.blockingWarnings,
    expectedBlocking
  );
  if (blockingMismatch !== null) {
    return setFailure({
      index: blockingMismatch,
      logicalArtifact: METRICS_ARTIFACT,
      message:
        "gate.blockingWarnings must equal the ordered unaccepted warnings from the evaluated channel.",
      pointer: "/gate/blockingWarnings",
      relationship: "gate-blocking-warnings"
    });
  }

  const countFailure = validateGateBlockingCount(gate);
  if (countFailure) return countFailure;
  return validateGateStatus(gate, expectedBlocking.length);
}

function validateGateBlockingCount(
  gate: EvaluatedGate
): InvariantFailure | null {
  if (gate.blockingWarningCount === gate.blockingWarnings.length) return null;
  return setFailure({
    logicalArtifact: METRICS_ARTIFACT,
    message:
      "gate.blockingWarningCount must equal gate.blockingWarnings length.",
    pointer: "/gate/blockingWarningCount",
    relationship: "gate-blocking-count"
  });
}

function validateGateStatus(
  gate: EvaluatedGate,
  blockingWarningCount: number
): InvariantFailure | null {
  const expectedStatus = blockingWarningCount === 0 ? "passed" : "failed";
  if (gate.status === expectedStatus) return null;
  return setFailure({
    logicalArtifact: METRICS_ARTIFACT,
    message:
      `gate.status must be "${expectedStatus}" for the validated blocking warnings.`,
    pointer: "/gate/status",
    relationship: "gate-status"
  });
}
