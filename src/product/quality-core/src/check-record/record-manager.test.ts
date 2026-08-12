import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { resolveCheckCatalog, type ResolvedCheckCatalog } from "./catalog.ts";
import { CheckManager } from "./check-manager.ts";
import type { CheckDefinition } from "./model.ts";
import { RecordManager } from "./record-manager.ts";
import { validateFinalCoreSnapshot } from "./validation.ts";

const definition = {
  checkId: "file-metrics",
  displayName: "File metrics",
  recordTypes: [{
    recordTypeId: "line-budget",
    fields: [
      { fieldId: "codeArea", valueType: "string", required: true },
      { fieldId: "limit", valueType: "integer", required: false }
    ],
    identityFields: ["codeArea"]
  }]
} as const;

function catalog(): ResolvedCheckCatalog {
  return catalogForDefinitions([definition]);
}

function catalogForDefinitions(
  definitions: readonly CheckDefinition[]
): ResolvedCheckCatalog {
  const resolved = resolveCheckCatalog({
    invocationKey: "record-manager-fixture",
    definitions,
    bindings: definitions.map(({ checkId }) => ({
      checkId,
      execute: () => ({ verdict: "passed" })
    })),
    selectedCheckIds: definitions.map(({ checkId }) => checkId),
    resolveApplicability: () => ({
      status: "applicable",
      workHandles: []
    })
  });
  if (!resolved.ok) {
    throw new Error(`Unexpected ${resolved.error.stage} fixture failure`);
  }
  return resolved.value;
}

const finding = {
  recordTypeId: "line-budget",
  level: "warning",
  semanticSubject: "src/a.ts",
  message: "Too many lines",
  fields: { codeArea: "source", limit: 200 },
  location: { path: "src/a.ts", line: 10, column: 2 }
} as const;

function boundSink(manager: RecordManager, catalogValue: ResolvedCheckCatalog) {
  const check = catalogValue.checks[0]!;
  return manager.createBoundSink(check.definition.checkId, check.checkRunId);
}

