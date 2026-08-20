import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checksForProfile } from "./index.ts";

const fullOnlyCommands = [
  { id: "quality-full-check", args: ["scripts/quality/index.ts"] },
  { id: "product-tests", args: ["scripts/development/test.ts", "product"] },
  {
    id: "toolkit-foundation-typecheck",
    args: ["run", "--cwd", "scripts/tools/foundation", "typecheck"]
  },
  {
    id: "toolkit-foundation-lint",
    args: ["run", "--cwd", "scripts/tools/foundation", "lint"]
  },
  {
    id: "toolkit-foundation-format-check",
    args: ["run", "--cwd", "scripts/tools/foundation", "format", "--", "check"]
  },
  {
    id: "toolkit-foundation-tests",
    args: ["run", "--cwd", "scripts/tools/foundation", "test"]
  }
] as const;

const candidatePreparationArgs = [
  "exec",
  "--",
  "bun",
  "scripts/package-candidate/prepare.ts"
] as const;

describe("workspace verifier profiles", () => {
  it("keeps full-only product and toolkit package gates explicit", () => {
    const requiredChecks = checksForProfile("required");
    const fullChecksById = new Map(checksForProfile("full").map((check) => [check.id, check]));

    for (const requiredCheck of requiredChecks) {
      if (requiredCheck.id !== "quality-quick-check") {
        assert.ok(fullChecksById.has(requiredCheck.id), `full profile omits ${requiredCheck.id}`);
      }
    }
    assert.equal(fullChecksById.has("quality-quick-check"), false);

    for (const expected of fullOnlyCommands) {
      assert.equal(
        requiredChecks.some((check) => check.id === expected.id),
        false
      );
      const check = fullChecksById.get(expected.id);
      assert.ok(check, `full profile omits ${expected.id}`);
      assert.equal(check.command, "bun");
      assert.deepEqual(check.args, expected.args);
    }
  });

  it("prepares the package candidate before every repository package consumer", () => {
    const requiredChecksById = new Map(
      checksForProfile("required").map((check) => [check.id, check])
    );
    const fullChecksById = new Map(checksForProfile("full").map((check) => [check.id, check]));

    const preparation = requiredChecksById.get("candidate-preparation");
    assert.ok(preparation);
    assert.equal(preparation.command, "mise");
    assert.deepEqual(preparation.args, candidatePreparationArgs);

    for (const consumerId of [
      "typecheck-scripts",
      "test-evidence",
      "quality-quick-check"
    ] as const) {
      assert.ok(
        requiredChecksById.get(consumerId)?.dependsOn.includes("candidate-preparation"),
        `${consumerId} must wait for candidate preparation`
      );
    }
    assert.ok(
      fullChecksById.get("quality-full-check")?.dependsOn.includes("candidate-preparation"),
      "quality-full-check must wait for candidate preparation"
    );
  });
});
