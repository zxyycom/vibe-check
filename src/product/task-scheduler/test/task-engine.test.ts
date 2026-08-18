import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph, validateTaskGraph, type TaskGraph, type TaskGraphRun } from "../index.ts";

describe("static task engine", () => {
  it("validates static task identity dependency and scope structure before execution", async () => {
    assert.throws(
      () => validateInvalidTaskGraph({ tasks: [], dependOn: [] }),
      /task graph has unknown property: dependOn/
    );
    assert.throws(
      () =>
        validateInvalidTaskGraph({
          tasks: [{ id: "script-task", command: "bun" }]
        }),
      /task graph tasks\[0\] has unknown property: command/
    );
    assert.throws(
      () =>
        validateInvalidTaskGraph({
          tasks: [{ id: "terminal", scopeId: "scope" }],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: [],
              terminalTaskId: "terminal",
              terminal: "terminal"
            }
          ]
        }),
      /task graph scopes\[0\] has unknown property: terminal/
    );
    assert.throws(
      () => validateTaskGraph({ tasks: [{ id: "same" }, { id: "same" }] }),
      /duplicate task id: same/
    );
    assert.throws(
      () => validateTaskGraph({ tasks: [{ id: "dependent", dependsOn: ["missing"] }] }),
      /task dependent depends on unknown task missing/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [
            { id: "one", dependsOn: ["two"] },
            { id: "two", dependsOn: ["one"] }
          ]
        }),
      /task dependency cycle includes/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "terminal", scopeId: "scope" }],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: ["other"],
              terminalTaskId: "terminal"
            }
          ]
        }),
      /activation task must belong to the scope: other/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [
            { id: "work", scopeId: "scope" },
            { id: "terminal", scopeId: "scope" }
          ],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: ["work"],
              terminalTaskId: "terminal"
            }
          ]
        }),
      /terminal task must depend on scoped task work/
    );
    await assert.rejects(
      () =>
        runTaskGraph({
          graph: {
            tasks: [{ id: "terminal", scopeId: "scope" }],
            scopes: [
              {
                id: "scope",
                maxParallel: 2,
                activationTaskIds: [],
                terminalTaskId: "terminal"
              }
            ]
          },
          maxParallel: 1,
          execute: () => undefined
        }),
      /scope scope maxParallel exceeds task engine maxParallel/
    );
  });

  it("uses one root budget for dependency order and named mutex admission", async () => {
    const events: string[] = [];
    let active = 0;
    let maxActive = 0;
    const graph: TaskGraph = {
      tasks: [
        { id: "base" },
        { id: "dependent", dependsOn: ["base"] },
        { id: "mutex-one", mutex: ["shared"] },
        { id: "mutex-two", mutex: ["shared"] },
        { id: "independent" }
      ]
    };

    const run = await runTaskGraph<string>({
      graph,
      maxParallel: 3,
      execute: async (task) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        events.push(`start:${task.id}`);
        await delay(task.id === "base" ? 10 : 2);
        events.push(`end:${task.id}`);
        active -= 1;
        return task.id;
      }
    });

    assert.equal(maxActive, 3);
    assert.ok(events.indexOf("end:base") < events.indexOf("start:dependent"));
    assert.ok(events.indexOf("end:mutex-one") < events.indexOf("start:mutex-two"));
    assert.deepEqual(completedValues(run), [
      "base",
      "dependent",
      "mutex-one",
      "mutex-two",
      "independent"
    ]);
  });

  it("keeps a scope cap active through terminal settlement and prioritizes its continuation", async () => {
    const events: string[] = [];
    const releaseTerminal = createDeferred<void>();
    const graph: TaskGraph = {
      tasks: [
        { id: "limited-work", scopeId: "limited" },
        { id: "limited-terminal", dependsOn: ["limited-work"], scopeId: "limited" },
        { id: "wide-one" },
        { id: "wide-two" }
      ],
      scopes: [
        {
          id: "limited",
          maxParallel: 1,
          activationTaskIds: ["limited-work"],
          terminalTaskId: "limited-terminal"
        }
      ]
    };

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "limited-terminal") {
          await releaseTerminal.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("start:limited-terminal"));
    assert.equal(events.includes("start:wide-one"), false);
    assert.equal(events.includes("start:wide-two"), false);
    releaseTerminal.resolve();
    await running;
    assert.ok(events.indexOf("end:limited-terminal") < events.indexOf("start:wide-one"));
  });

  it("uses the minimum active cap and reserves capacity for a newly ready tighter scope", async () => {
    const events: string[] = [];
    const releaseWide = createDeferred<void>();
    const releaseLow = createDeferred<void>();
    const graph: TaskGraph = {
      tasks: [
        { id: "gate" },
        { id: "wide-one", scopeId: "wide" },
        { id: "wide-two", scopeId: "wide" },
        { id: "wide-terminal", dependsOn: ["wide-one", "wide-two"], scopeId: "wide" },
        { id: "low", dependsOn: ["gate"], scopeId: "low" }
      ],
      scopes: [
        {
          id: "wide",
          maxParallel: 2,
          activationTaskIds: ["wide-one", "wide-two"],
          terminalTaskId: "wide-terminal"
        },
        {
          id: "low",
          maxParallel: 1,
          activationTaskIds: ["low"],
          terminalTaskId: "low"
        }
      ]
    };

    const running = runTaskGraph({
      graph,
      maxParallel: 2,
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "gate") {
          await waitFor(() => events.includes("start:wide-one"));
        }
        if (task.id === "wide-one") {
          await releaseWide.promise;
        }
        if (task.id === "low") {
          await releaseLow.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("end:gate"));
    await delay(2);
    assert.equal(events.includes("start:wide-two"), false);
    assert.equal(events.includes("start:low"), false);
    releaseWide.resolve();
    await waitFor(() => events.includes("start:low"));
    assert.equal(events.includes("start:wide-two"), false);
    releaseLow.resolve();
    await running;
    assert.ok(events.indexOf("start:low") < events.indexOf("start:wide-two"));
  });

  it("does not activate a cap for a scope with no activation task", async () => {
    const started: string[] = [];
    const release = createDeferred<void>();
    const graph: TaskGraph = {
      tasks: [{ id: "zero-terminal", scopeId: "zero" }, { id: "wide-one" }, { id: "wide-two" }],
      scopes: [
        {
          id: "zero",
          maxParallel: 1,
          activationTaskIds: [],
          terminalTaskId: "zero-terminal"
        }
      ]
    };

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      execute: async (task) => {
        started.push(task.id);
        await release.promise;
        return task.id;
      }
    });

    await waitFor(() => started.length === 3);
    assert.deepEqual([...started].sort(), ["wide-one", "wide-two", "zero-terminal"]);
    release.resolve();
    await running;
  });

  it("settles executor failures and blocks only their dependent tasks", async () => {
    const calls: string[] = [];
    const run = await runTaskGraph<string>({
      graph: {
        tasks: [{ id: "failure" }, { id: "blocked", dependsOn: ["failure"] }, { id: "independent" }]
      },
      maxParallel: 2,
      execute: (task) => {
        calls.push(task.id);
        if (task.id === "failure") {
          throw new Error("task failure");
        }
        return task.id;
      }
    });

    assert.deepEqual(calls.sort(), ["failure", "independent"]);
    assert.equal(settlementFor(run, "failure").kind, "failed");
    assert.deepEqual(settlementFor(run, "blocked"), {
      kind: "blocked",
      dependencyIds: ["failure"]
    });
    assert.deepEqual(settlementFor(run, "independent"), {
      kind: "completed",
      value: "independent"
    });
  });

  it("stops new admission after abort while admitted work receives the same signal and drains", async () => {
    const controller = new AbortController();
    const started: string[] = [];
    let observedSignal: AbortSignal | undefined;
    const graph: TaskGraph = {
      tasks: [{ id: "started" }, { id: "pending-one" }, { id: "pending-two" }]
    };

    const running = runTaskGraph({
      graph,
      maxParallel: 1,
      signal: controller.signal,
      execute: async (task, context) => {
        started.push(task.id);
        observedSignal = context.signal;
        await waitFor(() => context.signal?.aborted === true);
        return task.id;
      }
    });

    await waitFor(() => started.includes("started"));
    controller.abort();
    const run = await running;

    assert.equal(observedSignal, controller.signal);
    assert.deepEqual(started, ["started"]);
    assert.equal(run.cancelled, true);
    assert.deepEqual(settlementFor(run, "started"), { kind: "completed", value: "started" });
    assert.deepEqual(settlementFor(run, "pending-one"), { kind: "cancelled-before-start" });
    assert.deepEqual(settlementFor(run, "pending-two"), { kind: "cancelled-before-start" });
  });
});

function completedValues(run: TaskGraphRun<string>): string[] {
  return run.settlements.flatMap(({ settlement }) =>
    settlement.kind === "completed" ? [settlement.value] : []
  );
}

function validateInvalidTaskGraph(graph: unknown): void {
  validateTaskGraph(graph);
}

function settlementFor<TResult>(run: TaskGraphRun<TResult>, taskId: string) {
  const item = run.settlements.find(({ task }) => task.id === taskId);
  assert.ok(item, `expected settlement for ${taskId}`);
  return item.settlement;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

interface Deferred<TResult> {
  readonly promise: Promise<TResult>;
  readonly resolve: (value: TResult | PromiseLike<TResult>) => void;
}

function createDeferred<TResult>(): Deferred<TResult> {
  let resolve: ((value: TResult | PromiseLike<TResult>) => void) | undefined;
  const promise = new Promise<TResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  if (resolve === undefined) {
    throw new Error("failed to initialize deferred promise");
  }
  return { promise, resolve };
}

async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("condition timed out");
    }
    await delay(1);
  }
}
