export const SCAN_CAPABILITY_IDS = Object.freeze([
  "file-metrics",
  "function-metrics",
  "duplicate-detection"
] as const);

export type ScanCapabilityId = typeof SCAN_CAPABILITY_IDS[number];
export type CapabilityFailureKind = "unavailable" | "execution" | "invalid-result";
export type ScanCompleteness = "complete" | "empty" | "failed";

export interface CapabilityFailureDiagnostic {
  readonly action: string;
  readonly kind: CapabilityFailureKind;
  readonly message: string;
}

export type CapabilityResult =
  | {
    readonly capabilityId: ScanCapabilityId;
    readonly status: "skipped";
  }
  | {
    readonly capabilityId: ScanCapabilityId;
    readonly status: "no-input";
  }
  | {
    readonly capabilityId: ScanCapabilityId;
    readonly status: "succeeded";
  }
  | {
    readonly capabilityId: ScanCapabilityId;
    readonly diagnostic: CapabilityFailureDiagnostic;
    readonly status: "failed";
  };

export type FailedCapabilityResult = Extract<CapabilityResult, { status: "failed" }>;

export function reduceScanCompleteness(
  results: readonly CapabilityResult[]
): ScanCompleteness {
  let hasSucceeded = false;

  for (const result of results) {
    if (result.status === "failed") {
      return "failed";
    }
    if (result.status === "succeeded") {
      hasSucceeded = true;
    }
  }

  return hasSucceeded ? "complete" : "empty";
}
