import { strict as assert } from "node:assert";
import fs from "node:fs";
import { describe, it } from "node:test";

import { checkPublishedMachineExamples } from "../../../docs/machine-artifacts/examples/command.ts";
import { checkPublishedMachineSchemas } from "../../../docs/machine-artifacts/schemas.ts";
import { toDocumentationAbsolutePath } from "../repository-paths.ts";
import {
  validateDocsMachineArtifactSet,
  validatePublishedMachineArtifactExamples,
  type DocsMachineValidationDiagnostic
} from "./validation.ts";

const encoder = new TextEncoder();
type JsonRecord = Record<string, unknown>;

interface MutationContext {
  readonly artifacts: { recordsNdjson: Uint8Array; runJson: Uint8Array };
  readonly records: JsonRecord[];
  readonly run: JsonRecord;
}

interface ExpectedDiagnostic {
  readonly category?: DocsMachineValidationDiagnostic["category"];
  readonly index?: number;
  readonly line?: number;
  readonly logicalArtifact?: string;
  readonly pointer?: string;
  readonly relationship?: DocsMachineValidationDiagnostic["relationship"];
}

describe("independent docs machine artifact validation", () => {
  it("accepts exactly the current v4 example and positive JSON grammar variants", () => {
    assert.equal(validatePublishedMachineArtifactExamples(), 1);
    const context = loadContext();
    context.artifacts.runJson = encoder.encode(`\t${JSON.stringify(context.run)}\r\n`);
    context.artifacts.recordsNdjson = encoder.encode(
      `${context.records.map((record) => JSON.stringify(record)).join("\r\n")}\r\n`
    );
    expectSuccess(validateDocsMachineArtifactSet(context.artifacts, "positive/reordered"));
  });

  it("rejects historical v2/v3 and focused v4 set mutations without a partial accepted set", () => {
    const cases: readonly {
      readonly expected: ExpectedDiagnostic;
      readonly label: string;
      readonly mutate: (context: MutationContext) => void;
    }[] = [
      {
        label: "v2 run rejected",
        expected: { category: "schema", logicalArtifact: "run.json", pointer: "/schemaVersion" },
        mutate: ({ run, artifacts }) => {
          run.schemaVersion = "vibe-check.run.v2";
          artifacts.runJson = encoder.encode(JSON.stringify(run));
        }
      },
      {
        label: "v2 record rejected",
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "records.ndjson",
          pointer: "/schemaVersion"
        },
        mutate: ({ records, artifacts }) => {
          firstRecord(records).schemaVersion = "vibe-check.record.v2";
          artifacts.recordsNdjson = encodeRecords(records);
        }
      },
      {
        label: "v3 run rejected",
        expected: { category: "schema", logicalArtifact: "run.json", pointer: "/schemaVersion" },
        mutate: ({ run, artifacts }) => {
          run.schemaVersion = "vibe-check.run.v3";
          artifacts.runJson = encoder.encode(JSON.stringify(run));
        }
      },
      {
        label: "v3 record rejected",
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "records.ndjson",
          pointer: "/schemaVersion"
        },
        mutate: ({ records, artifacts }) => {
          firstRecord(records).schemaVersion = "vibe-check.record.v3";
          artifacts.recordsNdjson = encodeRecords(records);
        }
      },
      {
        label: "final data required",
        expected: {
          category: "schema",
          logicalArtifact: "run.json",
          pointer: "/checks/2/outcome/data"
        },
        mutate: ({ run, artifacts }) => {
          const checks = arrayField(run, "checks");
          const check = recordField(arrayItem(checks, 2, "checks"), "check");
          const outcome = recordField(check.outcome, "check outcome");
          delete outcome.data;
          check.outcome = outcome;
          checks[2] = check;
          artifacts.runJson = encoder.encode(JSON.stringify(run));
        }
      },
      {
        label: "record ownership",
        expected: {
          category: "set-invariant",
          index: 0,
          line: 1,
          logicalArtifact: "records.ndjson",
          relationship: "record-check-ownership"
        },
        mutate: ({ records, artifacts }) => {
          firstRecord(records).checkId = "aaa-unknown-check";
          artifacts.recordsNdjson = encodeRecords(records);
        }
      },
      {
        label: "composite duplicate",
        expected: {
          category: "set-invariant",
          index: 1,
          line: 2,
          logicalArtifact: "records.ndjson",
          relationship: "record-canonical-order"
        },
        mutate: ({ records, artifacts }) => {
          records.splice(1, 0, structuredClone(firstRecord(records)));
          artifacts.recordsNdjson = encodeRecords(records);
        }
      },
      {
        label: "mixed record set",
        expected: {
          category: "set-invariant",
          logicalArtifact: "records.ndjson",
          relationship: "records-fingerprint"
        },
        mutate: ({ records, artifacts }) => {
          firstRecord(records).data = { changed: true };
          artifacts.recordsNdjson = encodeRecords(records);
        }
      },
      {
        label: "non-finite final data literal",
        expected: {
          category: "set-invariant",
          logicalArtifact: "run.json",
          relationship: "canonical-json"
        },
        mutate: ({ artifacts }) => {
          artifacts.runJson = encoder.encode(
            new TextDecoder()
              .decode(artifacts.runJson)
              .replace('"minimumFileCount":2', '"minimumFileCount":1e400')
          );
        }
      },
      {
        label: "non-finite record data literal",
        expected: {
          category: "set-invariant",
          logicalArtifact: "records.ndjson",
          relationship: "canonical-json"
        },
        mutate: ({ artifacts }) => {
          artifacts.recordsNdjson = encoder.encode(
            new TextDecoder()
              .decode(artifacts.recordsNdjson)
              .replace('"actual":1', '"actual":1e400')
          );
        }
      }
    ];
    for (const testCase of cases) {
      const context = loadContext();
      testCase.mutate(context);
      assertExpectedDiagnostic(
        expectFailure(
          validateDocsMachineArtifactSet(context.artifacts, `mutation/${testCase.label}`)
        ),
        testCase.expected,
        testCase.label
      );
    }
  });

  it("detects generated schema and example drift", async () => {
    await proveDrift("docs/schemas/vibe-check-run.schema.json", checkPublishedMachineSchemas);
    await proveDrift(
      "docs/examples/artifacts/mixed-outcomes/run.json",
      checkPublishedMachineExamples
    );
    await proveDefinitionDrift(checkPublishedMachineExamples);
  });
});

