// #region package-api-example:prepared-custom-admission-policy
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

let settledTaskCount: number | null = null;

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execution: () => ({ status: "passed" as const, data: {} })
  });
}

const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    async prepare() {
      // 模拟异步读取调用方自己的配置，并将其捕获在本 Run 的 closure 中。
      const preferredTaskId = await Promise.resolve("second");
      return {
        decide(context) {
          const next = context.candidates.find(
            ({ canAdmit, taskId }) => canAdmit && taskId === preferredTaskId
          ) ?? context.candidates.find(({ canAdmit }) => canAdmit);
          return next === undefined
            ? { kind: "wait" as const }
            : { kind: "select" as const, taskId: next.taskId };
        },
        complete(terminal) {
          settledTaskCount = terminal.execution.settledTasks.length;
        }
      };
    }
  }
});

const definition = defineConfig({
  checks: [scheduledCheck("first"), scheduledCheck("second")],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: { admissionPolicy: strategy }
});

const result = await run(definition);
if (result.kind !== "completed" || settledTaskCount !== 2) {
  throw new Error("Expected a completed Run and terminal measurement for both Checks");
}
// #endregion package-api-example:prepared-custom-admission-policy
