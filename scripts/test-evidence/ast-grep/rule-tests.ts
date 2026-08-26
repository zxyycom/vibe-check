import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  astGrepInvocation,
  expectedAstGrepVersionLine,
  type AstGrepInvocation
} from "./command.ts";
import { runProcess, type ProcessResult, writeProcessOutput } from "../../foundation/process.ts";

const moduleWorkspaceRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);

export type TestEvidenceRuleTestResult = {
  readonly ruleTests?: ProcessResult;
  readonly version: ProcessResult;
};

export type TestEvidenceRuleTestInvocations = {
  readonly ruleTests: AstGrepInvocation;
  readonly version: AstGrepInvocation;
};

export function testEvidenceRuleTestInvocations(
  workspaceRoot: string
): TestEvidenceRuleTestInvocations {
  const configPath = path.join(
    workspaceRoot,
    "scripts",
    "test-evidence",
    "ast-grep",
    "sgconfig.yml"
  );
  return {
    version: astGrepInvocation(["--version"], { workspaceRoot }),
    ruleTests: astGrepInvocation(
      ["test", "--config", configPath, "--skip-snapshot-tests", "--color", "never"],
      { workspaceRoot }
    )
  };
}

export function testEvidenceRuleTestFailureMessage(
  result: TestEvidenceRuleTestResult
): string | undefined {
  if (
    result.version.status !== 0 ||
    result.version.stdout.trim() !== expectedAstGrepVersionLine()
  ) {
    return `unexpected ast-grep version: status=${String(result.version.status)} stdout=${JSON.stringify(result.version.stdout)}`;
  }
  if (result.ruleTests === undefined) {
    return "ast-grep rule tests did not run because version validation failed";
  }
  if (result.ruleTests.status !== 0) {
    return `ast-grep rule tests failed with status ${String(result.ruleTests.status)}`;
  }
  return undefined;
}

export async function runTestEvidenceRuleTests(options: {
  cancelSignal?: AbortSignal;
  workspaceRoot: string;
}): Promise<TestEvidenceRuleTestResult> {
  const invocations = testEvidenceRuleTestInvocations(options.workspaceRoot);
  const version = await runProcess({ ...invocations.version, cancelSignal: options.cancelSignal });
  if (version.status !== 0 || version.stdout.trim() !== expectedAstGrepVersionLine()) {
    return { version };
  }
  const ruleTests = await runProcess({
    ...invocations.ruleTests,
    cancelSignal: options.cancelSignal
  });
  return { ruleTests, version };
}

function writeRuleTestOutput(result: TestEvidenceRuleTestResult): void {
  writeProcessOutput(result.version);
  if (result.ruleTests !== undefined) writeProcessOutput(result.ruleTests);
}

if (import.meta.main) {
  try {
    const result = await runTestEvidenceRuleTests({ workspaceRoot: moduleWorkspaceRoot });
    writeRuleTestOutput(result);
    const failureMessage = testEvidenceRuleTestFailureMessage(result);
    if (failureMessage !== undefined) throw new Error(failureMessage);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
