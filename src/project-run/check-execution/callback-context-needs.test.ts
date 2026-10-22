import assert from "node:assert/strict";
import { it } from "node:test";
import { createCoreCheckSession } from "../../check-settlement/session.ts";
import type { CheckExecutionContext } from "../../check/check.ts";
import { defineContextCallback } from "../../package-tools/context-callback/define-context-callback.ts";
import { createProjectContextSource } from "../project-context.ts";
import { executeCheckCallback } from "./callback.ts";
import { prepareCheck } from "./preparation.ts";
import { normalized, PROJECT } from "./resolved-checks.test-support.ts";
import { NO_DEPENDENCIES } from "../../package-checks/check-execution.test-support.ts";

it("produces Check capabilities only on demand and keeps cancellation independent of empty context", async () => {
  for (const needs of [
    [],
    ["signal"],
    ["project"],
    ["dependencies"],
    ["artifactDirectory"],
    ["records"],
    ["project", "records", "signal"]
  ] as const) {
    let projectReads = 0,
      dependencyReads = 0,
      artifactReads = 0,
      reporterWrappers = 0;
    let contextSeen: object | undefined;
    const contextSource = createProjectContextSource(PROJECT);
    const project = {
      flags: PROJECT.flags,
      getContext() {
        projectReads++;
        return contextSource.getContext();
      }
    };
    const callback = defineContextCallback("check.execute", {
      contextNeeds: needs,
      callback(options, context) {
        assert.deepEqual(options, {});
        contextSeen = context;
        return { status: "passed", data: {} };
      }
    });
    const check = normalized(callback);
    const session = createCoreCheckSession([{ definition: check.definition }]);
    const scope = session.openCheckScope(check.definition.checkId);
    const originalFreeze = Object.freeze;
    Object.freeze = (target: object) => {
      if (Object.hasOwn(target, "report")) reporterWrappers++;
      return originalFreeze(target);
    };
    // Reporter allocation is synchronous. Restore the global seam before awaiting user work.
    let pending: ReturnType<typeof executeCheckCallback>;
    try {
      pending = executeCheckCallback({
        check,
        scope,
        project,
        signal: new AbortController().signal,
        invocationId: "probe",
        get artifactDirectory() {
          artifactReads++;
          return null;
        },
        get dependencies() {
          dependencyReads++;
          return NO_DEPENDENCIES;
        }
      });
    } finally {
      Object.freeze = originalFreeze;
    }
    const result = await pending;
    assert.equal(result.source, "author");
    assert.deepEqual(Object.keys(contextSeen!).sort(), [...needs].sort());
    assert.equal(Object.isFrozen(contextSeen), true);
    assert.equal(projectReads, needs.some((field) => field === "project") ? 1 : 0);
    assert.equal(dependencyReads, needs.some((field) => field === "dependencies") ? 1 : 0);
    assert.equal(artifactReads, needs.some((field) => field === "artifactDirectory") ? 1 : 0);
    assert.equal(reporterWrappers, needs.some((field) => field === "records") ? 1 : 0);
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(contextSeen))) {
      assert.equal(Object.hasOwn(descriptor, "get"), false);
      assert.equal(descriptor.writable, false);
    }
  }
  const controller = new AbortController();
  let calls = 0;
  const empty = normalized(() => {
    calls++;
    controller.abort();
    return { status: "passed", data: {} };
  });
  const session = createCoreCheckSession([{ definition: empty.definition }]);
  const result = await executeCheckCallback({
    check: empty,
    scope: session.openCheckScope(empty.definition.checkId),
    project: createProjectContextSource(PROJECT),
    signal: controller.signal,
    invocationId: "empty-cancel",
    artifactDirectory: null,
    dependencies: NO_DEPENDENCIES
  });
  assert.equal(calls, 1);
  assert.equal(result.source, "product");
  assert.deepEqual(result.result, {
    status: "unavailable",
    reason: { code: "execution-cancelled" }
  });
});

it("keeps preparation and execution views exact while reusing the Run project and signal", async () => {
  const project = createProjectContextSource(PROJECT);
  const signal = new AbortController().signal;
  const preparationContexts: Readonly<Pick<CheckExecutionContext, "project">>[] = [];
  const executionContexts: Readonly<Pick<CheckExecutionContext, "project" | "signal">>[] = [];
  const check = normalized(
    defineContextCallback("check.execute", {
      contextNeeds: ["project", "signal"],
      callback(_options, context) {
        executionContexts.push(context);
        return { status: "passed", data: {} };
      }
    }),
    {
      prepare: defineContextCallback("check.prepare", {
        contextNeeds: ["project"],
        callback(_options, context) {
          preparationContexts.push(context);
          return { status: "success", preparedOptions: {} };
        }
      })
    }
  );
  const prepared = await prepareCheck({ check, project, signal, diagnosticLogger: undefined });
  assert.equal(prepared.kind, "ready");
  if (prepared.kind !== "ready") assert.fail("expected ready preparation");
  const session = createCoreCheckSession([{ definition: check.definition }]);
  const execution = await executeCheckCallback({
    check: prepared.check,
    project,
    signal,
    scope: session.openCheckScope(check.definition.checkId),
    invocationId: "two-views",
    artifactDirectory: null,
    dependencies: NO_DEPENDENCIES
  });
  assert.equal(execution.source, "author");
  assert.deepEqual(execution.result, { status: "passed", data: {} });
  assert.equal(preparationContexts.length, 1);
  assert.equal(executionContexts.length, 1);
  const preparationContext = preparationContexts[0];
  const executionContext = executionContexts[0];
  assert.ok(preparationContext !== undefined);
  assert.ok(executionContext !== undefined);
  assert.deepEqual(Object.keys(preparationContext), ["project"]);
  assert.deepEqual(Object.keys(executionContext), ["project", "signal"]);
  assert.equal(Object.isFrozen(preparationContext), true);
  assert.equal(Object.isFrozen(executionContext), true);
  assert.equal(Object.isFrozen(preparationContext.project), true);
  assert.equal(executionContext.project, preparationContext.project);
  assert.equal(executionContext.signal, signal);
});
