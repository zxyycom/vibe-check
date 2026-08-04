import { GATE_POLICY_DESCRIPTORS, type GatePolicy } from "./gate-policy.ts";
import type { ScanCompleteness } from "./scan-completeness.ts";
import type {
  ComparisonStatus,
  GateResult,
  WarningChannels,
} from "./schema/types.ts";

export function evaluateGate(
  requestedPolicy: GatePolicy | null,
  scanCompleteness: ScanCompleteness,
  comparisonStatus: ComparisonStatus,
  warningChannels: WarningChannels,
): GateResult {
  if (requestedPolicy === null) {
    return { policy: null, status: "disabled" };
  }
  const prerequisiteResult = evaluateGatePrerequisites(
    requestedPolicy,
    scanCompleteness,
  );
  if (prerequisiteResult) return prerequisiteResult;

  const descriptor = GATE_POLICY_DESCRIPTORS.find(
    ({ value }) => value === requestedPolicy,
  );
  if (descriptor === undefined) {
    throw new Error(`Unknown normalized gate policy: ${requestedPolicy}`);
  }
  if (
    comparisonIsUnavailable(descriptor.requiresComparison, comparisonStatus)
  ) {
    return {
      policy: requestedPolicy,
      reasonCode: "comparison-unavailable",
      status: "not-evaluated",
    };
  }

  return evaluateWarningChannel(
    requestedPolicy,
    descriptor.evaluatedChannel,
    warningChannels,
  );
}

function evaluateGatePrerequisites(
  policy: GatePolicy,
  scanCompleteness: ScanCompleteness,
): GateResult | null {
  if (scanCompleteness === "failed") {
    return { policy, reasonCode: "scan-incomplete", status: "not-evaluated" };
  }
  if (scanCompleteness === "empty") {
    return { policy, reasonCode: "no-eligible-input", status: "not-evaluated" };
  }
  return null;
}

function comparisonIsUnavailable(
  requiresComparison: boolean,
  comparisonStatus: ComparisonStatus,
): boolean {
  return requiresComparison && comparisonStatus === "baseline-unavailable";
}

function evaluateWarningChannel(
  policy: GatePolicy,
  evaluatedChannel: keyof WarningChannels,
  warningChannels: WarningChannels,
): GateResult {
  const selectedWarnings = warningChannels[evaluatedChannel];
  const blockingWarnings = selectedWarnings.filter(isBlockingWarning);

  return {
    blockingWarningCount: blockingWarnings.length,
    blockingWarnings,
    evaluatedChannel,
    evaluatedWarningCount: selectedWarnings.length,
    policy,
    status: blockingWarnings.length === 0 ? "passed" : "failed",
  };
}

function isBlockingWarning({
  acceptedReason,
}: WarningChannels[keyof WarningChannels][number]): boolean {
  return acceptedReason === undefined || acceptedReason.length === 0;
}
