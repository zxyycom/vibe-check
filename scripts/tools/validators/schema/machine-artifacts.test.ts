import { strict as assert } from "node:assert";
import fs from "node:fs";
import { describe, it } from "node:test";

import {
  checkPublishedMachineExamples
} from "../../../docs/machine-examples.ts";
import {
  checkPublishedMachineSchemas
} from "../../../docs/machine-schemas.ts";
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

interface MutableMetrics extends JsonRecord {
  gate: JsonRecord;
  metadata: JsonRecord;
  scanCompleteness: {
    capabilities: JsonRecord[];
    overall: unknown;
  };
  warnings: {
    all: JsonRecord[];
    changed: JsonRecord[];
    regressions: JsonRecord[];
  };
}

interface MutableArtifactBytes {
  metricsJson: Uint8Array;
  warningsAllNdjson: Uint8Array;
  warningsNdjson: Uint8Array;
}

interface MutationContext {
  artifacts: MutableArtifactBytes;
  metrics: MutableMetrics;
}

describe("independent docs machine artifact validation", () => {
  it("accepts exactly the five canonical sets and positive grammar variants", () => {
    assert.equal(validatePublishedMachineArtifactExamples(), 5);

    const reordered = loadContext("gate-failed");
    const reorderedMetrics = Object.fromEntries(
      Object.entries(reordered.metrics).reverse()
    );
    const reorderedWarning = Object.fromEntries(
      Object.entries(reordered.metrics.warnings.all[0]!).reverse()
    );
    reordered.artifacts.metricsJson = bytes(
      `\t\r\n ${JSON.stringify(reorderedMetrics)} \r\n`
    );
    reordered.artifacts.warningsAllNdjson = bytes(
      `\t ${JSON.stringify(reorderedWarning)}\r\n`
    );
    reordered.artifacts.warningsNdjson = bytes(
      `\t ${JSON.stringify(reorderedWarning)}\r\n`
    );
    expectSuccess(validateDocsMachineArtifactSet(
      reordered.artifacts,
      "positive/reordered-and-crlf"
    ));

    const emptyReason = loadContext("gate-failed");
    setAcceptedReasonOnWarningCopies(emptyReason.metrics, "");
    syncArtifactSet(emptyReason);
    expectSuccess(validateDocsMachineArtifactSet(
      emptyReason.artifacts,
      "positive/empty-accepted-reason-remains-blocking"
    ));

    const whitespaceReason = loadContext("gate-failed");
    setAcceptedReasonOnWarningCopies(whitespaceReason.metrics, "   ");
    whitespaceReason.metrics.gate.blockingWarningCount = 0;
    whitespaceReason.metrics.gate.blockingWarnings = [];
    whitespaceReason.metrics.gate.status = "passed";
    syncArtifactSet(whitespaceReason);
    expectSuccess(validateDocsMachineArtifactSet(
      whitespaceReason.artifacts,
      "positive/nonempty-whitespace-reason-is-accepted"
    ));
  });

  it("rejects focused mutations with locations and detects reversible generated drift", () => {
    type FailureCase = {
      expected: Partial<DocsMachineValidationDiagnostic> & {
        category: DocsMachineValidationDiagnostic["category"];
        logicalArtifact: string;
      };
      label: string;
      mutate: (context: MutationContext) => void;
    };

    const failureCases: FailureCase[] = [
      {
        expected: {
          category: "schema",
          logicalArtifact: "metrics.json",
          pointer: "/metadata/schemaVersion"
        },
        label: "metrics identity",
        mutate: (context) => {
          context.metrics.metadata.schemaVersion = "invalid.metrics.identity";
          syncMetrics(context);
        }
      },
      {
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson",
          pointer: "/schemaVersion"
        },
        label: "warning identity",
        mutate: (context) => {
          const warning = firstWarning(context);
          warning.schemaVersion = "invalid.warning.identity";
          context.artifacts.warningsAllNdjson = warningStream([warning]);
        }
      },
      {
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson",
          pointer: "/message"
        },
        label: "representative required field",
        mutate: (context) => {
          const warning = firstWarning(context);
          delete warning.message;
          context.artifacts.warningsAllNdjson = warningStream([warning]);
        }
      },
      {
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson",
          pointer: "/value"
        },
        label: "representative field type",
        mutate: (context) => {
          const warning = firstWarning(context);
          warning.value = "8";
          context.artifacts.warningsAllNdjson = warningStream([warning]);
        }
      },
      {
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson",
          pointer: "/level"
        },
        label: "representative closed enum",
        mutate: (context) => {
          const warning = firstWarning(context);
          warning.level = "urgent";
          context.artifacts.warningsAllNdjson = warningStream([warning]);
        }
      },
      {
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson",
          pointer: "/baselineValue"
        },
        label: "representative nullability",
        mutate: (context) => {
          const warning = firstWarning(context);
          warning.baselineValue = false;
          context.artifacts.warningsAllNdjson = warningStream([warning]);
        }
      },
      {
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson",
          pointer: "/unexpected"
        },
        label: "representative closed shape",
        mutate: (context) => {
          const warning = firstWarning(context);
          warning.unexpected = true;
          context.artifacts.warningsAllNdjson = warningStream([warning]);
        }
      },
      {
        expected: {
          category: "decoding",
          logicalArtifact: "metrics.json"
        },
        label: "metrics invalid UTF-8",
        mutate: (context) => {
          context.artifacts.metricsJson = new Uint8Array([0xc3, 0x28]);
        }
      },
      {
        expected: {
          category: "decoding",
          logicalArtifact: "metrics.json"
        },
        label: "metrics leading BOM",
        mutate: (context) => {
          context.artifacts.metricsJson = concatBytes(
            BOM,
            context.artifacts.metricsJson
          );
        }
      },
      {
        expected: {
          category: "schema",
          logicalArtifact: "metrics.json",
          pointer: ""
        },
        label: "metrics non-object root",
        mutate: (context) => {
          context.artifacts.metricsJson = bytes("[]");
        }
      },
      {
        expected: {
          category: "syntax",
          logicalArtifact: "metrics.json"
        },
        label: "metrics second root",
        mutate: (context) => {
          context.artifacts.metricsJson = concatBytes(
            context.artifacts.metricsJson,
            bytes("\n{}")
          );
        }
      },
      {
        expected: {
          category: "decoding",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson"
        },
        label: "warning invalid UTF-8",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson = new Uint8Array([
            0xc3,
            0x28,
            0x0a
          ]);
        }
      },
      {
        expected: {
          category: "decoding",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson"
        },
        label: "warning leading BOM",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson = concatBytes(
            BOM,
            context.artifacts.warningsAllNdjson
          );
        }
      },
      {
        expected: {
          category: "framing",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson"
        },
        label: "warning missing final LF",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson =
            context.artifacts.warningsAllNdjson.slice(0, -1);
        }
      },
      {
        expected: {
          category: "framing",
          index: 1,
          line: 2,
          logicalArtifact: "warnings-all.ndjson"
        },
        label: "warning extra final LF",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson = concatBytes(
            context.artifacts.warningsAllNdjson,
            bytes("\n")
          );
        }
      },
      {
        expected: {
          category: "framing",
          index: 1,
          line: 2,
          logicalArtifact: "warnings-all.ndjson"
        },
        label: "warning blank record",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson = concatBytes(
            context.artifacts.warningsAllNdjson,
            bytes(" \t\r\n")
          );
        }
      },
      {
        expected: {
          category: "syntax",
          index: 1,
          line: 2,
          logicalArtifact: "warnings-all.ndjson"
        },
        label: "warning malformed record after valid prefix",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson = concatBytes(
            context.artifacts.warningsAllNdjson,
            bytes("{]\n")
          );
        }
      },
      {
        expected: {
          category: "schema",
          index: 0,
          line: 1,
          logicalArtifact: "warnings-all.ndjson",
          pointer: ""
        },
        label: "warning non-object record",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson = bytes("[]\n");
        }
      },
      {
        expected: {
          category: "set-invariant",
          index: 0,
          logicalArtifact: "warnings.ndjson",
          relationship: "warnings-stream-equals-changed"
        },
        label: "changed stream equality",
        mutate: (context) => {
          context.artifacts.warningsNdjson = new Uint8Array();
        }
      },
      {
        expected: {
          category: "set-invariant",
          index: 0,
          logicalArtifact: "warnings-all.ndjson",
          relationship: "warnings-all-stream-equals-all"
        },
        label: "all stream equality",
        mutate: (context) => {
          context.artifacts.warningsAllNdjson = new Uint8Array();
        }
      },
      {
        expected: {
          category: "set-invariant",
          index: 0,
          logicalArtifact: "metrics.json",
          pointer: "/warnings/changed/0",
          relationship: "changed-subsequence-of-all"
        },
        label: "changed channel subsequence",
        mutate: (context) => {
          context.metrics.warnings.all = [];
          syncArtifactSet(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          index: 0,
          logicalArtifact: "metrics.json",
          pointer: "/warnings/regressions/0",
          relationship: "regressions-subsequence-of-changed"
        },
        label: "regressions channel subsequence",
        mutate: (context) => {
          context.metrics.warnings.changed = [];
          syncArtifactSet(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          index: 2,
          logicalArtifact: "metrics.json",
          pointer: "/scanCompleteness/capabilities/2/capabilityId",
          relationship: "capability-membership"
        },
        label: "duplicate stable capability",
        mutate: (context) => {
          context.metrics.scanCompleteness.capabilities[2] = structuredClone(
            context.metrics.scanCompleteness.capabilities[1]!
          );
          syncMetrics(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          logicalArtifact: "metrics.json",
          pointer: "/scanCompleteness/capabilities",
          relationship: "capability-membership"
        },
        label: "missing stable capability",
        mutate: (context) => {
          context.metrics.scanCompleteness.capabilities.pop();
          syncMetrics(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          logicalArtifact: "metrics.json",
          pointer: "/scanCompleteness/overall",
          relationship: "completeness-reduction"
        },
        label: "completeness reduction",
        mutate: (context) => {
          context.metrics.scanCompleteness.overall = "empty";
          syncMetrics(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          logicalArtifact: "metrics.json",
          pointer: "/gate/evaluatedChannel",
          relationship: "gate-policy-channel"
        },
        label: "evaluated gate policy channel",
        mutate: (context) => {
          context.metrics.gate.evaluatedChannel = "all";
          syncMetrics(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          logicalArtifact: "metrics.json",
          pointer: "/gate/evaluatedWarningCount",
          relationship: "gate-evaluated-count"
        },
        label: "evaluated gate channel count",
        mutate: (context) => {
          context.metrics.gate.evaluatedWarningCount = 2;
          syncMetrics(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          index: 0,
          logicalArtifact: "metrics.json",
          pointer: "/gate/blockingWarnings",
          relationship: "gate-blocking-warnings"
        },
        label: "empty accepted reason remains blocking",
        mutate: (context) => {
          setAcceptedReasonOnWarningCopies(context.metrics, "");
          context.metrics.gate.blockingWarningCount = 0;
          context.metrics.gate.blockingWarnings = [];
          context.metrics.gate.status = "passed";
          syncArtifactSet(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          index: 0,
          logicalArtifact: "metrics.json",
          pointer: "/gate/blockingWarnings",
          relationship: "gate-blocking-warnings"
        },
        label: "evaluated gate blocking order",
        mutate: (context) => {
          const original = firstWarning(context);
          const second = structuredClone(original);
          second.ruleId = "second.blocking.warning";
          second.message = "Second blocking warning.";
          for (const channel of ["all", "changed", "regressions"] as const) {
            context.metrics.warnings[channel].push(structuredClone(second));
          }
          context.metrics.gate.blockingWarningCount = 2;
          context.metrics.gate.blockingWarnings = [
            structuredClone(second),
            structuredClone(original)
          ];
          context.metrics.gate.evaluatedWarningCount = 2;
          syncArtifactSet(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          logicalArtifact: "metrics.json",
          pointer: "/gate/blockingWarningCount",
          relationship: "gate-blocking-count"
        },
        label: "evaluated gate blocking count",
        mutate: (context) => {
          context.metrics.gate.blockingWarningCount = 2;
          syncMetrics(context);
        }
      },
      {
        expected: {
          category: "set-invariant",
          logicalArtifact: "metrics.json",
          pointer: "/gate/status",
          relationship: "gate-status"
        },
        label: "evaluated gate status",
        mutate: (context) => {
          context.metrics.gate.status = "passed";
          syncMetrics(context);
        }
      }
    ];

    for (const testCase of failureCases) {
      const context = loadContext("gate-failed");
      testCase.mutate(context);
      const artifactRoot = `mutations/${slug(testCase.label)}`;
      const result = validateDocsMachineArtifactSet(
        context.artifacts,
        artifactRoot
      );
      const diagnostic = expectFailure(result, testCase.label);
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
      "docs/schemas/vibe-check-warning.schema.json",
      checkPublishedMachineSchemas,
      /docs\/schemas\/vibe-check-warning\.schema\.json/
    );
    proveGeneratedDrift(
      "docs/examples/artifacts/complete-passed/metrics.json",
      checkPublishedMachineExamples,
      /docs\/examples\/artifacts\/complete-passed\/metrics\.json/
    );
  });
});

function loadContext(outcome: string): MutationContext {
  const root = `docs/examples/artifacts/${outcome}`;
  const artifacts: MutableArtifactBytes = {
    metricsJson: fs.readFileSync(toAbs(`${root}/metrics.json`)),
    warningsAllNdjson: fs.readFileSync(toAbs(`${root}/warnings-all.ndjson`)),
    warningsNdjson: fs.readFileSync(toAbs(`${root}/warnings.ndjson`))
  };
  const metrics = JSON.parse(decoder.decode(artifacts.metricsJson)) as MutableMetrics;
  return { artifacts, metrics };
}

function firstWarning(context: MutationContext): JsonRecord {
  return structuredClone(context.metrics.warnings.all[0]!);
}

function setAcceptedReasonOnWarningCopies(
  metrics: MutableMetrics,
  acceptedReason: string
): void {
  const gateBlocking = metrics.gate.blockingWarnings as JsonRecord[];
  for (const warnings of [
    metrics.warnings.all,
    metrics.warnings.changed,
    metrics.warnings.regressions,
    gateBlocking
  ]) {
    warnings[0]!.acceptedReason = acceptedReason;
  }
}

function syncArtifactSet(context: MutationContext): void {
  syncMetrics(context);
  context.artifacts.warningsAllNdjson = warningStream(
    context.metrics.warnings.all
  );
  context.artifacts.warningsNdjson = warningStream(
    context.metrics.warnings.changed
  );
}

function syncMetrics(context: MutationContext): void {
  context.artifacts.metricsJson = bytes(JSON.stringify(context.metrics));
}

function warningStream(warnings: readonly JsonRecord[]): Uint8Array {
  return warnings.length === 0
    ? new Uint8Array()
    : bytes(`${warnings.map((warning) => JSON.stringify(warning)).join("\n")}\n`);
}

function bytes(source: string): Uint8Array {
  return encoder.encode(source);
}

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array {
  const result = new Uint8Array(
    parts.reduce((length, part) => length + part.byteLength, 0)
  );
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
  if (!result.ok) {
    assert.fail(`${result.diagnostic.path}: ${result.diagnostic.message}`);
  }
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
    if (Buffer.isBuffer(actual)) {
      return Buffer.concat([actual, Buffer.from(" ")]);
    }
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
