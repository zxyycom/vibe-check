import assert from "node:assert/strict";

import { isRecord, requiredString } from "./values.ts";

/** Verifies that isolated Product evidence came from the supported Node host. */
export function assertNodeRuntime(value: unknown): void {
  if (!isRecord(value)) throw new TypeError("isolated runtime evidence must be an object");
  assert.equal(value.bunVersion, null);
  const nodeVersion = requiredString(value.nodeVersion, "isolated Node runtime version");
  const match = /^v(\d+)\.(\d+)\.(\d+)$/u.exec(nodeVersion);
  assert.notEqual(match, null, `unsupported Node version ${nodeVersion}`);
  if (match === null) return;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const meetsMinimumVersion = major > 24 || (major === 24 && minor >= 18);
  assert.equal(
    meetsMinimumVersion,
    true,
    `unsupported Node version ${nodeVersion}; expected >=24.18`
  );
}
