import { strict as assert } from "node:assert";
import fs from "node:fs";
import { describe, it } from "node:test";

import { checkPublishedMachineExamples } from "../../../docs/machine-examples.ts";
import { checkPublishedMachineSchemas } from "../../../docs/machine-schemas.ts";
import { toAbs } from "../repo/paths.ts";
import {
  validateDocsMachineArtifactSet,
  validatePublishedMachineArtifactExamples,
  type DocsMachineValidationDiagnostic
} from "./machine-artifacts.ts";

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
        label: "record ownership",
        expected: {
          category: "set-invariant",
          logicalArtifact: "records.ndjson",
          index: 0,
          line: 1,
          relationship: "record-run-ownership"
        },
        mutate: (context) => {
          context.records[0]!.checkRunId = `check-run/v1:${"f".repeat(64)}`;
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
        label: "completeness reduction",
        expected: {
          category: "set-invariant",
          logicalArtifact: "run.json",
          relationship: "completeness-reduction"
        },
        mutate: (context) => {
          (context.run.completeness as JsonRecord).selectedRunCount = 2;
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
