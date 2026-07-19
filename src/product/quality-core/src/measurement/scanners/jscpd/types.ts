import type { DuplicateCodeFragment } from "../../../model/schema.ts";

export type JscpdScanFailureReason =
  | "jscpd-execution-error"
  | "jscpd-report-failure"
  | "jscpd-parse-failure";

export type JscpdScanResult =
  | { fragments: DuplicateCodeFragment[]; ok: true }
  | { error: string; ok: false; reason: JscpdScanFailureReason };
