import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GENERATED_FUNCTION_METRICS_ANALYZER_FIXTURES,
  workspaceFormatTargets
} from "./format-targets.ts";
import { lintInvocation } from "./lint.ts";

describe("development quality target boundaries", () => {
  it("excludes only generated function-analyzer oracle fixtures from product lint and format", () => {
    assert.deepEqual(lintInvocation("product").args, [
      "x",
      "--no-install",
      "oxlint",
      "--deny-warnings",
      `--ignore-pattern=${GENERATED_FUNCTION_METRICS_ANALYZER_FIXTURES}`,
      "src"
    ]);
    assert.deepEqual(
      workspaceFormatTargets.filter((target) => target.startsWith("!")),
      [`!${GENERATED_FUNCTION_METRICS_ANALYZER_FIXTURES}`]
    );
  });
});
