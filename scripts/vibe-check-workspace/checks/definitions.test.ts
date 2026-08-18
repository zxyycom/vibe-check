import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checksForProfile } from "./index.ts";

const fullOnlyCommands = [
  { id: "quality-full-check", args: ["scripts/quality/scan.ts"] },
  { id: "product-tests", args: ["run", "test:product"] },
  { id: "toolkit-foundation-typecheck", args: ["run", "toolkit:foundation:typecheck"] },
  { id: "toolkit-foundation-lint", args: ["run", "toolkit:foundation:lint"] },
  {
    id: "toolkit-foundation-format-check",
    args: ["run", "toolkit:foundation:format:check"]
  },
  { id: "toolkit-foundation-tests", args: ["run", "toolkit:foundation:test"] }
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
});
