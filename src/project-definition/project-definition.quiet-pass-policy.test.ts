import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

function executableWithQuietPassPolicy(omitQuietPassedRow?: true) {
  return {
    checkId: "quiet-pass-check",
    displayName: "Quiet pass check",
    execute: passed,
    ...(omitQuietPassedRow === undefined ? {} : { omitQuietPassedRow })
  };
}

describe("Project Definition", () => {
  it("normalizes executable quiet-pass policy and rejects other declarations", () => {
    const withoutPolicy = normalizeProjectDefinition(
      defineConfig({ checks: [executableWithQuietPassPolicy()] })
    );
    const quietPassOmitted = normalizeProjectDefinition(
      defineConfig({ checks: [executableWithQuietPassPolicy(true)] })
    );

    assert.equal(withoutPolicy.checks[0]?.omitQuietPassedRow, false);
    assert.equal(quietPassOmitted.checks[0]?.omitQuietPassedRow, true);
    assert.equal(withoutPolicy.declarative.checks[0]?.omitQuietPassedRow, false);
    assert.equal(Object.isFrozen(withoutPolicy.checks[0]), true);
    assert.equal(Object.isFrozen(withoutPolicy.declarative.checks[0]), true);
    assert.notEqual(
      createDeclarativeFingerprint(withoutPolicy.declarative),
      createDeclarativeFingerprint(quietPassOmitted.declarative)
    );

    const explicitUndefined = validateProjectDefinition({
      ...defineConfig({}),
      checks: [{ ...executableWithQuietPassPolicy(), omitQuietPassedRow: undefined }]
    });
    assert.equal(explicitUndefined.ok, true);
    if (explicitUndefined.ok) {
      const normalized = normalizeProjectDefinition(explicitUndefined.value);
      assert.equal(normalized.checks[0]?.omitQuietPassedRow, false);
      assert.equal(
        createDeclarativeFingerprint(withoutPolicy.declarative),
        createDeclarativeFingerprint(normalized.declarative)
      );
    }

    for (const omitQuietPassedRow of [undefined, false, true] as const) {
      assert.equal(
        validateProjectDefinition({
          ...defineConfig({}),
          checks: [{ checkId: "container", displayName: "Container", omitQuietPassedRow }]
        }).ok,
        false
      );
    }

    for (const omitQuietPassedRow of [false, "invalid"] as const) {
      assert.equal(
        validateProjectDefinition({
          ...defineConfig({}),
          checks: [{ ...executableWithQuietPassPolicy(), omitQuietPassedRow }]
        }).ok,
        false
      );
    }
    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        checks: [{ ...executableWithQuietPassPolicy(), visibility: "attention" }]
      }).ok,
      false
    );
  });

  it("ignores inherited quiet-pass policy while defaulting executable Checks", () => {
    // Check authoring only accepts plain objects, so Object.prototype is the
    // only prototype whose inherited field can reach this defaulting boundary.
    const original = Object.getOwnPropertyDescriptor(Object.prototype, "omitQuietPassedRow");
    Object.defineProperty(Object.prototype, "omitQuietPassedRow", {
      configurable: true,
      value: true
    });
    try {
      const normalized = normalizeProjectDefinition(
        defineConfig({
          checks: [
            {
              checkId: "default-quiet-pass-check",
              displayName: "Default quiet pass check",
              execute: passed
            }
          ]
        })
      );

      assert.equal(normalized.checks[0]?.omitQuietPassedRow, false);
    } finally {
      if (original === undefined) {
        delete (Object.prototype as { omitQuietPassedRow?: unknown }).omitQuietPassedRow;
      } else {
        Object.defineProperty(Object.prototype, "omitQuietPassedRow", original);
      }
    }
  });
});
