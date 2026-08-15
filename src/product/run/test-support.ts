import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  projectMachinePublicationV2,
  validateMachinePublicationSetV2
} from "../quality-core/output/publication-v2/index.ts";
import { createDeterministicCheckRunId } from "../quality-core/check-record/identity.ts";
import { type run } from "./index.ts";

export function assertPublishedResult(result: Awaited<ReturnType<typeof run>>, root: string): void {
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") throw new Error("Expected completed Package Run result");
  assert.equal(result.decision.policyId, "project-gate");
  assert.equal(result.decision.gate.status, "passed");
  const [checkRun] = result.snapshot.runs;
  if (checkRun === undefined) throw new Error("Expected Package Run to produce a Check Run");
  assert.equal(checkRun.result?.verdict, "passed");
  assert.equal(checkRun.checkRunId, createDeterministicCheckRunId({
    checkId: checkRun.checkId,
    invocationKey: result.model.invocation.invocationId
  }));
  assert.deepEqual(result.effects, {
    cache: { enabled: true, status: "not-run" },
    logs: { enabled: false, status: "disabled" },
    output: { enabled: true, status: "succeeded" },
    progress: { enabled: false, status: "disabled" }
  });
  const machine = readMachinePublication(root);
  assert.equal(machine.run.catalogFingerprint, result.model.snapshot.catalogFingerprint);
  assert.deepEqual(machine.run.decision, projectMachinePublicationV2(result.model).run.decision);
  assert.doesNotMatch(JSON.stringify(result), /createTaskPlan|"execute"/);
}

function readMachinePublication(root: string) {
  const directory = join(root, "published");
  const validated = validateMachinePublicationSetV2({
    recordsNdjson: readFileSync(join(directory, "records.ndjson")),
    runJson: readFileSync(join(directory, "run.json"))
  });
  if (!validated.ok) {
    throw new TypeError(`Published machine artifacts are invalid: ${validated.diagnostic.message}`);
  }
  return validated.value;
}
