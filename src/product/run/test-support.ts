import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  validateMachinePublicationSetV3
} from "../quality-core/output/publication-v3/index.ts";
import { createCatalogFingerprint } from "../quality-core/check-record/identity.ts";
import { type run } from "./index.ts";

export function assertPublishedResult(result: Awaited<ReturnType<typeof run>>, root: string): void {
  assert.equal(result.kind, "completed");
  if (result.kind !== "completed") throw new Error("Expected completed Package Run result");
  assert.equal(result.decision.policyId, "project-gate");
  assert.equal(result.decision.gate.status, "passed");
  const [check] = result.snapshot.checks;
  if (check === undefined) throw new Error("Expected Package Run to produce a Core Check");
  assert.deepEqual(check.outcome, { kind: "completed", verdict: "passed" });
  assert.deepEqual(result.effects, {
    cache: { enabled: true, status: "not-run" },
    logs: { enabled: false, status: "disabled" },
    output: { enabled: true, status: "succeeded" },
    progress: { enabled: false, status: "disabled" }
  });
  const machine = readMachinePublication(root);
  assert.equal(
    machine.run.catalogFingerprint,
    createCatalogFingerprint(result.snapshot.checks).catalogFingerprint
  );
  assert.deepEqual(machine.run.checks, result.snapshot.checks);
  assert.equal(machine.run.decision.policyId, result.decision.policyId);
  assert.equal(machine.run.decision.gate.status, result.decision.gate.status);
  assert.doesNotMatch(JSON.stringify(result), /createTaskPlan|"execute"/);
}

function readMachinePublication(root: string) {
  const directory = join(root, "published");
  const validated = validateMachinePublicationSetV3({
    recordsNdjson: readFileSync(join(directory, "records.ndjson")),
    runJson: readFileSync(join(directory, "run.json"))
  });
  if (!validated.ok) {
    throw new TypeError(`Published machine artifacts are invalid: ${validated.diagnostic.message}`);
  }
  return validated.value;
}
