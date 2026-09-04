import { defineCheck, type Check, type CheckResult } from "@zxyycom/vibe-check";

import {
  safeNativeOperationResult,
  type NativeOperationResult,
  type SafeNativeOperationFailed
} from "./native-operation-protocol.ts";

export {
  nativeFailed,
  nativePassed,
  type NativeOperationDiagnostic,
  type NativeOperationFailed,
  type NativeOperationPassed,
  type NativeOperationResult
} from "./native-operation-protocol.ts";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  executionCancelled: "execution-cancelled",
  nativeOperationUnavailable: "native-operation-unavailable"
} as const);

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
        const operationResult: unknown = await input.operation(project.root, signal);
        if (signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
        const result = safeNativeOperationResult(operationResult);
        if (result === undefined)
          return unavailable(UNAVAILABLE_REASON_CODE.nativeOperationUnavailable);
        if (result.kind === "passed") return passedResult();
        for (const diagnostic of result.diagnostics)
          records.report({ id: diagnostic.id }, diagnostic.data);
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

function failedResult(result: SafeNativeOperationFailed): CheckResult {
  return Object.freeze({
    status: "failed",
    data: Object.freeze({
      outcome: "failed",
      diagnosticCode: result.code,
      diagnosticCount: result.diagnostics.length
    }),
    messages: Object.freeze([
      Object.freeze({
        level: "error" as const,
        code: result.code,
        message: `Run: ${result.focusedCommand}.`
      })
    ])
  });
}

function unavailable(
  code: (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE]
): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
