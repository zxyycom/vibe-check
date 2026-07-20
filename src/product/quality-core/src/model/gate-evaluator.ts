import {
  GATE_POLICY_DESCRIPTORS,
  type GatePolicy
} from "./gate-policy.ts";
import type { ScanCompleteness } from "./scan-completeness.ts";
import type {
  ComparisonStatus,
  GateResult,
  WarningChannels
} from "./schema/types.ts";

export function evaluateGate(
  requestedPolicy: GatePolicy | null,
  scanCompleteness: ScanCompleteness,
  comparisonStatus: ComparisonStatus,
  warningChannels: WarningChannels
): GateResult {
  if (requestedPolicy === null) {
    return { policy: null, status: "disabled" };
  }
  if (scanCompleteness === "failed") {
    return {
      policy: requestedPolicy,
      reasonCode: "scan-incomplete",
      status: "not-evaluated"
    };
  }
  if (scanCompleteness === "empty") {
    return {
      policy: requestedPolicy,
      reasonCode: "no-eligible-input",
      status: "not-evaluated"
    };
  }

  const descriptor = GATE_POLICY_DESCRIPTORS.find(
    ({ value }) => value === requestedPolicy
  );
  if (descriptor === undefined) {
    throw new Error(`Unknown normalized gate policy: ${requestedPolicy}`);
  }
  if (
    descriptor.requiresComparison &&
    comparisonStatus === "baseline-unavailable"
  ) {
    return {
      policy: requestedPolicy,
      reasonCode: "comparison-unavailable",
      status: "not-evaluated"
    };
  }

  const selectedWarnings = warningChannels[descriptor.evaluatedChannel];
  const blockingWarnings = selectedWarnings.filter(
    ({ acceptedReason }) =>
      acceptedReason === undefined || acceptedReason.length === 0
  );

  return {
    blockingWarningCount: blockingWarnings.length,
    blockingWarnings,
    evaluatedChannel: descriptor.evaluatedChannel,
    evaluatedWarningCount: selectedWarnings.length,
    policy: requestedPolicy,
    status: blockingWarnings.length === 0 ? "passed" : "failed"
  };
}
