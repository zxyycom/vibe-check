import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createCoreCheckSession } from "../../check-settlement/session.ts";
import type { CoreSnapshot } from "../../check-settlement/facts.ts";
import type { MachinePublicationV4 } from "./projection.ts";
import { validateMachinePublicationSetV4 } from "./validation.ts";

const registrations = [
  { definition: { checkId: "a-failed", displayName: "Failed" } },
  { definition: { checkId: "b-not-applicable", displayName: "Not applicable" } },
  { definition: { checkId: "c-passed", displayName: "Passed" } },
  { definition: { checkId: "d-unavailable", displayName: "Unavailable" } }
] as const;

export function publicationSnapshot(): CoreSnapshot {
  const session = createCoreCheckSession(registrations);
  const failed = session.openCheckScope("a-failed");
  failed.records.report({ id: "sample:one" }, { details: { count: 1 } });
  failed.settle({ status: "failed", data: { summary: "found one" } });
  session.openCheckScope("b-not-applicable").settle({ status: "not-applicable" });
  session.openCheckScope("c-passed").settle({ status: "passed", data: { summary: "clear" } });
  session.openCheckScope("d-unavailable").settleProduct({
    status: "unavailable",
    reason: { code: "dependency-unavailable", checkIds: ["c-passed"] }
  });
  return session.freeze();
}

export const PUBLICATION_INVOCATION = {
  invocationId: "invocation/v1:publication-v4",
  projectRoot: "." as const,
  timestamp: "2026-08-12T00:00:00.000Z"
};

/** Reads and validates one test-owned machine publication directory. */
export function readValidatedMachinePublication(root: string): Readonly<{
  readonly recordsNdjson: string;
  readonly runJson: string;
  readonly value: MachinePublicationV4;
}> {
  const runJson = readFileSync(join(root, "machine", "run.json"), "utf8");
  const recordsNdjson = readFileSync(join(root, "machine", "records.ndjson"), "utf8");
  const publication = validateMachinePublicationSetV4({
    recordsNdjson: Buffer.from(recordsNdjson),
    runJson: Buffer.from(runJson)
  });
  if (!publication.ok) assert.fail(publication.diagnostic.message);
  return Object.freeze({ recordsNdjson, runJson, value: publication.value });
}