function loadContext(): MutationContext {
  const root = "docs/examples/artifacts/mixed-outcomes";
  const run = parseJsonRecord(
    fs.readFileSync(toDocumentationAbsolutePath(`${root}/run.json`), "utf8"),
    "run artifact"
  );
  const source = fs.readFileSync(toDocumentationAbsolutePath(`${root}/records.ndjson`), "utf8");
  const records: JsonRecord[] = [];
  if (source.length > 0) {
    for (const line of source.trimEnd().split("\n")) {
      records.push(parseJsonRecord(line, "record artifact"));
    }
  }
  return {
    artifacts: {
      recordsNdjson: encodeRecords(records),
      runJson: encoder.encode(JSON.stringify(run))
    },
    records,
    run
  };
}

function parseJsonRecord(source: string, label: string): JsonRecord {
  const value: unknown = JSON.parse(source);
  return recordField(value, label);
}

function recordField(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} is not an object`);
  }
  const record: JsonRecord = {};
  for (const [key, entry] of Object.entries(value)) record[key] = entry;
  return record;
}

function arrayField(record: JsonRecord, key: string): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) throw new TypeError(`${key} is not an array`);
  return value;
}

function arrayItem(values: readonly unknown[], index: number, label: string): unknown {
  const value = values[index];
  if (value === undefined) throw new TypeError(`${label} has no item at index ${index}`);
  return value;
}

function firstRecord(records: readonly JsonRecord[]): JsonRecord {
  const record = records[0];
  if (record === undefined) throw new TypeError("Records have no first item");
  return record;
}

function encodeRecords(records: readonly JsonRecord[]): Uint8Array {
  return encoder.encode(
    records.length === 0 ? "" : `${records.map((record) => JSON.stringify(record)).join("\n")}\n`
  );
}

function assertExpectedDiagnostic(
  diagnostic: DocsMachineValidationDiagnostic,
  expected: ExpectedDiagnostic,
  label: string
): void {
  if (expected.category !== undefined)
    assert.deepEqual(diagnostic.category, expected.category, label);
  if (expected.index !== undefined) assert.deepEqual(diagnostic.index, expected.index, label);
  if (expected.line !== undefined) assert.deepEqual(diagnostic.line, expected.line, label);
  if (expected.logicalArtifact !== undefined) {
    assert.deepEqual(diagnostic.logicalArtifact, expected.logicalArtifact, label);
  }
  if (expected.pointer !== undefined) assert.deepEqual(diagnostic.pointer, expected.pointer, label);
  if (expected.relationship !== undefined) {
    assert.deepEqual(diagnostic.relationship, expected.relationship, label);
  }
}

function expectSuccess(result: ReturnType<typeof validateDocsMachineArtifactSet>): void {
  assert.equal(result.ok, true, result.ok ? "" : result.diagnostic.message);
}

function expectFailure(
  result: ReturnType<typeof validateDocsMachineArtifactSet>
): DocsMachineValidationDiagnostic {
  assert.equal(result.ok, false, result.ok ? "expected failure" : "");
  if (result.ok) throw new Error("Expected failure");
  return result.diagnostic;
}

async function proveDrift(path: string, check: () => void | Promise<void>): Promise<void> {
  const absolute = toDocumentationAbsolutePath(path);
  const original = fs.readFileSync(absolute, "utf8");
  fs.writeFileSync(absolute, `${original}\n`, "utf8");
  try {
    await assert.rejects(async () => check(), /drift/);
  } finally {
    fs.writeFileSync(absolute, original, "utf8");
  }
}

async function proveDefinitionDrift(check: () => Promise<void>): Promise<void> {
  const path = toDocumentationAbsolutePath("docs/examples/artifacts/mixed-outcomes/definition.ts");
  const original = fs.readFileSync(path, "utf8");
  const changed = original.replace("minimumFileCount: 2", "minimumFileCount: 3");
  assert.notEqual(changed, original);
  fs.writeFileSync(path, changed, "utf8");
  try {
    await assert.rejects(check, /drift/);
  } finally {
    fs.writeFileSync(path, original, "utf8");
  }
}
