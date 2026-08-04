import { isDeepStrictEqual } from "node:util";

import { setFailure } from "./machine-artifact-diagnostics.ts";
import {
  EVALUATED_CHANNEL_BY_POLICY,
  METRICS_ARTIFACT,
  STABLE_CAPABILITY_IDS,
  WARNINGS_ALL_ARTIFACT,
  WARNINGS_ARTIFACT,
  type DocsMachineValidationFailure,
  type JsonRecord,
  type MachineMetricsShape,
  type WarningChannel
} from "./machine-artifact-types.ts";

export function validateArtifactSetInvariants(
  metrics: MachineMetricsShape,
  warnings: readonly JsonRecord[],
  warningsAll: readonly JsonRecord[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  return validateWarningRelationships(metrics, warnings, warningsAll, artifactRoot)
    ?? validateCompleteness(metrics, artifactRoot)
    ?? validateEvaluatedGate(metrics, artifactRoot);
}

function validateWarningRelationships(
  metrics: MachineMetricsShape,
  warnings: readonly JsonRecord[],
  warningsAll: readonly JsonRecord[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const changedMismatch = firstDeepMismatchIndex(
    warnings,
    metrics.warnings.changed
  );
  if (changedMismatch !== null) {
    return setFailure(artifactRoot, WARNINGS_ARTIFACT, {
      index: changedMismatch,
      message:
        "Parsed warning stream must deep-equal metrics.warnings.changed in order and multiplicity.",
      relationship: "warnings-stream-equals-changed"
    });
  }

  const allMismatch = firstDeepMismatchIndex(warningsAll, metrics.warnings.all);
  if (allMismatch !== null) {
    return setFailure(artifactRoot, WARNINGS_ALL_ARTIFACT, {
      index: allMismatch,
      message:
        "Parsed all-warning stream must deep-equal metrics.warnings.all in order and multiplicity.",
      relationship: "warnings-all-stream-equals-all"
    });
  }
  return validateWarningSubsequences(metrics, artifactRoot);
}

function validateWarningSubsequences(
  metrics: MachineMetricsShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const changedFailure = firstSubsequenceFailureIndex(
    metrics.warnings.changed,
    metrics.warnings.all
  );
  if (changedFailure !== null) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      index: changedFailure,
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
  return setFailure(artifactRoot, METRICS_ARTIFACT, {
    index: regressionsFailure,
    message:
      "metrics.warnings.regressions must be an order-preserving subsequence of metrics.warnings.changed.",
    pointer: `/warnings/regressions/${regressionsFailure}`,
    relationship: "regressions-subsequence-of-changed"
  });
}

function validateCompleteness(
  metrics: MachineMetricsShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const capabilities = metrics.scanCompleteness.capabilities;
  const seen = new Set<string>();
  for (const [index, capability] of capabilities.entries()) {
    if (!isUniqueStableCapability(capability.capabilityId, seen)) {
      return capabilityMembershipFailure(
        artifactRoot,
        `/scanCompleteness/capabilities/${index}/capabilityId`,
        index
      );
    }
    seen.add(capability.capabilityId);
  }
  if (
    capabilities.length !== STABLE_CAPABILITY_IDS.length ||
    STABLE_CAPABILITY_IDS.some((capabilityId) => !seen.has(capabilityId))
  ) {
    return capabilityMembershipFailure(
      artifactRoot,
      "/scanCompleteness/capabilities"
    );
  }

  const expectedOverall = reduceCompleteness(capabilities);
  if (metrics.scanCompleteness.overall === expectedOverall) return null;
  return setFailure(artifactRoot, METRICS_ARTIFACT, {
    message:
      `scanCompleteness.overall must equal the independent reduction "${expectedOverall}".`,
    pointer: "/scanCompleteness/overall",
    relationship: "completeness-reduction"
  });
}

function isUniqueStableCapability(
  capabilityId: string,
  seen: ReadonlySet<string>
): boolean {
  return STABLE_CAPABILITY_IDS.includes(
    capabilityId as typeof STABLE_CAPABILITY_IDS[number]
  ) && !seen.has(capabilityId);
}

function capabilityMembershipFailure(
  artifactRoot: string,
  pointer: string,
  index?: number
): DocsMachineValidationFailure {
  return setFailure(artifactRoot, METRICS_ARTIFACT, {
    ...(index === undefined ? {} : { index }),
    message:
      "scanCompleteness.capabilities must contain every stable capability ID exactly once.",
    pointer,
    relationship: "capability-membership"
  });
}

function validateEvaluatedGate(
  metrics: MachineMetricsShape,
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const gate = metrics.gate;
  if (gate.status !== "passed" && gate.status !== "failed") return null;

  const policy = gate.policy as keyof typeof EVALUATED_CHANNEL_BY_POLICY;
  const evaluatedChannel = EVALUATED_CHANNEL_BY_POLICY[policy];
  if (gate.evaluatedChannel !== evaluatedChannel) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        `gate.evaluatedChannel must be "${evaluatedChannel}" for policy "${policy}".`,
      pointer: "/gate/evaluatedChannel",
      relationship: "gate-policy-channel"
    });
  }

  const evaluatedWarnings = metrics.warnings[
    evaluatedChannel as WarningChannel
  ];
  if (gate.evaluatedWarningCount !== evaluatedWarnings.length) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        "gate.evaluatedWarningCount must equal the selected warning channel length.",
      pointer: "/gate/evaluatedWarningCount",
      relationship: "gate-evaluated-count"
    });
  }
  return validateBlockingGate(metrics, evaluatedWarnings, artifactRoot);
}

