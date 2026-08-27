import assert from "node:assert/strict";
import type { SpawnSyncReturns } from "node:child_process";

/** Maps one external-consumer child command result to its stable acceptance failure. */
export function assertExternalConsumerCommandSucceeded(
  result: SpawnSyncReturns<string>,
  description: string
): void {
  assert.equal(result.error, undefined, `${description} could not start: ${result.error?.message}`);
  assert.equal(result.signal, null, `${description} was terminated by ${result.signal}`);
  assert.equal(
    result.status,
    0,
    `${description} failed with exit ${String(result.status)}:\n${result.stderr || result.stdout}`
  );
}
