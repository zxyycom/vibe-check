import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { createCatalogFingerprint } from "./identity.ts";
import {
  resolveCheckCatalog,
  resolveRecordTypeDefinition,
  type CheckExecutionBinding
} from "./catalog.ts";

const fileDefinition = {
  checkId: "file-metrics",
  displayName: "File metrics",
  recordTypes: [{
    recordTypeId: "finding",
    fields: [{ fieldId: "codeArea", valueType: "string", required: true }],
    identityFields: ["codeArea"],
    policy: {
      operands: [{
        operandId: "codeArea",
        valueType: "string",
        source: { kind: "field", fieldId: "codeArea" }
      }],
      relations: ["changed"]
    }
  }]
} as const;

const functionDefinition = {
  checkId: "function-metrics",
  displayName: "Function metrics",
  recordTypes: [{
    recordTypeId: "finding",
    fields: [{ fieldId: "metric", valueType: "string", required: true }],
    identityFields: ["metric"],
    policy: {
      operands: [],
      relations: []
    }
  }]
} as const;

function binding(checkId: string, calls: string[]): Readonly<{
  checkId: string;
  execute: CheckExecutionBinding;
}> {
  return {
    checkId,
    execute: () => {
      calls.push(checkId);
      return { verdict: "passed" };
    }
  };
}

describe("check-record catalog resolution", () => {
  it("freezes a canonical public catalog and resolves qualified record types and selected applicability", () => {
    const calls: string[] = [];
    const applicabilityCalls: string[] = [];
    const mutableDefinitions = structuredClone([functionDefinition, fileDefinition]);
    const resolved = resolveCheckCatalog({
      invocationKey: "catalog-fixture",
      definitions: mutableDefinitions,
      bindings: [binding("function-metrics", calls), binding("file-metrics", calls)],
      selectedCheckIds: ["file-metrics"],
      resolveApplicability: (definition) => {
        applicabilityCalls.push(definition.checkId);
        return { status: "applicable", workHandles: ["work-handle/v1:file-02", "work-handle/v1:file-01"] };
      }
    });

    assert.equal(resolved.ok, true);
    if (!resolved.ok) {
      throw new Error("Expected catalog resolution to succeed");
    }

    (mutableDefinitions[0]! as { displayName: string }).displayName = "mutated";
    assert.deepEqual(resolved.value.definitions.map((definition) => definition.checkId), [
      "file-metrics",
      "function-metrics"
    ]);
    assert.equal(resolved.value.catalogFingerprint,
      createCatalogFingerprint([fileDefinition, functionDefinition]).catalogFingerprint);
    assert.deepEqual(applicabilityCalls, ["file-metrics"]);
    assert.deepEqual(resolved.value.checks.map((check) => ({
      checkId: check.definition.checkId,
      selection: check.selection,
      applicability: check.applicability,
      workHandles: check.workHandles
    })), [{
      checkId: "file-metrics",
      selection: "selected",
      applicability: "applicable",
      workHandles: ["work-handle/v1:file-01", "work-handle/v1:file-02"]
    }, {
      checkId: "function-metrics",
      selection: "unselected",
      applicability: null,
      workHandles: []
    }]);
    assert.equal(resolveRecordTypeDefinition(resolved.value, "file-metrics", "finding")?.fields[0]?.fieldId,
      "codeArea");
    assert.equal(resolveRecordTypeDefinition(resolved.value, "function-metrics", "finding")?.fields[0]?.fieldId,
      "metric");
    assert.deepEqual(
      resolveRecordTypeDefinition(resolved.value, "file-metrics", "finding")?.policy,
      fileDefinition.recordTypes[0].policy
    );
    assert.equal("execute" in resolved.value.definitions[0]!, false);
    assert.equal("backend" in resolved.value.definitions[0]!, false);
    assert.equal(Object.isFrozen(resolved.value.definitions), true);
    assert.equal(Object.isFrozen(resolved.value.definitions[0]!.recordTypes), true);
    assert.equal(Object.isFrozen(resolved.value.definitions[0]!.recordTypes[0]?.policy), true);
    assert.deepEqual(calls, []);
  });

  it("fails pre-work for invalid catalogs bindings selections and applicability without executing bindings", () => {
    const calls: string[] = [];
    const validBindings = [binding("file-metrics", calls), binding("function-metrics", calls)];
    const cases: readonly Readonly<{
      definitions?: unknown;
      bindings?: unknown;
      selectedCheckIds?: unknown;
      applicability?: unknown;
      stage: string;
    }>[] = [
      { definitions: [{ ...fileDefinition, backend: "scc" }], stage: "catalog" },
      { definitions: [fileDefinition, fileDefinition], stage: "catalog" },
      { definitions: [{ ...fileDefinition, checkId: "Not Valid" }], stage: "catalog" },
      { bindings: [validBindings[0]], stage: "bindings" },
      { bindings: [...validBindings, binding("duplicate-detection", calls)], stage: "bindings" },
      { bindings: [validBindings[0], validBindings[0]], stage: "bindings" },
      { bindings: [{ checkId: "file-metrics", execute: "not-a-function" }, validBindings[1]], stage: "bindings" },
      { selectedCheckIds: ["unknown-check"], stage: "selection" },
      { selectedCheckIds: ["file-metrics", "file-metrics"], stage: "selection" },
      { applicability: { status: "applicable", workHandles: ["not-opaque"] }, stage: "applicability" }
    ];

    for (const fixture of cases) {
      const resolved = resolveCheckCatalog({
        invocationKey: "invalid-fixture",
        definitions: fixture.definitions ?? [fileDefinition, functionDefinition],
        bindings: fixture.bindings ?? validBindings,
        selectedCheckIds: fixture.selectedCheckIds ?? ["file-metrics"],
        resolveApplicability: () => fixture.applicability ?? { status: "not-applicable" }
      });
      assert.deepEqual(resolved, {
        ok: false,
        error: { kind: "catalog-resolution-failed", stage: fixture.stage }
      });
    }
    assert.deepEqual(calls, []);
  });
});
