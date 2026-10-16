import { defineCheck } from "../../check/check.ts";
import assert from "node:assert/strict";
import { it } from "node:test";
import { defineContextCallback } from "./define-context-callback.ts";
import type { ContextCallbackInput } from "../../data-boundary/context-callback.ts";
import type { CheckResult, DeepReadonly } from "../../check/check.ts";

it("preserves business input and selected context types across callback phases", () => {
  const descriptor = { contextNeeds: ["graph"] as const, callback: () => undefined };
  assert.equal(defineContextCallback("scheduler.terminal", descriptor), descriptor);
  const execute = defineContextCallback("check.execute", {
    contextNeeds: ["signal", "records"],
    callback(options: { readonly limit: number }, context) {
      context.records.report({ id: "limit" }, { limit: options.limit });
      return { status: "passed", data: { limit: options.limit } };
    }
  });
  const slot: ContextCallbackInput<
    [DeepReadonly<{ limit: number }>],
    { signal: AbortSignal; records: { report(identity: { id: string }, data: object): void } },
    CheckResult
  > = execute;
  assert.equal(typeof slot, "object");
  assert.equal(
    execute.callback(
      { limit: 4 },
      { signal: new AbortController().signal, records: { report() {} } }
    ).data.limit,
    4
  );
  const prepare = defineContextCallback("check.prepare", {
    contextNeeds: ["project"],
    callback(options: { readonly value: string }, { project }) {
      return {
        status: "success",
        preparedOptions: { length: options.value.length, root: project.root }
      };
    }
  });
  void prepare;
  const decide = defineContextCallback("scheduler.decide", {
    contextNeeds: ["candidates"],
    callback({ candidates }) {
      const next = candidates.find((candidate) => candidate.canAdmit);
      return next === undefined ? { kind: "wait" } : { kind: "select", taskId: next.taskId };
    }
  });
  defineContextCallback("scheduler.prepare", {
    contextNeeds: ["graph"],
    callback({ graph }) {
      void graph.tasks;
      return { decide };
    }
  });
  defineContextCallback("scheduler.terminal", {
    contextNeeds: ["taskTimings", "runMeasurement"],
    callback({ taskTimings, runMeasurement }) {
      void [taskTimings.timing, runMeasurement.peaks];
    }
  });
  defineContextCallback("command.environment", {
    contextNeeds: ["project"],
    callback(options, { project }) {
      return { mode: "exact", variables: { ROOT: project.root, EXE: options.executable } };
    }
  });
  defineContextCallback("command.complete", {
    contextNeeds: ["records"],
    callback({ options, command }, { records }) {
      records.report({ id: "done" }, { executable: options.executable });
      return { status: "passed", data: { code: command.exitCode } };
    }
  });
});

function negativeTypes() {
  defineContextCallback("check.execute", {
    contextNeeds: ["signal"],
    callback(_options, context) {
      // @ts-expect-error Unrequested project is absent.
      void context.project;
      return { status: "passed", data: {} };
    }
  });
  defineContextCallback("check.execute", {
    callback(_options, context) {
      const defaultOptions: typeof _options = {};
      void defaultOptions;
      // @ts-expect-error Default context is empty.
      void context.signal;
      return { status: "passed", data: {} };
    }
  });
  // @ts-expect-error Different phase's field is illegal.
  defineContextCallback("check.prepare", {
    contextNeeds: ["records"],
    callback: () => ({ status: "success", preparedOptions: {} })
  });
  defineContextCallback("scheduler.decide", {
    // @ts-expect-error Decision cannot be async.
    contextNeeds: [],
    // @ts-expect-error Decision cannot be async.
    callback: async () => ({ kind: "wait" })
  });
  const widened: readonly ("graph" | "execution")[] = ["graph"];
  defineContextCallback("scheduler.terminal", {
    contextNeeds: widened,
    callback(context) {
      // @ts-expect-error Widened arrays guarantee no field.
      void context.graph;
    }
  });
}
void negativeTypes;

function typeInvariants() {
  const unionToken: readonly ["graph" | "execution"] = ["graph"];
  defineContextCallback("scheduler.terminal", {
    contextNeeds: unionToken,
    callback(context) {
      // @ts-expect-error A union token guarantees neither field.
      void context.graph;
    }
  });
  function sharedHead(needs: readonly ["graph"] | readonly ["graph", "execution"]) {
    return defineContextCallback("scheduler.terminal", {
      contextNeeds: needs,
      callback(context) {
        void context.graph;
        // @ts-expect-error The optional union tail is not guaranteed.
        void context.execution;
      }
    });
  }
  function reordered(needs: readonly ["graph", "execution"] | readonly ["execution", "graph"]) {
    return defineContextCallback("scheduler.terminal", {
      contextNeeds: needs,
      callback(context) {
        // @ts-expect-error Neither tuple position guarantees graph across both branches.
        void context.graph;
      }
    });
  }
  void [sharedHead, reordered];
}
void typeInvariants;

function nestedCheckInvariants() {
  const prepared = defineCheck({
    checkId: "prepared-descriptor",
    displayName: "Prepared descriptor",
    options: { text: "input" },
    prepare: defineContextCallback("check.prepare", {
      contextNeeds: ["signal"],
      callback(options: { readonly text: string }, { signal }) {
        void signal.aborted;
        return { status: "success", preparedOptions: { length: options.text.length } };
      }
    }),
    execute: defineContextCallback("check.execute", {
      contextNeeds: ["records"],
      callback(options: { readonly length: number }, { records }) {
        records.report({ id: "length" }, { length: options.length });
        return { status: "passed", data: { length: options.length } };
      }
    })
  });
  const provider = defineCheck({
    checkId: "context-handoff-provider",
    displayName: "Context handoff provider",
    handoff: true,
    execute: defineContextCallback("check.execute", {
      contextNeeds: ["signal"],
      callback(_options, { signal }) {
        void signal.aborted;
        return { status: "passed", data: { count: 1 }, handoff: new Map<string, Uint8Array>() };
      }
    })
  });
  const typed = defineCheck({
    checkId: "context-typed-provider",
    displayName: "Context typed provider",
    parseData: (data) => ({ count: Number(data.count) }),
    execute: defineContextCallback("check.execute", {
      contextNeeds: [],
      callback() {
        return { status: "passed", data: { count: 1 } };
      }
    })
  });
  defineCheck({
    checkId: "context-dependent",
    displayName: "Context dependent",
    dependsOn: [provider.checkId],
    execute: defineContextCallback("check.execute", {
      contextNeeds: ["dependencies"],
      callback(_options, { dependencies }) {
        const read = dependencies.get(provider);
        if (read.ok) {
          const id: "context-handoff-provider" = read.checkId;
          const bytes: Uint8Array | undefined = read.handoff.get("bytes");
          void [id, bytes];
        }
        return { status: "not-applicable" };
      }
    })
  });
  void [prepared, typed];
}
void nestedCheckInvariants;

function strictStoredContext() {
  const implicitFull: import("../../check/check.ts").Check = {
    checkId: "implicit-full-rejected",
    displayName: "Implicit full rejected",
    // @ts-expect-error Plain functions have no declared injected fields, even with an explicit parameter annotation.
    execute: (_options: object, context: import("../../check/check.ts").CheckExecutionContext) => {
      void context.signal;
      return { status: "passed", data: {} };
    }
  };
  void implicitFull;
}
void strictStoredContext;
