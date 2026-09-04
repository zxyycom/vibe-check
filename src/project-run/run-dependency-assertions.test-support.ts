import assert from "node:assert/strict";

import { type DependencyReadResult, inherit } from "../check/check.ts";
import { run } from "./run.ts";
import { check, definition, PASSED } from "./run-fixtures.test-support.ts";

export async function assertUnavailableDependencyRead(): Promise<void> {
  let dependentCalls = 0;
  let read: DependencyReadResult | undefined;
  const result = await run(
    definition([
      check({ checkId: "unavailable", execution: unavailableSource }),
      check({
        checkId: "dependent",
        observes: ["unavailable"],
        execution: (context) => {
          dependentCalls += 1;
          read = context.dependencies.get("unavailable");
          return read.ok ? PASSED : { status: "unavailable", reason: { code: read.error.code } };
        }
      })
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.equal(dependentCalls, 1);
  assert.deepEqual(read, {
    ok: false,
    error: { code: "upstream-data-unavailable", checkId: "unavailable", status: "unavailable" }
  });
  assertUnavailableDependencySnapshot(result);
}

export async function assertInheritedDependencyRead(): Promise<void> {
  let inheritedRead: DependencyReadResult | undefined;
  const result = await run(
    definition([
      check({
        checkId: "inherited-source",
        execution: () => ({ status: "passed", data: { inherited: true } })
      }),
      inheritedContainer((read) => {
        inheritedRead = read;
      })
    ])
  );
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") return;
  assert.deepEqual(inheritedRead, {
    ok: true,
    checkId: "inherited-source",
    status: "passed",
    data: { inherited: true }
  });
  const outcome = result.snapshot.checks.find(
    (coreCheck) => coreCheck.checkId === "inherited-source"
  )?.outcome;
  if (inheritedRead?.ok && outcome?.status === "passed")
    assert.equal(inheritedRead.data, outcome.data);
}

function unavailableSource() {
  return { status: "unavailable" as const, reason: { code: "source-unavailable" } };
}

function assertUnavailableDependencySnapshot(
  result: Extract<Awaited<ReturnType<typeof run>>, { kind: "completed" }>
): void {
  assert.deepEqual(
    result.snapshot.checks.map(({ checkId, outcome }) => ({ checkId, outcome })),
    [
      {
        checkId: "dependent",
        outcome: { status: "unavailable", reason: { code: "upstream-data-unavailable" } }
      },
      {
        checkId: "unavailable",
        outcome: { status: "unavailable", reason: { code: "source-unavailable" } }
      }
    ]
  );
}

function inheritedContainer(setRead: (read: DependencyReadResult) => void) {
  return {
    checkId: "container",
    displayName: "Container",
    dependsOn: inherit({ add: ["inherited-source"] }),
    checks: [
      check({
        checkId: "inherited-dependent",
        execution: (context) => {
          const read = context.dependencies.get("inherited-source");
          setRead(read);
          return { status: "passed", data: { dependent: true } };
        }
      })
    ]
  };
}
