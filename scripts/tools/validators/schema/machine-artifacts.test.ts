import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { describe, it } from "node:test";

import { checkPublishedMachineExamples } from "../../../docs/machine-examples.ts";
import { checkPublishedMachineSchemas } from "../../../docs/machine-schemas.ts";
import { validateMachinePublicationSetV3 } from "../../../../src/product/run/machine-output.ts";
import { toAbs } from "../repo/paths.ts";
import {
  validateDocsMachineArtifactSet,
  validatePublishedMachineArtifactExamples,
  type DocsMachineValidationDiagnostic
} from "./machine-artifacts.ts";
import { catalogFingerprint } from "./machine-artifact-canonical.ts";
import { validateArtifactSetInvariants } from "./machine-artifact-invariants.ts";
import type { RecordShape, RunShape } from "./machine-artifact-types.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

type JsonRecord = Record<string, unknown>;

interface MutationContext {
  artifacts: {
    recordsNdjson: Uint8Array;
    runJson: Uint8Array;
  };
  records: JsonRecord[];
  run: JsonRecord;
}

describe("independent docs machine artifact validation", () => {
  it("accepts exactly the five canonical sets and positive grammar variants", () => {
    assert.equal(validatePublishedMachineArtifactExamples(), 5);

    const reordered = loadContext("gate-failed");
    reordered.artifacts.runJson = bytes(
      `\t\r\n ${JSON.stringify(Object.fromEntries(Object.entries(reordered.run).reverse()))} \r\n`
    );
    reordered.artifacts.recordsNdjson = bytes(
      `\t ${JSON.stringify(Object.fromEntries(Object.entries(reordered.records[0]!).reverse()))}\r\n`
    );
    expectSuccess(validateDocsMachineArtifactSet(
      reordered.artifacts,
      "positive/reordered-properties-and-crlf"
    ));

    for (const outcome of ["complete-passed", "legitimate-empty", "scan-incomplete"]) {
      const context = loadContext(outcome);
      assert.equal(context.artifacts.recordsNdjson.byteLength, 0, outcome);
      expectSuccess(validateDocsMachineArtifactSet(context.artifacts, `positive/${outcome}`));
    }
  });

  it("rejects focused mutations with locations and detects reversible generated drift", () => {
    type FailureCase = {
      expected: Partial<DocsMachineValidationDiagnostic> & {
        category: DocsMachineValidationDiagnostic["category"];
        logicalArtifact: string;
      };
      label: string;
      outcome?: string;
      mutate: (context: MutationContext) => void;
    };

    const failureCases: FailureCase[] = [
      {
        label: "run identity schema",
        expected: {
          category: "schema",
          logicalArtifact: "run.json",
          pointer: "/schemaVersion"
        },
        mutate: (context) => {
          context.run.schemaVersion = "invalid.run.identity";
          syncRun(context);
        }
      },
      {
        label: "record identity schema",
        expected: {
          category: "schema",
          logicalArtifact: "records.ndjson",
          index: 0,
          line: 1,
          pointer: "/schemaVersion"
        },
        mutate: (context) => {
          context.records[0]!.schemaVersion = "invalid.record.identity";
          syncRecords(context);
        }
      },
      {
        label: "record required field",
        expected: {
          category: "schema",
          logicalArtifact: "records.ndjson",
          index: 0,
          line: 1,
          pointer: "/message"
        },
        mutate: (context) => {
          delete context.records[0]!.message;
          syncRecords(context);
        }
      },
      {
        label: "run invalid UTF-8",
        expected: { category: "decoding", logicalArtifact: "run.json" },
        mutate: (context) => {
          context.artifacts.runJson = new Uint8Array([0xc3, 0x28]);
        }
      },
      {
        label: "records leading BOM",
        expected: { category: "decoding", logicalArtifact: "records.ndjson" },
        mutate: (context) => {
          context.artifacts.recordsNdjson = concatBytes(
            BOM,
            context.artifacts.recordsNdjson
          );
        }
      },
      {
        label: "records missing final LF",
        expected: { category: "framing", logicalArtifact: "records.ndjson", line: 1 },
        mutate: (context) => {
          context.artifacts.recordsNdjson = context.artifacts.recordsNdjson.slice(0, -1);
        }
      },
      {
        label: "records blank suffix",
        expected: {
          category: "framing",
          logicalArtifact: "records.ndjson",
          index: 1,
          line: 2
        },
        mutate: (context) => {
          context.artifacts.recordsNdjson = concatBytes(
            context.artifacts.recordsNdjson,
            bytes(" \t\r\n")
          );
        }
      },
      {
        label: "records malformed suffix",
        expected: {
          category: "syntax",
          logicalArtifact: "records.ndjson",
          index: 1,
          line: 2
        },
        mutate: (context) => {
          context.artifacts.recordsNdjson = concatBytes(
            context.artifacts.recordsNdjson,
            bytes("{]\n")
          );
        }
      },
      {
        label: "catalog fingerprint",
        expected: {
          category: "set-invariant",
          logicalArtifact: "run.json",
          relationship: "catalog-fingerprint"
        },
        mutate: (context) => {
          context.run.catalogFingerprint = `check-record/v1/catalog/sha256:${"f".repeat(64)}`;
          syncRun(context);
        }
      },
      {
        label: "mixed empty records generation",
        expected: {
          category: "set-invariant",
          logicalArtifact: "records.ndjson",
          relationship: "records-fingerprint"
        },
        mutate: (context) => {
          context.run.acceptance = [];
          context.run.references = { identities: [], evidence: [], relations: [] };
          context.run.decision = {
            policyId: null,
            views: [],
            readiness: [],
            blockWhen: null,
            gate: { status: "disabled", policyId: null }
          };
          context.records = [];
          syncRun(context);
          syncRecords(context);
        }
      },
      {
        label: "record ownership",
        expected: {
          category: "set-invariant",
          logicalArtifact: "records.ndjson",
          index: 0,
          line: 1,
          relationship: "record-check-ownership"
        },
        mutate: (context) => {
          context.records[0]!.checkId = "unknown-check";
          syncRecords(context);
        }
      },
      {
        label: "record semantic identity",
        expected: {
          category: "set-invariant",
          logicalArtifact: "records.ndjson",
          index: 0,
          line: 1,
          relationship: "record-identity"
        },
        mutate: (context) => {
          context.records[0]!.recordId = `check-record/v1/record/sha256:${"f".repeat(64)}`;
          syncRecords(context);
        }
      },
      {
        label: "record canonical order",
        expected: {
          category: "set-invariant",
          logicalArtifact: "records.ndjson",
          index: 1,
          line: 2,
          relationship: "record-canonical-order"
        },
        mutate: (context) => {
          context.records.push(structuredClone(context.records[0]!));
          syncRecords(context);
        }
      },
      {
        label: "duplicate Check identity",
        expected: {
          category: "set-invariant",
          logicalArtifact: "run.json",
          relationship: "check-definition"
        },
        mutate: (context) => {
          const checks = context.run.checks as JsonRecord[];
          checks.push(structuredClone(checks[0]!));
          context.run.catalogFingerprint = catalogFingerprint(
            checks as unknown as Parameters<typeof catalogFingerprint>[0]
          );
          syncRun(context);
        }
      },
      {
        label: "dangling decision record",
        expected: {
          category: "set-invariant",
          logicalArtifact: "run.json",
          relationship: "decision-record-reference"
        },
        mutate: (context) => {
          const decision = context.run.decision as JsonRecord;
          const views = decision.views as JsonRecord[];
          views[0]!.recordIds = [
            `check-record/v1/record/sha256:${"f".repeat(64)}`
          ];
          syncRun(context);
        }
      },
      {
        label: "gate decision state",
        expected: {
          category: "set-invariant",
          logicalArtifact: "run.json",
          relationship: "decision-state"
        },
        mutate: (context) => {
          const decision = context.run.decision as JsonRecord;
          (decision.gate as JsonRecord).status = "passed";
          syncRun(context);
        }
      },
      {
        label: "incomplete gate readiness state",
        outcome: "scan-incomplete",
        expected: {
          category: "set-invariant",
          logicalArtifact: "run.json",
          relationship: "decision-state"
        },
        mutate: (context) => {
          const decision = context.run.decision as JsonRecord;
          const readiness = decision.readiness as JsonRecord[];
          readiness[0]!.reason = "no-eligible-input";
          syncRun(context);
        }
      }
    ];

    for (const testCase of failureCases) {
      const context = loadContext(testCase.outcome ?? "gate-failed");
      testCase.mutate(context);
      const artifactRoot = `mutations/${slug(testCase.label)}`;
      const diagnostic = expectFailure(
        validateDocsMachineArtifactSet(context.artifacts, artifactRoot),
        testCase.label
      );
      assert.equal(
        diagnostic.path,
        `${artifactRoot}/${testCase.expected.logicalArtifact}`,
        testCase.label
      );
      for (const [key, expected] of Object.entries(testCase.expected)) {
        assert.deepEqual(
          diagnostic[key as keyof DocsMachineValidationDiagnostic],
          expected,
          `${testCase.label}: ${key}`
        );
      }
      assert.ok(diagnostic.message.length > 0, testCase.label);
    }

    proveGeneratedDrift(
      "docs/schemas/vibe-check-record.schema.json",
      checkPublishedMachineSchemas,
      /docs\/schemas\/vibe-check-record\.schema\.json/
    );
    proveGeneratedDrift(
      "docs/examples/artifacts/complete-passed/run.json",
      checkPublishedMachineExamples,
      /docs\/examples\/artifacts\/complete-passed\/run\.json/
    );
  });

  it("enforces owning record-type field contracts beyond the generic record schema", () => {
    type FieldContractCase = {
      label: string;
      mutate: (context: MutationContext) => void;
      pointer: string;
    };
    const fieldContractCases: readonly FieldContractCase[] = [
      {
        label: "undeclared field",
        pointer: "/fields/extraUndeclared",
        mutate: (context) => {
          recordFields(context).extraUndeclared = true;
        }
      },
      {
        label: "missing required field",
        pointer: "/fields/category",
        mutate: (context) => {
          delete recordFields(context).category;
        }
      },
      {
        label: "wrong string field type",
        pointer: "/fields/category",
        mutate: (context) => {
          recordFields(context).category = 7;
        }
      },
      {
        label: "unsafe integer field",
        pointer: "/fields/value",
        mutate: (context) => {
          recordFields(context).value = Number.MAX_SAFE_INTEGER + 1;
        }
      },
      {
        label: "wrong boolean field type",
        pointer: "/fields/zFlag",
        mutate: (context) => {
          const recordType = firstRecordType(context);
          (recordType.fields as JsonRecord[]).push({
            fieldId: "zFlag",
            required: false,
            valueType: "boolean"
          });
          recordFields(context).zFlag = "not-boolean";
          refreshCatalogFingerprint(context);
        }
      },
      {
        label: "wrong number field type",
        pointer: "/fields/value",
        mutate: (context) => {
          const valueDefinition = (firstRecordType(context).fields as JsonRecord[])
            .find((field) => field.fieldId === "value");
          assert.ok(valueDefinition !== undefined);
          valueDefinition.valueType = "number";
          recordFields(context).value = "not-number";
          refreshCatalogFingerprint(context);
        }
      }
    ];

    for (const testCase of fieldContractCases) {
      const context = loadContext("gate-failed");
      testCase.mutate(context);
      syncRun(context);
      syncRecords(context);
      const diagnostic = expectFailure(
        validateDocsMachineArtifactSet(context.artifacts, `field-contract/${slug(testCase.label)}`),
        testCase.label
      );
      assert.equal(diagnostic.category, "set-invariant", testCase.label);
      assert.equal(diagnostic.logicalArtifact, "records.ndjson", testCase.label);
      assert.equal(diagnostic.index, 0, testCase.label);
      assert.equal(diagnostic.line, 1, testCase.label);
      assert.equal(diagnostic.pointer, testCase.pointer, testCase.label);
      assert.equal(diagnostic.relationship, "record-field-contract", testCase.label);
    }

    const nonFinite = loadContext("gate-failed");
    const valueDefinition = (firstRecordType(nonFinite).fields as JsonRecord[])
      .find((field) => field.fieldId === "value");
    assert.ok(valueDefinition !== undefined);
    valueDefinition.valueType = "number";
    recordFields(nonFinite).value = Number.POSITIVE_INFINITY;
    refreshCatalogFingerprint(nonFinite);
    const failure = validateArtifactSetInvariants(
      nonFinite.run as unknown as RunShape,
      nonFinite.records as unknown as readonly RecordShape[],
      "field-contract/non-finite-number"
    );
    assert.equal(failure?.diagnostic.relationship, "record-field-contract");
    assert.equal(failure?.diagnostic.pointer, "/fields/value");
  });

  it("rejects invalid Core Check projections even with a recalculated catalog fingerprint", () => {
    type DefinitionInvariantCase = {
      readonly label: string;
      readonly mutate: (context: MutationContext) => void;
    };
    const definitionInvariantCases: readonly DefinitionInvariantCase[] = [
      {
        label: "duplicate record type",
        mutate: (context) => {
          const recordTypes = (context.run.checks as JsonRecord[])[0]!.recordTypes as JsonRecord[];
          recordTypes.push(structuredClone(recordTypes[0]!));
        }
      },
      {
        label: "noncanonical record type order",
        mutate: (context) => {
          const recordTypes = (context.run.checks as JsonRecord[])[0]!.recordTypes as JsonRecord[];
          recordTypes.push({ recordTypeId: "alpha-finding", fields: [], identityFields: [] });
        }
      },
      {
        label: "duplicate field",
        mutate: (context) => {
          const fields = firstRecordType(context).fields as JsonRecord[];
          fields.push(structuredClone(fields[0]!));
        }
      },
      {
        label: "noncanonical field order",
        mutate: (context) => {
          const fields = firstRecordType(context).fields as JsonRecord[];
          fields.reverse();
        }
      },
      {
        label: "undeclared identity field",
        mutate: (context) => {
          firstRecordType(context).identityFields = ["missing"];
        }
      },
      {
        label: "optional identity field",
        mutate: (context) => {
          const fields = firstRecordType(context).fields as JsonRecord[];
          const category = fields.find((field) => field.fieldId === "category");
          assert.ok(category !== undefined);
          category.required = false;
        }
      },
      {
        label: "duplicate identity field",
        mutate: (context) => {
          firstRecordType(context).identityFields = ["category", "category"];
        }
      },
      {
        label: "noncanonical identity field order",
        mutate: (context) => {
          firstRecordType(context).identityFields = ["value", "category"];
        }
      },
      {
        label: "incompatible policy field operand",
        mutate: (context) => {
          const policy = firstRecordType(context).policy as JsonRecord;
          const operand = (policy.operands as JsonRecord[])[0]!;
          operand.valueType = "number";
        }
      },
      {
        label: "noncanonical policy operand order",
        mutate: (context) => {
          const policy = firstRecordType(context).policy as JsonRecord;
          (policy.operands as JsonRecord[]).push({
            operandId: "aValue",
            valueType: "number",
            source: { kind: "field", fieldId: "value" }
          });
        }
      },
      {
        label: "duplicate policy relation",
        mutate: (context) => {
          const policy = firstRecordType(context).policy as JsonRecord;
          const relations = policy.relations as string[];
          relations.push(relations[0]!);
        }
      },
      {
        label: "noncanonical policy relation order",
        mutate: (context) => {
          const policy = firstRecordType(context).policy as JsonRecord;
          (policy.relations as string[]).push("alpha");
        }
      }
    ];

    for (const testCase of definitionInvariantCases) {
      const context = loadContext("gate-failed");
      testCase.mutate(context);
      refreshCatalogFingerprint(context);
      syncRun(context);
      syncRecords(context);
      const diagnostic = expectFailure(
        validateDocsMachineArtifactSet(context.artifacts, `definition/${slug(testCase.label)}`),
        testCase.label
      );
      assert.equal(diagnostic.relationship, "check-definition", testCase.label);
      assertProductValidatorRejects(context.artifacts, testCase.label);
    }
  });
});

