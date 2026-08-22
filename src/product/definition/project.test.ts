import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineCheck,
  defineConfig,
  inherit,
  normalizeProjectDefinition,
  type Check,
  type CheckExecution,
  type CheckResult
} from "./project.ts";
import { validateProjectDefinition } from "./validation.ts";

const passed = () => ({ status: "passed" as const, data: { source: "test" } });

describe("Project Definition", () => {
  it("creates a plain value with Product-owned authoring defaults", () => {
    const definition = defineConfig({});

    assert.deepEqual(definition.checks, []);
    assert.deepEqual(definition.effects, {
      cache: { directory: ".cache/vibe-check", enabled: true },
      output: { directory: "artifacts/vibe-check", enabled: true },
      progress: { enabled: true }
    });
    assert.equal(definition.apiVersion, "1");
    assert.equal(definition.scheduler.maxParallel, 4);
    assert.equal(Object.getPrototypeOf(definition), Object.prototype);
  });

  it("normalizes ordinary recursive Checks without a Record catalog", () => {
    const child = defineCheck({
      checkId: "child-check",
      displayName: "Child check",
      options: { maximum: 3 },
      execution({ options }) {
        assert.equal(options.maximum, 3);
        return passed();
      }
    });
    const parent = defineCheck({
      checkId: "parent-check",
      displayName: "Parent check",
      dependsOn: ["prepare"],
      mutex: ["analysis"],
      execution: passed,
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
    assert.equal(normalized.checks[0]?.maxParallel, 2);
    assert.equal(normalized.checks[1]?.maxParallel, 2);
    assert.equal(
      normalized.declarative.checks.some((check) => "execution" in check),
      false
    );
  });

  it("uses exact scheduling inheritance and rejects retired catalog fields", () => {
    const inherited = defineCheck({
      checkId: "inherited-check",
      displayName: "Inherited check",
      dependsOn: inherit({ remove: ["legacy"], add: ["compile", "compile"] }),
      mutex: inherit({ add: ["compiler", "compiler"] }),
      execution: passed
    });
    const parent = {
      checkId: "analysis",
      displayName: "Analysis",
      dependsOn: ["legacy", "prepare"],
      mutex: ["shared"],
      checks: [inherited]
    } satisfies Check;
    const checks = normalizeProjectDefinition(defineConfig({ checks: [parent] })).checks;

    assert.deepEqual(checks[0]?.dependsOn, ["compile", "prepare"]);
    assert.deepEqual(checks[0]?.mutex, ["compiler", "shared"]);
    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        checks: [
          {
            checkId: "legacy",
            displayName: "Legacy",
            execution: passed,
            recordTypes: []
          }
        ]
      }).ok,
      false
    );
  });

  it("normalizes executable visibility and rejects container visibility", () => {
    const executable = (visibility?: "always" | "attention") => ({
      checkId: "visible-check",
      displayName: "Visible check",
      execution: passed,
      ...(visibility === undefined ? {} : { visibility })
    });
    const withoutVisibility = normalizeProjectDefinition(defineConfig({ checks: [executable()] }));
    const explicitAlways = normalizeProjectDefinition(
      defineConfig({ checks: [executable("always")] })
    );
    const attention = normalizeProjectDefinition(
      defineConfig({ checks: [executable("attention")] })
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
      checks: [{ ...executable(), visibility: undefined }]
    });
    assert.equal(explicitUndefined.ok, true);
    if (explicitUndefined.ok) {
      assert.equal(explicitUndefined.value.checks[0]?.visibility, "always");
    }

    for (const visibility of [undefined, "always", "invalid"] as const) {
      assert.equal(
        validateProjectDefinition({
          ...defineConfig({}),
          checks: [
            {
              checkId: "container",
              displayName: "Container",
              visibility
            }
          ]
        }).ok,
        false
      );
    }

    assert.equal(
      validateProjectDefinition({
        ...defineConfig({}),
        checks: [{ ...executable(), visibility: "hidden" }]
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

  it("fingerprints canonical declarative data without retaining callback functions", () => {
    const first = defineConfig({
      checks: [
        defineCheck({
          checkId: "check",
          displayName: "Check",
          options: { threshold: 2, nested: { mode: "strict" } },
          dependsOn: ["prepare", "compile"],
          execution: passed
        })
      ]
    });
    const second = defineConfig({
      checks: [
        defineCheck({
          checkId: "check",
          displayName: "Check",
          options: { nested: { mode: "strict" }, threshold: 2 },
          dependsOn: ["compile", "prepare", "compile"],
          execution: async () => passed()
        })
      ]
    });

    assert.equal(
      createDeclarativeFingerprint(normalizeProjectDefinition(first).declarative),
      createDeclarativeFingerprint(normalizeProjectDefinition(second).declarative)
    );
  });

  // @ts-expect-error defineConfig rejects retired policy authoring.
  defineConfig({ selectedPolicy: null });
  // @ts-expect-error defineConfig rejects unknown top-level authoring keys.
  defineConfig({ unsupported: true });
});

function _typeCheckCheckAuthoring() {
  const optionAware = defineCheck({
    checkId: "typed-check",
    displayName: "Typed check",
    options: { maximum: 5 },
    execution({ options, project, records, signal }) {
      const maximum: number = options.maximum;
      void maximum;
      void project.root;
      void signal.aborted;
      records.report({ id: "sample" }, { nested: { value: true } });
      // @ts-expect-error Record identities are closed at the public write boundary.
      records.report({ id: "sample", checkId: "typed-check" }, {});
      return { status: "passed", data: { maximum } };
    }
  });
  const noOptions = defineCheck({
    checkId: "no-options",
    displayName: "No options",
    execution({ options }) {
      // @ts-expect-error no-options execution receives an empty options object.
      void options.unknown;
      return { status: "not-applicable" };
    }
  });
  const messaged: Check = {
    checkId: "messaged-check",
    displayName: "Messaged check",
    visibility: "attention",
    execution: () => ({
      status: "not-applicable",
      messages: [{ code: "not-needed", level: "info", message: "Not needed" }]
    })
  };
  const standalone: CheckExecution<{ readonly floor: number }> = ({ options }) => {
    const floor: number = options.floor;
    void floor;
    return { status: "failed", data: { floor } };
  };
  const heterogeneous: Check = {
    checkId: "heterogeneous",
    displayName: "Heterogeneous",
    checks: [optionAware, noOptions]
  };
  const invalid = defineCheck({
    checkId: "invalid-result",
    displayName: "Invalid result",
    // @ts-expect-error execution results have a closed status vocabulary.
    execution: () => ({ status: "unknown" })
  });
  void standalone;
  void heterogeneous;
  void invalid;
  void messaged;
}

function _typeCheckFinalDataBoundary() {
  // @ts-expect-error Check final data must be object-shaped at the write boundary.
  const invalid: CheckExecution = () => ({ status: "passed", data: 1 });
  void invalid;
}

function _typeCheckMessagesOnEveryTerminalResult() {
  const results: readonly CheckResult[] = [
    {
      status: "passed",
      data: {},
      messages: [{ code: "passed-with-note", level: "info", message: "Passed" }]
    },
    {
      status: "failed",
      data: {},
      messages: [{ code: "failed-with-note", level: "error", message: "Failed" }]
    },
    {
      status: "not-applicable",
      messages: [{ code: "not-required", level: "warning", message: "Not required" }]
    },
    {
      status: "unavailable",
      reason: { code: "unavailable" },
      messages: [{ code: "unavailable", level: "error", message: "Unavailable" }]
    }
  ];
  void results;
}
