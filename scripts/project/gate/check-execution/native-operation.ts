import { defineCheck, type Check, type CheckResult } from "@zxyycom/vibe-check";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  executionCancelled: "execution-cancelled",
  nativeOperationUnavailable: "native-operation-unavailable"
} as const);

export interface NativeOperationPassed {
  readonly passed: true;
}

export interface NativeOperationFailed {
  readonly code: string;
  readonly diagnosticCount: number;
  readonly focusedCommand: string;
  readonly passed: false;
  readonly summary: string;
}

export type NativeOperationResult = Readonly<NativeOperationPassed | NativeOperationFailed>;

/** Maps one private native operation into ordinary Check facts without a process transcript. */
export function createNativeOperationCheck(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly operation: (
      workspaceRoot: string,
      signal: AbortSignal
    ) => NativeOperationResult | Promise<NativeOperationResult>;
  }>
): Check {
  return defineCheck({
    checkId: input.checkId,
    displayName: input.displayName,
    execution: async ({ project, records, signal }): Promise<CheckResult> => {
      if (signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
      try {
        const result = await input.operation(project.root, signal);
        if (signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
        if (result.passed) return passedResult();
        records.report(
          { id: "native-operation-diagnostic" },
          { code: result.code, count: result.diagnosticCount }
        );
        return failedResult(result);
      } catch {
        return signal.aborted
          ? unavailable(UNAVAILABLE_REASON_CODE.executionCancelled)
          : unavailable(UNAVAILABLE_REASON_CODE.nativeOperationUnavailable);
      }
    }
  });
}

function passedResult(): CheckResult {
  return Object.freeze({ status: "passed", data: Object.freeze({ outcome: "completed" }) });
}

function failedResult(result: Readonly<NativeOperationFailed>): CheckResult {
  return Object.freeze({
    status: "failed",
    data: Object.freeze({
      outcome: "failed",
      diagnosticCode: result.code,
      diagnosticCount: result.diagnosticCount
    }),
    messages: Object.freeze([
      Object.freeze({
        level: "error",
        code: result.code,
        message: `${result.summary}; run: ${result.focusedCommand}`
      })
    ])
  });
}

function unavailable(
  code: (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE]
): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}

/** Constructs the private success fact returned by a domain native operation. */
export function nativePassed(): NativeOperationResult {
  return Object.freeze({ passed: true });
}

/** Constructs the private failure fact returned by a domain native operation. */
export function nativeFailed(input: Omit<NativeOperationFailed, "passed">): NativeOperationResult {
  return Object.freeze({ passed: false, ...input });
}
