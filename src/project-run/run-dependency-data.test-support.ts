import assert from "node:assert/strict";

import type { DependencyObservation } from "../check/check.ts";
import { run } from "./run.ts";
import { check, definition } from "./run.test-support.ts";

export async function assertInheritedDependencyList(): Promise<void> {
  let observedList: readonly DependencyObservation[] | undefined;
  const result = await run(
    definition([
      check({
        checkId: "inherited-list-alpha",
        execution: () => ({ status: "passed", data: { source: "alpha" } })
      }),
      check({
        checkId: "inherited-list-omega",
        execution: () => ({ status: "failed", data: { source: "omega" } })
      }),
      {
        checkId: "inherited-list-container",
        displayName: "Inherited list container",
        observes: ["inherited-list-omega", "inherited-list-alpha"],
        checks: [
          check({
            checkId: "inherited-list-dependent",
            execution: ({ dependencies }) => {
              observedList = dependencies.list();
              return { status: "passed", data: { dependent: true } };
            }
          })
        ]
      }
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(observedList, [
    { checkId: "inherited-list-alpha", outcome: { status: "passed", data: { source: "alpha" } } },
    { checkId: "inherited-list-omega", outcome: { status: "failed", data: { source: "omega" } } }
  ]);
  assert.equal(Object.isFrozen(observedList), true);
  for (const observation of observedList ?? []) {
    assert.equal(Object.isFrozen(observation), true);
    assert.equal(Object.isFrozen(observation.outcome), true);
  }
}
