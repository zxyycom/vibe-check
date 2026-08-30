import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineConfig,
  normalizeProjectDefinition
} from "./project-definition.ts";
import { validateProjectDefinition } from "./project-definition-validation.ts";
import { passed } from "./project-definition.test-support.ts";

function executableWithVisibility(visibility?: "always" | "attention") {
  return {
    checkId: "visible-check",
    displayName: "Visible check",
    execution: passed,
    ...(visibility === undefined ? {} : { visibility })
  };
}

describe("Project Definition", () => {
  it("normalizes executable visibility and rejects container visibility", () => {
    const withoutVisibility = normalizeProjectDefinition(
      defineConfig({ checks: [executableWithVisibility()] })
    );
    const explicitAlways = normalizeProjectDefinition(
      defineConfig({ checks: [executableWithVisibility("always")] })
    );
    const attention = normalizeProjectDefinition(
      defineConfig({ checks: [executableWithVisibility("attention")] })
    );

    assert.equal(withoutVisibility.checks[0]?.visibility, "always");
    assert.equal(explicitAlways.checks[0]?.visibility, "always");
    assert.equal(attention.checks[0]?.visibility, "attention");
    assert.equal(withoutVisibility.declarative.checks[0]?.visibility, "always");
    assert.equal(
      createDeclarativeFingerprint(withoutVisibility.declarative),
      createDeclarativeFingerprint(explicitAlways.declarative)
    );
    assert.notEqual(
      createDeclarativeFingerprint(withoutVisibility.declarative),
      createDeclarativeFingerprint(attention.declarative)
    );

    const explicitUndefined = validateProjectDefinition({
      ...defineConfig({}),
      checks: [{ ...executableWithVisibility(), visibility: undefined }]
    });
    assert.equal(explicitUndefined.ok, true);
    if (explicitUndefined.ok) {
      assert.equal(explicitUndefined.value.checks[0]?.visibility, "always");
    }

    for (const visibility of [undefined, "always", "invalid"] as const) {
      assert.equal(
        validateProjectDefinition({
          ...defineConfig({}),
          checks: [{ checkId: "container", displayName: "Container", visibility }]
        }).ok,
        false
      );
    }

    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        checks: [{ ...executableWithVisibility(), visibility: "hidden" }]
      }).ok,
      false
    );
  });

  it("ignores inherited visibility while defaulting executable Checks", () => {
    // Check authoring only accepts plain objects, so Object.prototype is the
    // only prototype whose inherited field can reach this defaulting boundary.
    const original = Object.getOwnPropertyDescriptor(Object.prototype, "visibility");
    Object.defineProperty(Object.prototype, "visibility", {
      configurable: true,
      value: "attention"
    });
    try {
      const normalized = normalizeProjectDefinition(
        defineConfig({
          checks: [
            {
              checkId: "default-visible-check",
              displayName: "Default visible check",
              execution: passed
            }
          ]
        })
      );

      assert.equal(normalized.checks[0]?.visibility, "always");
    } finally {
      if (original === undefined) {
        delete (Object.prototype as { visibility?: unknown }).visibility;
      } else {
        Object.defineProperty(Object.prototype, "visibility", original);
      }
    }
  });
});
