import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  resolveCheckCatalog,
  type CheckExecutionBinding
} from "../../../src/product/quality-core/check-record/catalog.ts";
import { coordinateCheckRecords } from "../../../src/product/quality-core/check-record/coordinator.ts";
import { projectHumanStatus } from "../../../src/product/quality-core/check-record/human-status.ts";
import type { CheckDefinition } from "../../../src/product/quality-core/check-record/model.ts";
import type { DecisionEvidence, ReferenceFacts } from "../../../src/product/quality-core/check-record/policy-model.ts";
import {
  createPublicationModelV2,
  projectMachinePublicationV2,
  serializeMachinePublicationV2
} from "../../../src/product/quality-core/output/publication-v2/index.ts";

const ANNOTATION_FIXTURE_WORK_HANDLE = "work-handle/v1:annotation-consumer";
const ANNOTATION_FIXTURE_SCHEDULER_POLICY = Object.freeze({ maxParallel: 4 });

export interface FixtureRecord {
  readonly level: "error" | "info" | "warning";
  readonly message: string;
}

export async function writeCanonicalPublicationFixture(
  artifactDirectory: string,
  records: readonly FixtureRecord[]
): Promise<Readonly<{ recordsNdjson: string; runJson: string }>> {
  const definition = {
    checkId: "annotation-fixture-check",
    displayName: "Annotation Fixture Check",
    recordTypes: [{
      recordTypeId: "annotation-fixture-record",
      fields: [{ fieldId: "ordinal", valueType: "integer", required: true }],
      identityFields: ["ordinal"]
    }]
  } as const;
  const snapshot = await coordinateCheckRecords(catalogFor(definition, async (ports) => {
    for (const [index, record] of records.entries()) {
      ports.submitRecord({
        recordTypeId: "annotation-fixture-record",
        level: record.level,
        semanticSubject: `annotation-fixture-${index + 1}`,
        message: record.message,
        fields: { ordinal: index + 1 },
        location: { path: `src/fixture-${index + 1}.ts`, line: index + 1, column: 1 }
      });
    }
    if (records.length > 0) ports.acknowledge(ANNOTATION_FIXTURE_WORK_HANDLE);
    return records.length === 0 ? { verdict: "not-applicable" } : { verdict: "failed" };
  }, records.length > 0), { schedulerPolicy: ANNOTATION_FIXTURE_SCHEDULER_POLICY });
  const decision: DecisionEvidence = {
    policyId: null,
    acceptance: [],
    views: [],
    readiness: [],
    blockWhen: null,
    gate: { status: "disabled", policyId: null }
  };
  const verificationOutput = false;
  const candidates = serializeMachinePublicationV2(projectMachinePublicationV2(createPublicationModelV2({
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
  })));
  mkdirSync(artifactDirectory, { recursive: true });
  writeFileSync(join(artifactDirectory, "run.json"), candidates.runJson, "utf8");
  writeFileSync(join(artifactDirectory, "records.ndjson"), candidates.recordsNdjson, "utf8");
  return candidates;
}

function catalogFor(
  definition: CheckDefinition,
  execute: CheckExecutionBinding,
  applicable: boolean
) {
  const catalog = resolveCheckCatalog({
    invocationKey: `annotation-consumer-${applicable}`,
    definitions: [definition],
    bindings: [{ checkId: definition.checkId, execute }],
    schedules: [{ checkId: definition.checkId, requiresChecks: [] }],
    selectedCheckIds: [definition.checkId],
    resolveApplicability: () => applicable
      ? { status: "applicable", workHandles: [ANNOTATION_FIXTURE_WORK_HANDLE] }
      : { status: "not-applicable" }
  });
  if (!catalog.ok) throw new Error("Expected valid annotation publication fixture catalog");
  return catalog.value;
}
