// #region package-api-example:learned-critical-path
import {
  createLearnedCriticalPathStrategy,
  defineCheck,
  defineConfig,
  run
} from "@zxyycom/vibe-check";

function scheduledCheck(checkId: string) {
  return defineCheck({
    checkId,
    displayName: checkId,
    execution: () => ({ status: "passed" as const, data: {} })
  });
}

// 调用方选择不与其它 Run 共用的绝对目录，并负责后续清理；不会从 projectRoot 解析。
const stateDirectory = `/tmp/vibe-check-learned-history-${Date.now()}-${Math.random()}`;
const strategy = createLearnedCriticalPathStrategy({
  stateDirectory,
  identityForTask: (task) => ({
    taskId: task.taskId,
    // 在调用方的 key 中保留所有影响时长可比性的因素。
    implementationVersion: "example-v1"
  }),
  observe(event) {
    // 这是调用方尽力而为的观察点，不是 Product diagnostic channel。
    if (event.kind === "history-unavailable") console.warn(event.reason);
  }
});
const definition = defineConfig({
  checks: [scheduledCheck("first"), scheduledCheck("second")],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: { kind: "custom", strategy },
    maxParallel: 1
  }
});

const first = await run(definition);
const second = await run(definition);
if (first.kind !== "completed" || second.kind !== "completed") {
  throw new Error("Expected both learned strategy Runs to complete");
}
// #endregion package-api-example:learned-critical-path
