import { strict as assert } from "node:assert";
import { isAbsolute } from "node:path";

import { validateMachinePublicationSetV3 } from "../run/machine-output.ts";

export type MachinePublicationV3 = Extract<
  ReturnType<typeof validateMachinePublicationSetV3>,
  { ok: true }
>["value"];

export function assertCurrentPublicationBaseline(machine: MachinePublicationV3): void {
  const { run, records } = machine;
  assert.equal(run.schemaVersion, "vibe-check.run.v3");
  assert.equal(run.invocation.projectRoot, ".");
  assert.match(run.invocation.timestamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.match(run.invocation.invocationId, /^invocation\/v1:/);
  assert.deepEqual(
    run.checks.map(({ checkId }) => checkId),
    ["duplicate-detection", "file-metrics", "function-metrics"]
  );
  assert.deepEqual(run.references, {
    identities: [],
    evidence: [],
    relations: []
  });
  assert.deepEqual(run.decision.gate, { policyId: null, status: "disabled" });
  assert.equal(run.decision.policyId, null);
  for (const record of records) {
    assert.equal(record.schemaVersion, "vibe-check.record.v3");
    if (record.location !== null) assertProjectRelativePath(record.location.path);
  }
}

function assertProjectRelativePath(path: string): void {
  assert.equal(isAbsolute(path), false);
  assert.doesNotMatch(path, /(?:^|\/)\.\.(?:\/|$)/);
  assert.doesNotMatch(path, /\\/);
}
