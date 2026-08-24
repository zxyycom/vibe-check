import { createHash } from "node:crypto";

import { canonicalJsonBytes } from "../../foundation/canonical-data.ts";
import type { MachineRecordV4 } from "./schema.ts";

export const MACHINE_RECORDS_V4_FINGERPRINT_PREFIX = "check-record/v2/records/sha256:";

/** Binds the complete, canonically ordered v4 Record row set, including empty. */
export function createRecordsFingerprintV4(records: readonly MachineRecordV4[]): string {
  const bytes = canonicalJsonBytes(records);
  return `${MACHINE_RECORDS_V4_FINGERPRINT_PREFIX}${createHash("sha256").update(bytes).digest("hex")}`;
}
