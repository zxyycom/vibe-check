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

const NATIVE_DIAGNOSTIC_PREVIEW_LIMIT = 10;
const NATIVE_DIAGNOSTIC_PREVIEW_CODE_POINT_LIMIT = 240;

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
  const preview = result.diagnostics.slice(0, NATIVE_DIAGNOSTIC_PREVIEW_LIMIT);
  const omittedCount = result.diagnostics.length - preview.length;
  return Object.freeze({
    status: "failed",
    data: Object.freeze({
      outcome: "failed",
      diagnosticCode: result.code,
      diagnosticCount: result.diagnostics.length
    }),
    messages: Object.freeze([
      ...preview.map((diagnostic) =>
        Object.freeze({
          level: "error" as const,
          code: result.code,
          message: boundedPresentation(diagnostic.presentation)
        })
      ),
      ...(omittedCount === 0
        ? []
        : [
            Object.freeze({
              level: "error" as const,
              code: result.code,
              message: `${omittedCount} additional diagnostic(s) were omitted from terminal preview; inspect this Check's Records for the complete set.`
            })
          ]),
      Object.freeze({
        level: "error",
        code: result.code,
        message: `Run: ${result.focusedCommand}.`
      })
    ])
  });
}

function boundedPresentation(presentation: string): string {
  if (codePointLength(presentation) <= NATIVE_DIAGNOSTIC_PREVIEW_CODE_POINT_LIMIT)
    return presentation;
  const marker = "… [truncated]";
  return `${prefixByCodePoints(
    presentation,
    NATIVE_DIAGNOSTIC_PREVIEW_CODE_POINT_LIMIT - codePointLength(marker)
  )}${marker}`;
}

function codePointLength(value: string): number {
  let length = 0;
  for (const _character of value) length += 1;
  return length;
}

function prefixByCodePoints(value: string, limit: number): string {
  let prefix = "";
  let length = 0;
  for (const character of value) {
    if (length === limit) break;
    prefix += character;
    length += 1;
  }
  return prefix;
}

function unavailable(
  code: (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE]
): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
