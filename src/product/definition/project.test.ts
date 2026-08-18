import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createDeclarativeFingerprint,
  defineCheck,
  defineConfig,
  duplicateDetection,
  fileMetrics,
  inherit,
  normalizeProjectDefinition,
  type Check,
  type CheckExecution,
  type QualityRecordCandidate
} from "./project.ts";
import { validateProjectDefinition } from "./validation.ts";

const completed = () => ({ status: "completed" as const, verdict: "passed" as const });

describe("Project Definition", () => {
  it("creates a plain value with product-owned authoring defaults", () => {
    const definition = defineConfig({});

    assert.deepEqual(definition.checks, []);
    assert.deepEqual(definition.effects, {
      cache: { directory: ".cache/vibe-check", enabled: true },
      logs: { enabled: true },
      output: { directory: "artifacts/vibe-check", enabled: true },
      progress: { enabled: true }
    });
    assert.equal(definition.apiVersion, "1");
    assert.equal(definition.scheduler.maxParallel, 4);
    assert.equal(Object.getPrototypeOf(definition), Object.prototype);
  });

  it("normalizes independently executable parents, children, and an omitted record catalog", () => {
    const child = defineCheck({
      checkId: "child-check",
      displayName: "Child check",
      options: { maximum: 3 },
      execution({ options }) {
        assert.equal(options.maximum, 3);
        return completed();
      }
    });
    const parent = defineCheck({
      checkId: "parent-check",
      displayName: "Parent check",
      dependsOn: ["prepare"],
      mutex: ["analysis"],
      execution: completed,
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
      normalized.checks.map((check) => check.definition.checkId),
      ["parent-check", "child-check"]
    );
    assert.deepEqual(normalized.checks[0]?.definition.recordTypes, []);
    assert.deepEqual(normalized.checks[0]?.dependsOn, ["prepare"]);
    assert.deepEqual(normalized.checks[0]?.mutex, ["analysis"]);
    assert.equal(normalized.checks[0]?.maxParallel, 2);
    assert.equal(normalized.checks[1]?.maxParallel, 2);
    assert.equal(
      normalized.declarative.checks.some((check) => "execution" in check),
      false
    );
  });

  it("uses exact collections, clears, and marked inheritance while keeping canonical scheduling", () => {
    const inherited = defineCheck({
      checkId: "inherited-check",
      displayName: "Inherited check",
      dependsOn: inherit({ remove: ["legacy"], add: ["compile", "compile"] }),
      mutex: inherit({ add: ["compiler", "compiler"] }),
      execution: completed
    });
    const cleared = defineCheck({
      checkId: "cleared-check",
      displayName: "Cleared check",
      dependsOn: [],
      mutex: [],
      execution: completed
    });
    const parent = {
      checkId: "analysis",
      displayName: "Analysis",
      dependsOn: ["legacy", "prepare"],
      mutex: ["shared"],
      checks: [inherited, cleared]
    } satisfies Check;
    const checks = normalizeProjectDefinition(defineConfig({ checks: [parent] })).checks;

    assert.deepEqual(
      checks.find(({ definition }) => definition.checkId === "inherited-check")?.dependsOn,
      ["compile", "prepare"]
    );
    assert.deepEqual(
      checks.find(({ definition }) => definition.checkId === "inherited-check")?.mutex,
      ["compiler", "shared"]
    );
    assert.deepEqual(
      checks.find(({ definition }) => definition.checkId === "cleared-check")?.dependsOn,
      []
    );
    assert.deepEqual(
      checks.find(({ definition }) => definition.checkId === "cleared-check")?.mutex,
      []
    );
  });

  it("accepts empty information-only Checks and returns their non-blocking warnings", () => {
    const definition = defineConfig({
      checks: [{ checkId: "notes", displayName: "Notes" }]
    });
    const validated = validateProjectDefinition(definition);

    assert.equal(validated.ok, true);
    if (!validated.ok) throw new TypeError("information-only Check must be valid");
    assert.deepEqual(validated.warnings, [
      {
        code: "meaningless-check",
        path: "definition.checks[0]",
        checkId: "notes"
      }
    ]);
    assert.deepEqual(normalizeProjectDefinition(definition).definitionWarnings, validated.warnings);
  });

  it("fails closed for malformed nodes, options, and unmarked inheritance objects", () => {
    const valid = defineConfig({
      checks: [
        defineCheck({
          checkId: "valid-check",
          displayName: "Valid check",
          execution: completed
        })
      ]
    });
    const accessor = { ...valid.checks[0] };
    Object.defineProperty(accessor, "execution", {
      enumerable: true,
      get: () => completed
    });

    for (const checks of [
      [{ ...valid.checks[0], unexpected: true }],
      [{ checkId: "info", displayName: "Info", options: {} }],
      [{ checkId: "info", displayName: "Info", recordTypes: [] }],
      [{ ...valid.checks[0], options: { callback: completed } }],
      [{ ...valid.checks[0], options: { date: new Date() } }],
      [{ ...valid.checks[0], dependsOn: { add: ["compile"] } }],
      [accessor]
    ]) {
      assert.deepEqual(validateProjectDefinition({ ...valid, checks }).ok, false);
    }

    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    assert.equal(
      validateProjectDefinition({
        ...valid,
        checks: [{ ...valid.checks[0], options: cyclic }]
      }).ok,
      false
    );
  });

  it("fingerprints canonical declarative data, including options but not execution functions", () => {
    const first = defineConfig({
      checks: [
        defineCheck({
          checkId: "check",
          displayName: "Check",
          options: { threshold: 2, nested: { mode: "strict" } },
          dependsOn: ["prepare", "compile"],
          execution: completed
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
          execution: async () => completed()
        })
      ]
    });
    const differentOptions = defineConfig({
      checks: [
        defineCheck({
          checkId: "check",
          displayName: "Check",
          options: { threshold: 3, nested: { mode: "strict" } },
          dependsOn: ["compile", "prepare"],
          execution: completed
        })
      ]
    });

    const firstFingerprint = createDeclarativeFingerprint(
      normalizeProjectDefinition(first).declarative
    );
    assert.equal(
      firstFingerprint,
      createDeclarativeFingerprint(normalizeProjectDefinition(second).declarative)
    );
    assert.notEqual(
      firstFingerprint,
      createDeclarativeFingerprint(normalizeProjectDefinition(differentOptions).declarative)
    );
  });

  it("keeps complete default Checks mutable through native nested spread before Definition validation", () => {
    const customized = defineCheck({
      ...fileMetrics,
      options: {
        ...fileMetrics.options,
        scanner: {
          ...fileMetrics.options.scanner,
          executable: "/opt/bin/scc"
        },
        codeLines: {
          ...fileMetrics.options.codeLines,
          absoluteFloor: 250
        }
      }
    });

    assert.equal(validateProjectDefinition(defineConfig({ checks: [customized] })).ok, true);
    assert.equal(fileMetrics.options.scanner.executable, "scc");
    assert.equal(fileMetrics.options.codeLines.absoluteFloor, 300);

    const incomplete = {
      ...fileMetrics,
      options: {
        scanner: { executable: "scc" }
      }
    };
    const invalidConcurrency = {
      ...duplicateDetection,
      options: {
        ...duplicateDetection.options,
        scanner: { ...duplicateDetection.options.scanner, maxConcurrency: 0 }
      }
    };
    const unknownCodeArea = {
      ...duplicateDetection,
      options: {
        ...duplicateDetection.options,
        minimumTokensByCodeArea: { unknown: 100 }
      }
    };
    const uncheckedDefinition = defineConfig({});

    assert.equal(
      validateProjectDefinition({ ...uncheckedDefinition, checks: [incomplete] }).ok,
      false
    );
    assert.equal(
      validateProjectDefinition({ ...uncheckedDefinition, checks: [invalidConcurrency] }).ok,
      false
    );
    assert.equal(
      validateProjectDefinition({ ...uncheckedDefinition, checks: [unknownCodeArea] }).ok,
      false
    );
  });

  // @ts-expect-error defineConfig rejects unknown top-level authoring keys.
  defineConfig({ unsupported: true });
});

function _typeCheckCheckAuthoring() {
  const optionAware = defineCheck({
    checkId: "typed-check",
    displayName: "Typed check",
    options: { maximum: 5 },
    execution({ options, project, records, signal }) {
      const finding: QualityRecordCandidate = {
        recordTypeId: "typed-record",
        level: "warning",
        semanticSubject: "typed-subject",
        message: "Typed message",
        fields: {},
        location: null
      };
      const maximum: number = options.maximum;
      void maximum;
      void project.root;
      void signal.aborted;
      records.report(finding);
      records.reportReference({
        referenceName: "baseline",
        status: "complete",
        relations: [{ record: finding, relationId: "regression" }]
      });
      // @ts-expect-error option-aware execution cannot read unknown options.
      void options.unknown;
      return { status: "completed", verdict: "passed" };
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
  const standalone: CheckExecution<{ readonly floor: number }> = ({ options }) => {
    const floor: number = options.floor;
    void floor;
    return { status: "unavailable", reason: { code: "not-installed" } };
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
    execution: () => ({
      status: "unknown"
    })
  });
  void standalone;
  void heterogeneous;
  void invalid;
}
