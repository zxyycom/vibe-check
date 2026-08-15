import { createHash } from "node:crypto";

import { canonicalJsonBytes } from "../../check-record/identity.ts";
import type { MachineRecordV3 } from "./schema.ts";

export const MACHINE_RECORDS_V3_FINGERPRINT_PREFIX =
  "check-record/v1/records/sha256:";

/** Binds the canonical ordered machine Record rows, including the empty row set. */
export function createRecordsFingerprintV3(records: readonly MachineRecordV3[]): string {
  const bytes = canonicalJsonBytes(records);
  return `${MACHINE_RECORDS_V3_FINGERPRINT_PREFIX}${createHash("sha256").update(bytes).digest("hex")}`;
}
