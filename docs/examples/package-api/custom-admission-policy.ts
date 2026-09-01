// #region package-api-example:custom-admission-policy
import { defineAdmissionPolicy, defineCheck, defineConfig, run } from "@zxyycom/vibe-check";

const executionOrder: string[] = [];

const compile = defineCheck({
  checkId: "compile",
  displayName: "Compile",
  execution() {
    executionOrder.push("compile");
    return { status: "passed", data: {} };
  }
});

const publish = defineCheck({
  admissionPriority: 10,
  checkId: "publish",
  dependsOn: [compile.checkId],
  displayName: "Publish",
  execution() {
    executionOrder.push("publish");
    return { status: "passed", data: {} };
  }
});

const preferPublish = defineAdmissionPolicy({
  kind: "custom",
  proposeAdmission(context) {
    const publishTask = context.graph.tasks.find((task) => task.taskId === publish.checkId);
    const publishCandidate = context.candidates.find(
      (candidate) => candidate.taskId === publish.checkId && candidate.canAdmit
    );
    if (publishTask?.admissionPriority === 10 && publishCandidate !== undefined) {
      return { kind: "select", taskId: publishCandidate.taskId };
    }

    const nextCandidate = context.candidates.find((candidate) => candidate.canAdmit);
    return nextCandidate === undefined
      ? { kind: "wait" }
      : { kind: "select", taskId: nextCandidate.taskId };
  }
});

const definition = defineConfig({
  checks: [compile, publish],
  outputs: {
    diagnosticLogging: { enabled: false },
    machinePublication: { enabled: false },
    progressRendering: { enabled: false }
  },
  scheduler: {
    admissionPolicy: preferPublish,
    maxParallel: 1
  }
});

const result = await run(definition);
if (result.kind !== "completed") throw new Error(`Run did not complete: ${result.kind}`);
if (executionOrder.join(",") !== "compile,publish") {
  throw new Error(`Unexpected execution order: ${executionOrder.join(",")}`);
}
// #endregion package-api-example:custom-admission-policy
