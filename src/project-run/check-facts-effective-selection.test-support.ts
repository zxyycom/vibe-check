import assert from "node:assert/strict";

import { definition, PASSED } from "./check-facts-integration.test-support.ts";
import { run } from "./run.ts";

/** Proves aggregation receives the same private flag dependency selection that executes. */
export async function assertEffectiveFlagSelectionAggregation(): Promise<void> {
  const calls: string[] = [];
  const source = definition([
    {
      checkId: "always",
      displayName: "Always",
      execute: () => {
        calls.push("always");
        return PASSED;
      }
    },
    {
      checkId: "deferred",
      displayName: "Deferred",
      enabledByFlags: { when: "deferred" },
      execute: () => {
        calls.push("deferred");
        return PASSED;
      }
    },
    {
      checkId: "provider",
      displayName: "Provider",
      enabledByFlags: { when: "provider" },
      execute: () => {
        calls.push("provider");
        return PASSED;
      }
    },
    {
      checkId: "root",
      displayName: "Root",
      dependsOn: ["provider"],
      enabledByFlags: { when: "root", propagateDependsOn: true },
      execute: () => {
        calls.push("root");
        return PASSED;
      }
    }
  ]);

  let selectedCheckIds: readonly string[] | undefined;
  const effective = await run(source, {
    flags: ["root"],
    checkAggregation: (checks) => {
      selectedCheckIds = checks.map((check) => check.checkId);
      return "passed";
    }
  });
  assert.equal(effective.kind, "completed");
  if (effective.kind !== "completed") return;
  assert.equal(effective.aggregate, "passed");
  assert.equal("effectiveCheckIds" in effective, false);
  assert.deepEqual([...calls].sort(), ["always", "provider", "root"]);
  assert.deepEqual(selectedCheckIds, ["always", "provider", "root"]);

  const empty = await run(
    definition([
      {
        checkId: "deferred",
        displayName: "Deferred",
        enabledByFlags: { when: "deferred" },
        execute: () => PASSED
      }
    ])
  );
  assert.equal(empty.kind, "completed");
  if (empty.kind === "completed") assert.equal(empty.aggregate, "failed");
}
