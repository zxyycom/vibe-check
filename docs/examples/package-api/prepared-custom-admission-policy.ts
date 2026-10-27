// #region package-api-example:prepared-custom-admission-policy
import {
  defineAdmissionPolicy,
  defineCheck,
  defineConfig,
  defineContextCallback,
  run
} from "@zxyycom/vibe-check";

let settledTaskCount: number | null = null;
const executionOrder: string[] = [];

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execute: () => {
      executionOrder.push(checkId);
      return { status: "passed" as const, data: {} };
    }
  });
}

const strategy = defineAdmissionPolicy({
  kind: "custom",
  strategy: {
    kind: "prepared",
    prepare: defineContextCallback("scheduler.prepare", {
      contextNeeds: [],
      async callback() {
        // 模拟异步读取调用方自己的配置，并将其捕获在本 Run 的 closure 中。
        const preferredTaskId = await Promise.resolve("second");
        return {
          decide: defineContextCallback("scheduler.decide", {
            contextNeeds: ["candidates", "runtime"],
            callback(context) {
              if (context.runtime.abortRequested || context.runtime.cancelled) {
                return { kind: "wait" };
              }
              const next = context.candidates.find(
                ({ canAdmit, taskId }) => canAdmit && taskId === preferredTaskId
              ) ?? context.candidates.find(({ canAdmit }) => canAdmit);
              return next === undefined
                ? { kind: "wait" }
                : { kind: "select", taskId: next.taskId };
            }
          }),
          terminalEffect: defineContextCallback("scheduler.terminal", {
            contextNeeds: ["execution"],
            callback(terminal) {
              settledTaskCount = terminal.execution.settledTasks.length;
            }
          })
        };
      }
    })
  }
});

const definition = defineConfig({
  checks: [scheduledCheck("first"), scheduledCheck("second")],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: { admissionPolicy: strategy, maxParallel: 1 }
});

const result = await run(definition);
if (result.kind !== "completed" || settledTaskCount !== 2 || executionOrder.join(",") !== "second,first") {
  throw new Error("Expected a completed Run and terminal execution facts for both Checks");
}
// #endregion package-api-example:prepared-custom-admission-policy
