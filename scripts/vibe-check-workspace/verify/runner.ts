import {
  runTaskGraph,
  type PlannedTask,
  type SettledTask
} from "../../../src/product/task-scheduler/index.ts";
import { checksForProfile, reportCountForChecks } from "../checks/index.ts";
import type { CheckResult, CompletionResult } from "../results.ts";
import { createReportCompletionTracker } from "../results.ts";
import { createWorkspaceTaskGraph } from "../task-engine-adapter.ts";
import type { VerificationOptions } from "./args.ts";
import { executeCheck } from "./execution.ts";
import { appendLog, createLogPaths, finalizeLogs, initializeLogs } from "./logs.ts";
import { printCompletionResult, printHeader, printSummary } from "./output.ts";

export async function runVerification({
  profile,
  concurrency
}: VerificationOptions): Promise<number> {
  const selectedChecks = checksForProfile(profile);
  const totalReports = reportCountForChecks(selectedChecks);
  const completeReport = createReportCompletionTracker(selectedChecks);
  const taskGraph = createWorkspaceTaskGraph(selectedChecks);
  const logPaths = createLogPaths();
  initializeLogs({
    leafChecks: selectedChecks.length,
    logPaths,
    profile,
    totalChecks: totalReports
  });

  const startedAtMs = Date.now();
  const completedReports: CompletionResult[] = [];
  const executeWorkspaceTask = async (task: PlannedTask): Promise<CheckResult> => {
    const check = taskGraph.checkByTaskId.get(task.id);
    if (check === undefined) {
      throw new Error(`workspace verification task has no check: ${task.id}`);
    }
    const result = await executeCheck(check);
    appendLog(logPaths, result);
    const report = completeReport(result);
    if (report) {
      completedReports.push(report);
      printCompletionResult({ result: report });
    }
    return result;
  };

  printHeader(profile, totalReports);
  const taskRun = await runTaskGraph<CheckResult>({
    graph: taskGraph.graph,
    maxParallel: concurrency ?? Math.max(1, selectedChecks.length),
    execute: executeWorkspaceTask
  });
  throwForUncompletedWorkspaceTask(taskRun.settlements);

  const failures = completedReports.filter((result) => !result.ok);
  const totalDurationMs = Date.now() - startedAtMs;
  finalizeLogs(logPaths, totalDurationMs);

  printSummary({
    profile,
    totalChecks: totalReports,
    completedResults: completedReports,
    totalDurationMs,
    logPaths
  });

  return failures.length > 0 ? 1 : 0;
}

function throwForUncompletedWorkspaceTask(settlements: readonly SettledTask<CheckResult>[]): void {
  const incomplete = settlements.find(({ settlement }) => settlement.kind !== "completed");
  if (incomplete === undefined) {
    return;
  }
  const { settlement, task } = incomplete;
  if (settlement.kind === "failed") {
    throw new Error(`workspace verification task failed to execute: ${task.id}`, {
      cause: settlement.error
    });
  }
  throw new Error(`workspace verification task did not complete: ${task.id} (${settlement.kind})`);
}
