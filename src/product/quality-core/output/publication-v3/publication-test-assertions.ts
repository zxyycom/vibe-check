import { strict as assert } from "node:assert";

import {
  projectMachinePublicationV3,
  serializeMachinePublicationV3,
  validateMachinePublicationSetV3
} from "./index.ts";

export const encoder = new TextEncoder();

export function validateCandidates(machine: ReturnType<typeof projectMachinePublicationV3>) {
  const candidates = serializeMachinePublicationV3(machine);
  return validateMachinePublicationSetV3({
    runJson: encoder.encode(candidates.runJson),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  });
}

export function assertSetFailure(
  machine: ReturnType<typeof projectMachinePublicationV3>,
  run: ReturnType<typeof structuredClone<typeof machine.run>>,
  relationship: string
): void {
  const candidates = serializeMachinePublicationV3(machine);
  const result = validateMachinePublicationSetV3({
    runJson: encoder.encode(JSON.stringify(run)),
    recordsNdjson: encoder.encode(candidates.recordsNdjson)
  });
  assert.equal(result.ok, false);
  if (result.ok) throw new Error(`Expected ${relationship} failure`);
  assert.equal(result.diagnostic.category, "set-invariant");
  assert.equal(result.diagnostic.relationship, relationship);
  assert.equal(Object.hasOwn(result, "value"), false);
}
