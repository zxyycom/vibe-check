import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createCoreCheckSession } from "../../../src/product/quality-core/check-record/core-session.ts";
import { projectHumanStatus } from "../../../src/product/quality-core/check-record/human-status.ts";
import type { CheckDefinition } from "../../../src/product/quality-core/check-record/model.ts";
import type {
  DecisionEvidence,
  ReferenceFacts
} from "../../../src/product/quality-core/check-record/policy-model.ts";
import {
  createPublicationModelV3,
  projectMachinePublicationV3,
  serializeMachinePublicationV3
} from "../../../src/product/quality-core/output/publication-v3/index.ts";

export interface FixtureRecord {
  readonly level: "error" | "info" | "warning";
  readonly message: string;
}

const definition = {
  checkId: "annotation-fixture-check",
  displayName: "Annotation Fixture Check",
  recordTypes: [{
    recordTypeId: "annotation-fixture-record",
    fields: [{ fieldId: "ordinal", valueType: "integer", required: true }],
    identityFields: ["ordinal"]
  }]
} as const satisfies CheckDefinition;

export function writeCanonicalPublicationFixture(
  artifactDirectory: string,
  records: readonly FixtureRecord[]
): Readonly<{ recordsNdjson: string; runJson: string }> {
  const snapshot = createSnapshot(records);
  const decision: DecisionEvidence = {
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  };
  const verificationOutput = false;
  const model = createPublicationModelV3({
    humanStatus: projectHumanStatus({ snapshot, decision, verificationOutput }),
    invocation: {
      invocationId: "invocation/v1:annotation-consumer-fixture",
      projectRoot: ".",
      timestamp: "2026-08-12T00:00:00.000Z"
    },
    snapshot,
    references: [],
    referenceFacts: { evidence: [], relations: [] } satisfies ReferenceFacts,
    decision,
    verificationOutput
  });
  const candidates = serializeMachinePublicationV3(projectMachinePublicationV3(model));
  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(join(artifactDirectory, "run.json"), candidates.runJson, "utf8");
  writeFileSync(join(artifactDirectory, "records.ndjson"), candidates.recordsNdjson, "utf8");
  return candidates;
}

function createSnapshot(records: readonly FixtureRecord[]) {
  const session = createCoreCheckSession([{ definition }]);
  const scope = session.openCheckScope(definition.checkId);
  if (records.length === 0) {
    scope.settle({ status: "not-applicable" });
    return session.freeze();
  }
  for (const [index, record] of records.entries()) {
    scope.records.report({
      recordTypeId: definition.recordTypes[0].recordTypeId,
      level: record.level,
      semanticSubject: `annotation-fixture-${index + 1}`,
      message: record.message,
      fields: { ordinal: index + 1 },
      location: { path: `src/fixture-${index + 1}.ts`, line: index + 1, column: 1 }
    });
  }
  scope.settle({ status: "completed", verdict: "failed" });
  return session.freeze();
}