describe("historical v2 machine schemas", () => {
  it("keeps the retired run and record schema bytes under their explicit historical path", () => {
    assert.equal(
      sha256("docs/schemas/historical/v2/vibe-check-run.schema.json"),
      "5406c85d854cb4812c80797c255295d6a003849e887cf9bdcecc3699ad5f50a5"
    );
    assert.equal(
      sha256("docs/schemas/historical/v2/vibe-check-record.schema.json"),
      "0c22384394741db6c740cdaf2312c260bf69c5c2d34f3501410267560cba9ff3"
    );
  });
});

function loadContext(outcome: string): MutationContext {
  const root = `docs/examples/artifacts/${outcome}`;
  const artifacts = {
    runJson: fs.readFileSync(toAbs(`${root}/run.json`)),
    recordsNdjson: fs.readFileSync(toAbs(`${root}/records.ndjson`))
  };
  return {
    artifacts,
    run: JSON.parse(decoder.decode(artifacts.runJson)) as JsonRecord,
    records: decoder.decode(artifacts.recordsNdjson).trimEnd().split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as JsonRecord)
  };
}

function syncRun(context: MutationContext): void {
  context.artifacts.runJson = bytes(JSON.stringify(context.run));
}

function syncRecords(context: MutationContext): void {
  context.artifacts.recordsNdjson = context.records.length === 0
    ? new Uint8Array()
    : bytes(`${context.records.map((record) => JSON.stringify(record)).join("\n")}\n`);
}