describe("check-record RecordManager", () => {
  it("adds unforgeable provenance validates descriptors commits immediately and replays idempotently", () => {
    const catalogValue = catalog();
    const manager = new RecordManager(catalogValue);
    const submit = boundSink(manager, catalogValue);

    assert.equal(submit(finding), "committed");
    assert.equal(submit(structuredClone(finding)), "replayed");
    const committed = manager.records();
    assert.equal(committed.length, 1);
    assert.equal(committed[0]!.checkId, definition.checkId);
    assert.equal(committed[0]!.checkRunId, catalogValue.checks[0]!.checkRunId);
    assert.match(committed[0]!.recordId, /^check-record\/v1\/record\/sha256:[a-f0-9]{64}$/);

    assert.equal(submit({ ...finding, checkId: "forged-check" } as never), "rejected");
    assert.equal(submit({ ...finding, fields: { codeArea: "source", limit: Number.NaN } }), "rejected");
    const state = manager.finalize();
    assert.equal(state.records.length, 1);
    assert.equal(state.integrity.status, "invalid");
    assert.equal(state.integrity.invalidRecords.length, 2);
    assert.deepEqual(state.diagnostics.get(definition.checkId)?.map((item) => item.category), [
      "invalid-record",
      "invalid-record"
    ]);
    assert.equal(JSON.stringify(state).includes("forged-check"), false);
  });

  it("isolates same-ID different-body conflicts with arrival-neutral evidence and retains independent records", () => {
    const firstCatalog = catalog();
    const firstManager = new RecordManager(firstCatalog);
    const firstSubmit = boundSink(firstManager, firstCatalog);
    const independent = {
      ...finding,
      semanticSubject: "src/independent.ts",
      fields: { ...finding.fields, codeArea: "tests" }
    } as const;
    const conflicting = {
      ...finding,
      message: "Reworded finding",
      location: { path: "src/a.ts", line: 99, column: 1 }
    } as const;

    assert.equal(firstSubmit(independent), "committed");
    assert.equal(firstSubmit(finding), "committed");
    assert.equal(firstSubmit(conflicting), "conflicted");
    const firstState = firstManager.finalize();
    assert.deepEqual(firstState.records.map((record) => record.semanticSubject), ["src/independent.ts"]);
    assert.equal(firstState.integrity.status, "conflicted");
    assert.equal(firstState.integrity.conflicts.length, 1);
    assert.equal(firstState.integrity.conflicts[0]!.recordId.startsWith(
      "check-record/v1/record/sha256:"
    ), true);

    const secondCatalog = catalog();
    const secondManager = new RecordManager(secondCatalog);
    const secondSubmit = boundSink(secondManager, secondCatalog);
    assert.equal(secondSubmit(conflicting), "committed");
    assert.equal(secondSubmit(finding), "conflicted");
    const secondState = secondManager.finalize();
    assert.deepEqual(secondState.integrity.conflicts, firstState.integrity.conflicts);
    assert.equal(JSON.stringify(firstState.integrity).includes("Reworded finding"), false);
    assert.equal(JSON.stringify(firstState.integrity).includes("\"line\":99"), false);
  });

  it("rejects submissions after a run terminal boundary without leaking candidate material", () => {
    const catalogValue = catalog();
    const manager = new RecordManager(catalogValue);
    const submit = boundSink(manager, catalogValue);
    const check = catalogValue.checks[0]!;
    manager.closeRun(check.definition.checkId, check.checkRunId);

    assert.equal(submit({
      ...finding,
      message: "https://user:secret-token@example.test/private"
    }), "rejected");
    const state = manager.finalize();
    assert.equal(state.integrity.status, "invalid");
    assert.equal(state.diagnostics.get(definition.checkId)?.[0]?.category, "invalid-record");
    assert.equal(JSON.stringify(state).includes("secret-token"), false);
    assert.equal(submit(finding), "rejected");
    assert.deepEqual(manager.records(), []);
  });

  it("canonicalizes invalid evidence independently of arrival and deduplicates the same safe violation", () => {
    const invalidShape = { ...finding, checkId: "forged-check" } as never;
    const invalidField = {
      ...finding,
      fields: { codeArea: "source", limit: Number.NaN }
    } as const;

    function collect(order: readonly ("field" | "shape")[]) {
      const catalogValue = catalog();
      const manager = new RecordManager(catalogValue);
      const submit = boundSink(manager, catalogValue);
      for (const item of order) {
        assert.equal(submit(item === "shape" ? invalidShape : invalidField), "rejected");
      }
      const state = manager.finalize();
      return {
        invalidRecords: state.integrity.invalidRecords,
        diagnostics: state.diagnostics.get(definition.checkId)
      };
    }

    const first = collect(["shape", "field", "shape"]);
    const second = collect(["field", "shape", "field"]);
    assert.deepEqual(first, second);
    assert.equal(first.invalidRecords.length, 2);
    assert.equal(new Set(first.invalidRecords.map((evidence) => evidence.evidenceId)).size, 2);
  });

  it("keeps evidence distinct across definitions after more than 10000 repeated submissions", () => {
    const definitions = [
      { ...definition, checkId: "alpha-check", displayName: "Alpha check" },
      { ...definition, checkId: "beta-check", displayName: "Beta check" }
    ] as const;
    const catalogValue = catalogForDefinitions(definitions);
    const manager = new RecordManager(catalogValue);
    const [alpha, beta] = catalogValue.checks;
    const submitAlpha = manager.createBoundSink(alpha!.definition.checkId, alpha!.checkRunId);
    const submitBeta = manager.createBoundSink(beta!.definition.checkId, beta!.checkRunId);
    const invalid = {
      ...finding,
      fields: { codeArea: "source", limit: Number.NaN }
    } as const;

    for (let index = 0; index < 10_001; index += 1) {
      assert.equal(submitAlpha(invalid), "rejected");
    }
    assert.equal(submitBeta(invalid), "rejected");
    const state = manager.finalize();

    assert.equal(state.integrity.invalidRecords.length, 2);
    assert.equal(new Set(state.integrity.invalidRecords.map((evidence) => evidence.evidenceId)).size, 2);

    const checkManager = new CheckManager(catalogValue);
    const reports = catalogValue.checks.map((check) => ({
      checkId: check.definition.checkId,
      checkRunId: check.checkRunId,
      status: "returned",
      result: { verdict: "passed" }
    }));
    const runs = checkManager.finalize(reports, state.diagnostics);
    const validation = validateFinalCoreSnapshot({
      catalogFingerprint: catalogValue.catalogFingerprint,
      definitions: catalogValue.definitions,
      runs,
      records: state.records,
      integrity: state.integrity,
      completeness: {
        status: "incomplete",
        selectedRunCount: 2,
        completedRunCount: 0,
        failedRunCount: 2,
        plannedWorkCount: 0,
        acknowledgedWorkCount: 0
      }
    });
    assert.equal(validation.ok, true);
  });
});
