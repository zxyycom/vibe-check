import assert from "node:assert/strict";

import type { CheckAggregation } from "./controls/contract.ts";
import { definition, PASSED } from "./check-facts-integration.test-support.ts";
import { run } from "./run.ts";

/** Proves that effective aggregation reads the same private flag dependency selection as execution. */
export async function assertEffectiveFlagSelectionAggregation(): Promise<void> {
  const calls: string[] = [];
  const source = definition([
    {
      checkId: "always",
      displayName: "Always",
      execution: () => {
        calls.push("always");
        return PASSED;
      }
    },
    {
      checkId: "deferred",
      displayName: "Deferred",
      enabledByFlags: { flags: ["deferred"], mode: "all" },
      execution: () => {
        calls.push("deferred");
        return PASSED;
      }
    },
    {
      checkId: "provider",
      displayName: "Provider",
      enabledByFlags: { flags: ["provider"], mode: "all" },
      execution: () => {
        calls.push("provider");
        return PASSED;
      }
    },
    {
      checkId: "root",
      displayName: "Root",
      dependsOn: ["provider"],
      enabledByFlags: { flags: ["root"], mode: "all", propagateDependsOn: true },
      execution: () => {
        calls.push("root");
        return PASSED;
      }
    }
  ]);

  const effective = await run(source, {
    flags: ["root"],
    checkAggregation: effectiveAggregation("effective", "not-applicable")
  });
  assert.equal(effective.kind, "completed");
  if (effective.kind !== "completed") return;
  assert.equal(effective.aggregate, "passed");
  assert.equal("effectiveCheckIds" in effective, false);
  assert.deepEqual([...calls].sort(), ["always", "provider", "root"]);

  const all = await run(source, {
    flags: ["root"],
    checkAggregation: effectiveAggregation("all", "not-applicable")
  });
  assert.equal(all.kind, "completed");
  if (all.kind === "completed") assert.equal(all.aggregate, "failed");

  const explicit = await run(source, {
    flags: ["root"],
    checkAggregation: effectiveAggregation(["root"], "failed")
  });
  assert.equal(explicit.kind, "completed");
  if (explicit.kind === "completed") assert.equal(explicit.aggregate, "passed");

  const empty = await run(
    definition([
      {
        checkId: "deferred",
        displayName: "Deferred",
        enabledByFlags: { flags: ["deferred"], mode: "all" },
        execution: () => PASSED
      }
    ]),
    { checkAggregation: effectiveAggregation("effective", "not-applicable") }
  );
  assert.equal(empty.kind, "completed");
  if (empty.kind === "completed") assert.equal(empty.aggregate, "not-applicable");
}

function effectiveAggregation(
  checks: CheckAggregation["checks"],
  empty: CheckAggregation["empty"]
): CheckAggregation {
  return Object.freeze({
    checks,
    mode: "all",
    unavailable: "propagate",
    notApplicable: "fail",
    empty
  });
}
