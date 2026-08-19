import assert from "node:assert/strict";

import type { TaskGraph, TaskGraphRun } from "../index.ts";

export function rootBudgetGraph(): TaskGraph {
  return {
    tasks: [
      { id: "base" },
      { id: "dependent", dependsOn: ["base"] },
      { id: "mutex-one", mutex: ["shared"] },
      { id: "mutex-two", mutex: ["shared"] },
      { id: "independent" }
    ]
  };
}

export function continuationPriorityGraph(): TaskGraph {
  return {
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
}

export function tighteningScopeGraph(): TaskGraph {
  return {
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
}

export function noActivationGraph(): TaskGraph {
  return {
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
}

export function failureGraph(): TaskGraph {
  return {
    tasks: [{ id: "failure" }, { id: "blocked", dependsOn: ["failure"] }, { id: "independent" }]
  };
}

export function cancellationGraph(): TaskGraph {
  return {
    tasks: [{ id: "started" }, { id: "pending-one" }, { id: "pending-two" }]
  };
}

export function completedValues(run: TaskGraphRun<string>): string[] {
  return run.settlements.flatMap(({ settlement }) =>
    settlement.kind === "completed" ? [settlement.value] : []
  );
}

export function settlementFor<TResult>(run: TaskGraphRun<TResult>, taskId: string) {
  const item = run.settlements.find(({ task }) => task.id === taskId);
  assert.ok(item, `expected settlement for ${taskId}`);
  return item.settlement;
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export interface Deferred<TResult> {
  readonly promise: Promise<TResult>;
  readonly resolve: (value: TResult | PromiseLike<TResult>) => void;
}

export function createDeferred<TResult>(): Deferred<TResult> {
  let resolve: ((value: TResult | PromiseLike<TResult>) => void) | undefined;
  const promise = new Promise<TResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  if (resolve === undefined) {
    throw new Error("failed to initialize deferred promise");
  }
  return { promise, resolve };
}

export async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("condition timed out");
    }
    await delay(1);
  }
}
