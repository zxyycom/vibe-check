import assert from "node:assert/strict";

import { isRecord } from "./values.ts";

/** Verifies command Check behavior through the installed package root only. */
export function assertCommandCheckRuntimeEvidence(value: unknown): void {
  if (!isRecord(value)) throw new TypeError("installed command Check evidence must be an object");
  assert.deepEqual(value.main, {
    composed: { exitCode: 0, status: "passed" },
    defaultCanary: { reason: "command-start-failed", status: "unavailable" },
    discardedChildOutput: { exitCode: 3, status: "failed" },
    failed: { exitCode: 7, status: "failed" },
    nestedChild: { status: "passed" },
    outputLimited: { reason: "command-output-limit-exceeded", status: "unavailable" },
    passed: { exitCode: 0, status: "passed" },
    prerequisite: { status: "passed" },
    transcript: { exitCode: 0, status: "passed" }
  });
  assert.deepEqual(value.cancellation, {
    kind: "cancelled",
    outcome: { reason: "execution-cancelled", status: "unavailable" },
    phase: "execution"
  });
  assert.deepEqual(value.transcript, {
    excludesDefinitionMaterial: true,
    exists: true,
    includesRawStderr: true,
    includesRawStdout: true
  });
  assert.deepEqual(value.publicSurface, {
    defaultCanariesAbsent: true,
    machineCanariesAbsent: true
  });
}
