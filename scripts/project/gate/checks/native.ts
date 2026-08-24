import {
  validateDecisionRecords,
  type DecisionValidationResult
} from "../../../decision-records/command.ts";
import { validateDocs, type DocsValidationTask } from "../../../docs/validate.ts";
import {
  checkTestEvidence,
  type ProjectTestEvidenceReport
} from "../../../test-evidence/command.ts";
import { defineCheck, type Check, type CheckResult } from "vibe-check";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  executionCancelled: "execution-cancelled",
  nativeOperationUnavailable: "native-operation-unavailable"
} as const);

interface NativeOperationPassed {
  readonly passed: true;
}

interface NativeOperationFailed {
  readonly code: string;
  readonly diagnosticCount: number;
  readonly focusedCommand: string;
  readonly passed: false;
  readonly summary: string;
}

type NativeOperationResult = Readonly<NativeOperationPassed | NativeOperationFailed>;

/** Creates the native Check for one import-safe Docs validator task. */
export function createDocsValidationCheck(
  input: Readonly<{
    readonly checkId: string;
    readonly displayName: string;
    readonly task: DocsValidationTask;
  }>
): Check {
  return createNativeOperationCheck({
    checkId: input.checkId,
    displayName: input.displayName,
    operation: (): NativeOperationResult => {
      try {
        validateDocs({ tasks: [input.task] });
        return nativePassed();
      } catch {
        return nativeFailed({
          code: `${input.checkId}-invalid`,
          diagnosticCount: 1,
          focusedCommand: `bun run validate -- docs ${input.task}`,
          summary: `${input.displayName} reported a validation error`
        });
      }
    }
  });
}

/** Creates the native Check for the typed Decision Records validation result. */
export function createDecisionRecordsCheck(): Check {
  return createNativeOperationCheck({
    checkId: "decision-records",
    displayName: "Decision records",
    operation: async (): Promise<NativeOperationResult> =>
      decisionRecordsResult(await validateDecisionRecords())
  });
}

/** Creates the native Check for the typed Test Evidence report. */
export function createTestEvidenceCheck(): Check {
  return createNativeOperationCheck({
    checkId: "test-evidence",
    displayName: "Semantic Case ledger",
    operation: async (workspaceRoot, signal): Promise<NativeOperationResult> =>
      testEvidenceResult(await checkTestEvidence({ cancelSignal: signal, workspaceRoot }))
  });
}

function decisionRecordsResult(result: DecisionValidationResult): NativeOperationResult {
  if (result.errors.length === 0) return nativePassed();
  return nativeFailed({
    code: "decision-records-invalid",
    diagnosticCount: result.errors.length,
    focusedCommand: "bun run decisions -- check",
    summary: `Decision Records reported ${result.errors.length} validation error(s)`
  });
}

function testEvidenceResult(result: ProjectTestEvidenceReport): NativeOperationResult {
  if (result.status === "ok") return nativePassed();
  const diagnostics = result.diagnostics.filter(({ blocking }) => blocking);
  const firstCode = safeDiagnosticCode(diagnostics[0]?.code);
  return nativeFailed({
    code: `test-evidence-${firstCode}`,
    diagnosticCount: diagnostics.length,
    focusedCommand: "bun run test-evidence -- check --root .",
    summary: `Test Evidence reported ${diagnostics.length} blocking diagnostic(s); first code: ${firstCode}`
  });
}

function safeDiagnosticCode(value: string | undefined): string {
  return value !== undefined && value.length <= 80 && /^[a-z][a-z0-9:.-]*$/u.test(value)
    ? value
    : "invalid";
}

function nativePassed(): NativeOperationResult {
  return Object.freeze({ passed: true });
}

function nativeFailed(input: Omit<NativeOperationFailed, "passed">): NativeOperationResult {
  return Object.freeze({ passed: false, ...input });
}

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
