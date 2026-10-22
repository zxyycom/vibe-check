import assert from "node:assert/strict";
import { describe, it } from "node:test";

import micromatch from "micromatch";
import { lintInvocation } from "./lint.ts";
import { workspaceFormatInvocation } from "./format.ts";

describe("development quality target boundaries", () => {
  it("excludes only generated function-analyzer oracle fixtures from product lint and format", () => {
    assert.deepEqual(lintInvocation("product").args, [
      "x",
      "--no-install",
      "oxlint",
      "--deny-warnings",
      "--ignore-pattern=src/package-checks/function-metrics/analyzer/fixtures/**",
      "src"
    ]);
    assert.deepEqual(lintInvocation("scripts", "json").args, [
      "x",
      "--no-install",
      "oxlint",
      "--deny-warnings",
      "--format=json",
      "scripts"
    ]);
    const invocation = workspaceFormatInvocation("list-different");
    assert.deepEqual(invocation.args.slice(0, 4), [
      "x",
      "--no-install",
      "oxfmt",
      "--list-different"
    ]);
    const targets = invocation.args.slice(4);
    assert.deepEqual(
      targets.filter((target) => target.startsWith("!")),
      ["!src/package-checks/function-metrics/analyzer/fixtures/**"]
    );
    assert.deepEqual(
      micromatch(
        [
          "src/index.ts",
          "src/package-checks/function-metrics/constructor.ts",
          "src/package-checks/function-metrics/analyzer/readers/golike.ts",
          "src/package-checks/function-metrics/analyzer/fixtures/golang/normal.ts",
          "scripts/development/format.ts"
        ],
        targets
      ),
      [
        "src/index.ts",
        "src/package-checks/function-metrics/constructor.ts",
        "src/package-checks/function-metrics/analyzer/readers/golike.ts",
        "scripts/development/format.ts"
      ]
    );
    assert.equal(workspaceFormatInvocation("check").args[3], "--check");
  });
});
