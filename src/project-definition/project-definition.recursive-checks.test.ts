import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defineCheck, type Check } from "../check/check.ts";
import { defineConfig, normalizeProjectDefinition } from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { run } from "../project-run/run.ts";
import { passed } from "./project-definition.test-support.ts";

describe("Project Definition", () => {
  it("rejects cyclic and repeated executable declarations before shared expansion", async () => {
    let calls = 0;
    const execute = () => {
      calls += 1;
      return passed();
    };
    for (const depth of [3, 8, 16]) {
      let visits = 0;
      const counted = (value: Check): Check =>
        new Proxy(value, {
          ownKeys(target) {
            visits += 1;
            return Reflect.ownKeys(target);
          }
        });
      let shared = counted({ checkId: "shared", displayName: "Shared", execute });
      for (let index = 0; index < depth; index += 1) {
        shared = counted({
          checkId: `container-${index}`,
          displayName: "Container",
          checks: [shared, shared]
        });
      }
      const result = await run(defineConfig({ checks: [shared] }));
      assert.equal(result.kind, "configuration");
      if (result.kind !== "configuration") throw new Error("Expected configuration failure");
      assert.deepEqual(result.diagnostic, {
        kind: "invalid-project-definition",
        path: "definition.checks",
        reason: "invalid-value"
      });
      assert.equal(visits, depth + 2);
    }
    const duplicate = { checkId: "same-id", displayName: "Duplicate", execute };
    const duplicateDefinition = defineConfig({ checks: [duplicate, { ...duplicate }] });
    assert.equal(validateProjectDefinition(duplicateDefinition).ok, false);
    assert.throws(() => normalizeProjectDefinition(duplicateDefinition), TypeError);
    const duplicateRun = await run(duplicateDefinition);
    assert.equal(duplicateRun.kind, "configuration");
    for (const indirect of [false, true]) {
      const children: Check[] = [];
      const cyclic: Check = { checkId: "cycle", displayName: "Cycle", checks: children };
      children.push(
        indirect ? { checkId: "child", displayName: "Child", checks: [cyclic] } : cyclic
      );
      const cyclicDefinition = defineConfig({ checks: [cyclic] });
      assert.equal(validateProjectDefinition(cyclicDefinition).ok, false);
      assert.throws(() => normalizeProjectDefinition(cyclicDefinition), TypeError);
      assert.equal((await run(cyclicDefinition)).kind, "configuration");
    }
    assert.equal(calls, 0);
  });

  it("preserves shared container occurrences and warning paths", () => {
    const shared = { checkId: "container", displayName: "Container" };
    const result = validateProjectDefinition(
      defineConfig({
        checks: [
          shared,
          { checkId: "group", displayName: "Group", checks: [shared] },
          defineCheck({ checkId: "container", displayName: "Executable", execute: passed })
        ]
      })
    );
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("Expected valid container occurrences");
    assert.deepEqual(result.warnings, [
      { code: "meaningless-check", path: "definition.checks[0]", checkId: "container" },
      {
        code: "meaningless-check",
        path: "definition.checks[1].checks[0]",
        checkId: "container"
      }
    ]);
    assert.equal(normalizeProjectDefinition(result.value).checks.length, 1);
  });

  it("normalizes ordinary recursive Checks without a Record catalog", () => {
    const child = defineCheck({
      checkId: "child-check",
      displayName: "Child check",
      options: { maximum: 3 },
      prepare: (preparedOptions) => ({ status: "success", preparedOptions }),
      execute({ options }) {
        assert.equal(options.maximum, 3);
        return passed();
      }
    });
    const parent = defineCheck({
      checkId: "parent-check",
      displayName: "Parent check",
      dependsOn: ["prepare"],
      mutex: ["analysis"],
      observes: ["release-status"],
      execute: passed,
      checks: [child]
    });
    const informationRoot = {
      checkId: "repository-quality",
      displayName: "Repository quality",
      maxParallel: 2,
      checks: [parent]
    } satisfies Check;
    const normalized = normalizeProjectDefinition(defineConfig({ checks: [informationRoot] }));

    assert.deepEqual(
      normalized.checks.map((check) => check.definition),
      [
        { checkId: "parent-check", displayName: "Parent check" },
        { checkId: "child-check", displayName: "Child check" }
      ]
    );
    assert.equal(Object.hasOwn(normalized.checks[0]?.definition ?? {}, "recordTypes"), false);
    assert.deepEqual(normalized.checks[0]?.dependsOn, ["prepare"]);
    assert.deepEqual(normalized.checks[0]?.mutex, ["analysis"]);
    assert.deepEqual(normalized.checks[0]?.observes, ["release-status"]);
    assert.deepEqual(normalized.checks[1]?.observes, ["release-status"]);
    assert.equal(normalized.checks[0]?.maxParallel, 2);
    assert.equal(normalized.checks[1]?.maxParallel, 2);
    assert.equal(
      normalized.declarative.checks.some((check) => "execute" in check),
      false
    );
  });
});
