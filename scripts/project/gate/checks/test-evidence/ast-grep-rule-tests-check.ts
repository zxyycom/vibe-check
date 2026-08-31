import {
  runTestEvidenceRuleTests,
  testEvidenceRuleTestFailureMessage,
  testEvidenceRuleTestInvocations,
  type TestEvidenceRuleTestInvocations,
  type TestEvidenceRuleTestResult
} from "../../../../test-evidence/ast-grep/rule-tests.ts";
import { type ProcessResult } from "../../../../process-execution/execution.ts";
import { defineCheck, type Check, type CheckResult } from "@zxyycom/vibe-check";

import {
  failedProcessResult,
  processTranscriptReference,
  writeProcessTranscript,
  type ProcessCheckDescriptor
} from "../process/process.ts";

const UNAVAILABLE_REASON_CODE = Object.freeze({
  executionCancelled: "execution-cancelled",
  exitUnavailable: "exit-unavailable",
  processUnavailable: "process-unavailable",
  transcriptUnavailable: "transcript-unavailable"
} as const);

type UnavailableReasonCode = (typeof UNAVAILABLE_REASON_CODE)[keyof typeof UNAVAILABLE_REASON_CODE];
type RuleTestCheckContext = Parameters<NonNullable<Check["execution"]>>[0];

interface RuleTestExecution {
  readonly invocations: TestEvidenceRuleTestInvocations;
  readonly result: TestEvidenceRuleTestResult;
}

type TranscriptWriteResult = { readonly ok: false } | { readonly ok: true; readonly path: string };

export interface TestEvidenceRuleTestsCheckDependencies {
  readonly runRuleTests: typeof runTestEvidenceRuleTests;
  readonly ruleTestInvocations: typeof testEvidenceRuleTestInvocations;
  readonly writeTranscript: typeof writeProcessTranscript;
}

const defaultDependencies: TestEvidenceRuleTestsCheckDependencies = Object.freeze({
  runRuleTests: runTestEvidenceRuleTests,
  ruleTestInvocations: testEvidenceRuleTestInvocations,
  writeTranscript: writeProcessTranscript
});

/** Owns the two ast-grep process steps as one transcript-backed ordinary Check. */
export function createTestEvidenceRuleTestsCheck(
  invocationLogDirectory: string,
  dependencies: TestEvidenceRuleTestsCheckDependencies = defaultDependencies
): Check {
  return defineCheck({
    checkId: "test-evidence-rule-tests",
    displayName: "Test evidence ast-grep rule tests",
    execution: async (context): Promise<CheckResult> => {
      if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);

      const execution = await executeRuleTestWorkflow(
        context.project.root,
        context.signal,
        dependencies
      );
      if (typeof execution === "string") return unavailable(execution);

      const transcript = writeRuleTestTranscript(execution, invocationLogDirectory, dependencies);
      if (!transcript.ok) return unavailable(UNAVAILABLE_REASON_CODE.transcriptUnavailable);

      if (context.signal.aborted) return unavailable(UNAVAILABLE_REASON_CODE.executionCancelled);
      return settleRuleTestResult(execution.result, transcript.path, context);
    }
  });
}

async function executeRuleTestWorkflow(
  workspaceRoot: string,
  cancelSignal: AbortSignal,
  dependencies: TestEvidenceRuleTestsCheckDependencies
): Promise<RuleTestExecution | UnavailableReasonCode> {
  try {
    const invocations = dependencies.ruleTestInvocations(workspaceRoot);
    const result = await dependencies.runRuleTests({ cancelSignal, workspaceRoot });
    return { invocations, result };
  } catch {
    return UNAVAILABLE_REASON_CODE.processUnavailable;
  }
}

function writeRuleTestTranscript(
  execution: RuleTestExecution,
  invocationLogDirectory: string,
  dependencies: TestEvidenceRuleTestsCheckDependencies
): TranscriptWriteResult {
  try {
    return {
      ok: true,
      path: dependencies.writeTranscript({
        checkId: "test-evidence-rule-tests",
        invocationLogDirectory,
        steps: ruleTestTranscriptSteps(execution)
      })
    };
  } catch {
    return { ok: false };
  }
}

function ruleTestTranscriptSteps(execution: RuleTestExecution) {
  const { invocations, result } = execution;
  return [
    {
      definition: transcriptDefinition(invocations.version),
      label: "version",
      result: result.version
    },
    ...(result.ruleTests === undefined
      ? []
      : [
          {
            definition: transcriptDefinition(invocations.ruleTests),
            label: "rule-tests",
            result: result.ruleTests
          }
        ])
  ];
}

function settleRuleTestResult(
  result: TestEvidenceRuleTestResult,
  logPath: string,
  context: RuleTestCheckContext
): CheckResult {
  const unavailableResult = firstUnavailableProcessResult(result);
  if (unavailableResult !== undefined) return unavailable(unavailableResult);

  if (testEvidenceRuleTestFailureMessage(result) === undefined) {
    return Object.freeze({
      status: "passed",
      data: Object.freeze({
        ruleTestsExitCode: result.ruleTests?.status ?? null,
        versionExitCode: result.version.status
      })
    });
  }

  const failedProcess = firstFailedProcessResult(result);
  if (failedProcess !== undefined) {
    return failedProcessResult(context, {
      command: failedProcess.command,
      exitCode: failedProcess.result.status,
      logPath,
      signal: failedProcess.result.signal
    });
  }
  return Object.freeze({
    status: "failed",
    data: Object.freeze({ versionExitCode: result.version.status }),
    messages: Object.freeze([
      Object.freeze({
        level: "error",
        code: "ast-grep-version-mismatch",
        message: `The ast-grep version did not match; transcript: ${processTranscriptReference(logPath)}.`
      })
    ])
  });
}

function firstUnavailableProcessResult(
  result: TestEvidenceRuleTestResult
):
  | typeof UNAVAILABLE_REASON_CODE.exitUnavailable
  | typeof UNAVAILABLE_REASON_CODE.processUnavailable
  | undefined {
  for (const processResult of [result.version, result.ruleTests]) {
    if (processResult === undefined) continue;
    if (processResult.error !== undefined) return UNAVAILABLE_REASON_CODE.processUnavailable;
    if (processResult.status === null) return UNAVAILABLE_REASON_CODE.exitUnavailable;
  }
  return undefined;
}

function firstFailedProcessResult(result: TestEvidenceRuleTestResult):
  | Readonly<{
      readonly command: string;
      readonly result: ProcessResult & { readonly status: number };
    }>
  | undefined {
  const processes = [
    { command: "ast-grep", result: result.version },
    ...(result.ruleTests === undefined ? [] : [{ command: "ast-grep", result: result.ruleTests }])
  ];
  return processes.find(
    (
      process
    ): process is Readonly<{
      readonly command: string;
      readonly result: ProcessResult & { readonly status: number };
    }> => process.result.status !== null && process.result.status !== 0
  );
}

function transcriptDefinition(
  invocation: Pick<ProcessCheckDescriptor, "args" | "command">
): Readonly<{
  readonly args: readonly string[];
  readonly command: string;
}> {
  return Object.freeze({ args: invocation.args, command: invocation.command });
}

function unavailable(code: UnavailableReasonCode): CheckResult {
  return Object.freeze({ status: "unavailable", reason: { code } });
}