function validateBlockingGate(
  metrics: MachineMetricsShape,
  evaluatedWarnings: readonly JsonRecord[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  const gate = metrics.gate;
  const expectedBlocking = evaluatedWarnings.filter((warning) => (
    warning.acceptedReason === undefined || warning.acceptedReason === ""
  ));
  const blockingWarnings = gate.blockingWarnings as JsonRecord[];
  const blockingMismatch = firstDeepMismatchIndex(
    blockingWarnings,
    expectedBlocking
  );
  if (blockingMismatch !== null) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      index: blockingMismatch,
      message:
        "gate.blockingWarnings must equal the ordered unaccepted warnings from the evaluated channel.",
      pointer: "/gate/blockingWarnings",
      relationship: "gate-blocking-warnings"
    });
  }
  return validateBlockingCountAndStatus(
    gate,
    blockingWarnings,
    expectedBlocking,
    artifactRoot
  );
}

function validateBlockingCountAndStatus(
  gate: JsonRecord,
  blockingWarnings: readonly JsonRecord[],
  expectedBlocking: readonly JsonRecord[],
  artifactRoot: string
): DocsMachineValidationFailure | null {
  if (gate.blockingWarningCount !== blockingWarnings.length) {
    return setFailure(artifactRoot, METRICS_ARTIFACT, {
      message:
        "gate.blockingWarningCount must equal gate.blockingWarnings length.",
      pointer: "/gate/blockingWarningCount",
      relationship: "gate-blocking-count"
    });
  }

  const expectedStatus = expectedBlocking.length === 0 ? "passed" : "failed";
  if (gate.status === expectedStatus) return null;
  return setFailure(artifactRoot, METRICS_ARTIFACT, {
    message:
      `gate.status must be "${expectedStatus}" for the validated blocking warnings.`,
    pointer: "/gate/status",
    relationship: "gate-status"
  });
}

function reduceCompleteness(
  capabilities: MachineMetricsShape["scanCompleteness"]["capabilities"]
): "complete" | "empty" | "failed" {
  let succeeded = false;
  for (const capability of capabilities) {
    if (capability.status === "failed") return "failed";
    if (capability.status === "succeeded") succeeded = true;
  }
  return succeeded ? "complete" : "empty";
}

function firstDeepMismatchIndex(
  left: readonly unknown[],
  right: readonly unknown[]
): number | null {
  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    if (!isDeepStrictEqual(left[index], right[index])) return index;
  }
  return left.length === right.length ? null : sharedLength;
}

function firstSubsequenceFailureIndex(
  subsequence: readonly unknown[],
  sequence: readonly unknown[]
): number | null {
  let index = 0;
  for (const value of sequence) {
    if (isDeepStrictEqual(subsequence[index], value)) {
      index += 1;
      if (index === subsequence.length) return null;
    }
  }
  return index === subsequence.length ? null : index;
}