function firstRecordType(context: MutationContext): JsonRecord {
  const checks = context.run.checks as JsonRecord[];
  const recordTypes = checks[0]!.recordTypes as JsonRecord[];
  return recordTypes[0]!;
}

function recordFields(context: MutationContext): JsonRecord {
  return context.records[0]!.fields as JsonRecord;
}

function refreshCatalogFingerprint(context: MutationContext): void {
  context.run.catalogFingerprint = catalogFingerprint(
    context.run.checks as unknown as Parameters<typeof catalogFingerprint>[0]
  );
}

function bytes(source: string): Uint8Array {
  return encoder.encode(source);
}

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((sum, part) => sum + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return result;
}

function expectSuccess(
  result: ReturnType<typeof validateDocsMachineArtifactSet>
): void {
  if (!result.ok) assert.fail(`${result.diagnostic.path}: ${result.diagnostic.message}`);
}

function expectFailure(
  result: ReturnType<typeof validateDocsMachineArtifactSet>,
  label: string
): DocsMachineValidationDiagnostic {
  if (result.ok) assert.fail(`${label}: expected validation failure`);
  assert.equal(Object.hasOwn(result, "value"), false, label);
  return result.diagnostic;
}

function assertProductValidatorRejects(
  artifacts: MutationContext["artifacts"],
  label: string
): void {
  assert.equal(validateMachinePublicationSetV3(artifacts).ok, false, label);
}

function proveGeneratedDrift(
  relativePath: string,
  check: () => void,
  expectedPath: RegExp
): void {
  const absolutePath = toAbs(relativePath);
  const originalReadFileSync = fs.readFileSync;
  fs.readFileSync = ((...args: unknown[]): unknown => {
    const actual = Reflect.apply(originalReadFileSync, fs, args) as unknown;
    if (args[0] !== absolutePath) return actual;
    if (typeof actual === "string") return `${actual} `;
    if (Buffer.isBuffer(actual)) return Buffer.concat([actual, Buffer.from(" ")]);
    return concatBytes(actual as Uint8Array, bytes(" "));
  }) as typeof fs.readFileSync;
  try {
    assert.throws(check, expectedPath);
  } finally {
    fs.readFileSync = originalReadFileSync;
  }
  assert.doesNotThrow(check);
}

function slug(value: string): string {
  return value.replaceAll(" ", "-");
}

function sha256(relativePath: string): string {
  return createHash("sha256").update(fs.readFileSync(toAbs(relativePath))).digest("hex");
}
