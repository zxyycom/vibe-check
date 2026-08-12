import { strict as assert } from "node:assert";

import {
  projectMachinePublicationV2,
  serializeMachinePublicationV2,
  validateMachinePublicationSetV2
} from "./index.ts";

export const encoder = new TextEncoder();

export function validateCandidates(machine: ReturnType<typeof projectMachinePublicationV2>) {
  const candidates = serializeMachinePublicationV2(machine);
  return validateMachinePublicationSetV2({
    runJson: encoder.encode(candidates.runJson),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  });
}

export function assertSetFailure(
  machine: ReturnType<typeof projectMachinePublicationV2>,
  run: ReturnType<typeof structuredClone<typeof machine.run>>,
  relationship: string
): void {
  const candidates = serializeMachinePublicationV2(machine);
  const result = validateMachinePublicationSetV2({
    runJson: encoder.encode(JSON.stringify(run)),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error(`Expected ${relationship} failure`);
  assert.equal(result.diagnostic.category, "set-invariant");
  assert.equal(result.diagnostic.relationship, relationship);
  assert.equal(Object.hasOwn(result, "value"), false);
}
